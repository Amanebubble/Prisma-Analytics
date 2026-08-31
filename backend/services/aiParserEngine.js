require('dotenv').config();
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { GoogleGenAI } = require('@google/genai');

let LLAMA_KEY = process.env.LLAMA_CLOUD_API_KEY;
let GEMINI_KEY = process.env.GEMINI_API_KEY;

// Inicializar el cliente usando la clave AQ...
let ai = GEMINI_KEY ? new GoogleGenAI({ apiKey: GEMINI_KEY }) : null;

function setApiKeys({ llamaParseKey, geminiKey } = {}) {
  if (llamaParseKey !== undefined) LLAMA_KEY = llamaParseKey || '';
  if (geminiKey !== undefined) GEMINI_KEY = geminiKey || '';
  ai = GEMINI_KEY ? new GoogleGenAI({ apiKey: GEMINI_KEY }) : null;
}

/**
 * Fase 1: Extracción Bruta usando LlamaParse API
 */
async function extractWithLlamaParse(filePath) {
  try {
    if (!LLAMA_KEY) throw new Error('No hay API Key de LlamaParse configurada.');
    console.log('[Prisma Analytics] Iniciando LlamaParse API...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    
    // Subir el archivo
    const uploadRes = await axios.post('https://api.cloud.llamaindex.ai/api/parsing/upload', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${LLAMA_KEY}`,
        'Accept': 'application/json'
      }
    });

    const jobId = uploadRes.data.id;
    console.log(`[Prisma Analytics] Job de LlamaParse creado: ${jobId}. Esperando procesamiento...`);

    // Polling
    let status = 'PENDING';
    while (status === 'PENDING') {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const statusRes = await axios.get(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}`, {
        headers: { 'Authorization': `Bearer ${LLAMA_KEY}`, 'Accept': 'application/json' }
      });
      status = statusRes.data.status;
      if (status === 'ERROR') throw new Error('LlamaParse falló al procesar el archivo.');
    }

    // Obtener resultado en Markdown
    const resultRes = await axios.get(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/markdown`, {
      headers: { 'Authorization': `Bearer ${LLAMA_KEY}` }
    });

    return resultRes.data.markdown;
  } catch (error) {
    console.error('[Prisma Analytics] LlamaParse falló:', error.message);
    throw error;
  }
}

/**
 * Fallback (Nivel 2) si LlamaParse falla, usando Gemini 1.5 Flash
 */
async function extractWithGeminiFlash(filePath) {
  try {
    if (!ai) throw new Error('No hay API Key de Gemini configurada.');
    console.log('[Prisma Analytics] Activando Fallback con Gemini Flash...');
    
    const fileData = fs.readFileSync(filePath);
    const fileBase64 = fileData.toString('base64');
    
    const ext = filePath.split('.').pop().toLowerCase();
    const mimeType = ext === 'pdf' ? 'application/pdf' : 
                     (ext === 'xlsx' || ext === 'xls') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                     'text/plain';

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: fileBase64,
          }
        },
        'Eres un auditor NIIF. Extrae la información de este documento financiero. Preserva las tablas contables en formato Markdown. Asegúrate de incluir todos los montos de Activo, Pasivo, Patrimonio, Ventas o Gastos.'
      ]
    });
    
    return response.text;
  } catch (error) {
    console.error('[Prisma Analytics] Error en Fallback Gemini:', error);
    throw error;
  }
}

/**
 * Fase 2: Estructurar Markdown a JSON Validado usando Gemini
 */
async function structurizeWithGemini(markdownContent) {
  if (!ai) throw new Error('No hay API Key de Gemini configurada.');
  const prompt = `
  Basado en el siguiente texto de uno o varios Estados Financieros, extrae los datos y organízalos siguiendo este esquema JSON estricto.
  Si el documento es un balance de comprobación (trial balance), clasifícalo en activos, pasivos y patrimonio.
  Si detectas varios períodos o estados comparativos, devuelve cada corte separado dentro de "periodos". Nunca mezcles saldos de períodos distintos.
  
  Esquema esperado:
  {
    "empresa": "Nombre de la empresa",
    "periodo": "Año o periodo",
    "periodo_inicio": "YYYY-MM-DD o vacío",
    "periodo_fin": "YYYY-MM-DD o vacío",
    "tipo_documento": "balance|trial_balance|results|equity_changes|cash_flow",
    "moneda": "USD",
    "activos": [
      { "concepto": "Nombre de la cuenta", "monto": 0.00 }
    ],
    "total_activos": 0.00,
    "pasivos": [
      { "concepto": "Nombre cuenta", "monto": 0.00 }
    ],
    "total_pasivos": 0.00,
    "patrimonio": [
      { "concepto": "Nombre cuenta", "monto": 0.00 }
    ],
    "total_patrimonio": 0.00,
    "periodos": [
      {
        "periodo": "YYYY-MM",
        "periodo_inicio": "YYYY-MM-DD o vacío",
        "periodo_fin": "YYYY-MM-DD o vacío",
        "tipo_documento": "balance|trial_balance|results|equity_changes|cash_flow",
        "activos": [], "total_activos": 0,
        "pasivos": [], "total_pasivos": 0,
        "patrimonio": [], "total_patrimonio": 0
      }
    ]
  }

  Texto del documento:
  ${markdownContent}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-flash-latest',
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  });
  
  const jsonText = typeof response.text === 'function' ? response.text() : response.text;
  return JSON.parse(String(jsonText).replace(/^```json\s*/, '').replace(/```\s*$/, '').trim());
}

/**
 * Estructura declaraciones y libros IVA sin confundirlos con un estado financiero.
 * Los campos pueden quedar en cero cuando el documento no los contiene.
 */
async function structurizeIvaWithGemini(markdownContent, documentType) {
  if (!ai) throw new Error('No hay API Key de Gemini configurada.');
  const prompt = `
Eres un auditor fiscal salvadoreño. Extrae del documento IVA los totales visibles y devuelve SOLO JSON válido.
Tipo de documento: ${documentType}

  Usa exactamente este esquema:
{
  "empresa": "",
  "periodo": "YYYY-MM",
  "moneda": "USD",
  "tipo_documento": "${documentType}",
  "ventas": 0,
  "compras": 0,
  "debito_fiscal": 0,
  "credito_fiscal": 0,
  "impuesto_declarado": 0,
  "retenciones": 0,
  "documento_identificado": "",
  "observaciones": []
}

Reglas:
- Usa únicamente valores presentes en el documento; no inventes cifras.
- Convierte montos a números sin separadores de miles.
- Para libros de ventas, ventas es el total de ventas del período.
- Para libros de compras, compras es el total de compras del período.
- Si no puedes identificar un total, usa 0 y explica la limitación en observaciones.

Texto extraído:
${markdownContent}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-flash-latest',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });

  const jsonText = typeof response.text === 'function' ? response.text() : response.text;
  return JSON.parse(String(jsonText).replace(/^```json\s*/, '').replace(/```\s*$/, '').trim());
}

async function processIvaDocumentWithAI(filePath, documentType) {
  let markdown;
  try {
    markdown = await extractWithLlamaParse(filePath);
  } catch (error) {
    markdown = await extractWithGeminiFlash(filePath);
  }

  return structurizeIvaWithGemini(markdown, documentType);
}

async function structurizeBankWithGemini(markdownContent) {
  if (!ai) throw new Error('No hay API Key de Gemini configurada.');
  const prompt = `
Eres un auditor financiero. Extrae movimientos bancarios del siguiente documento y devuelve SOLO JSON válido.
Usa este esquema:
{
  "empresa": "",
  "periodo": "YYYY-MM",
  "moneda": "USD",
  "banco": "",
  "cuenta_bancaria": "",
  "movimientos": [
    { "fecha": "YYYY-MM-DD", "descripcion": "", "referencia": "", "debito": 0, "credito": 0, "saldo": 0 }
  ],
  "observaciones": []
}
Reglas:
- No inventes movimientos ni montos.
- Convierte separadores de miles a números.
- Si no existe una columna, usa una cadena vacía o cero.
- Conserva débitos y créditos separados.

Texto extraído:
${markdownContent}
  `;
  const response = await ai.models.generateContent({
    model: 'gemini-flash-latest',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });
  const jsonText = typeof response.text === 'function' ? response.text() : response.text;
  return JSON.parse(String(jsonText).replace(/^```json\s*/, '').replace(/```\s*$/, '').trim());
}

async function processBankDocumentWithAI(filePath) {
  let markdown;
  try {
    markdown = await extractWithLlamaParse(filePath);
  } catch (error) {
    markdown = await extractWithGeminiFlash(filePath);
  }
  return structurizeBankWithGemini(markdown);
}

/**
 * Validador Matemático: Ecuación Contable (Activo = Pasivo + Patrimonio)
 */
function validateAccountingEquation(balanceData) {
  // Asegurar que no hayan nulos
  const tActivos = balanceData.total_activos || 0;
  const tPasivos = balanceData.total_pasivos || 0;
  const tPatrimonio = balanceData.total_patrimonio || 0;

  // Forzar sumatoria manual por seguridad contra alucinaciones del LLM
  const sumActivos = (balanceData.activos || []).reduce((acc, val) => acc + (val.monto || 0), 0);
  const sumPasivos = (balanceData.pasivos || []).reduce((acc, val) => acc + (val.monto || 0), 0);
  const sumPatrimonio = (balanceData.patrimonio || []).reduce((acc, val) => acc + (val.monto || 0), 0);

  const finalActivos = Math.max(tActivos, sumActivos);
  const finalPasivosPatrimonio = (Math.max(tPasivos, sumPasivos)) + (Math.max(tPatrimonio, sumPatrimonio));

  const diferencia = Math.abs(finalActivos - finalPasivosPatrimonio);
  const cuadra = diferencia < 1.00; // Margen de error por redondeo (1 dólar)

  return {
    ...balanceData,
    total_activos: finalActivos,
    total_pasivos: Math.max(tPasivos, sumPasivos),
    total_patrimonio: Math.max(tPatrimonio, sumPatrimonio),
    cuadra,
    diferencia
  };
}

/**
 * Orquestador Principal
 */
async function processFinancialDocumentWithAI(filePath) {
  let markdown = '';
  try {
    markdown = await extractWithLlamaParse(filePath);
  } catch (err) {
    markdown = await extractWithGeminiFlash(filePath);
  }

  const rawJson = await structurizeWithGemini(markdown);
  const periods = Array.isArray(rawJson.periodos) && rawJson.periodos.length > 0 ? rawJson.periodos : [rawJson];
  const validatedJson = validateAccountingEquation({ ...rawJson, ...periods[0] });
  validatedJson.periodos = periods.map(period => validateAccountingEquation({ ...rawJson, ...period }));

  return validatedJson;
}

module.exports = {
  processFinancialDocumentWithAI,
  processIvaDocumentWithAI,
  processBankDocumentWithAI,
  setApiKeys
};
