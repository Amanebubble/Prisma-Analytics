require('dotenv').config();
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const { GoogleGenAI } = require('@google/genai');

const LLAMA_KEY = process.env.LLAMA_CLOUD_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

// Inicializar el cliente usando la clave AQ...
const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

/**
 * Fase 1: Extracción Bruta usando LlamaParse API
 */
async function extractWithLlamaParse(filePath) {
  try {
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
  const prompt = `
  Basado en el siguiente texto de un Estado Financiero, extrae los datos y organízalos siguiendo este esquema JSON estricto.
  Si el documento es un balance de comprobación (trial balance), clasifícalo en activos, pasivos y patrimonio.
  
  Esquema esperado:
  {
    "empresa": "Nombre de la empresa",
    "periodo": "Año o periodo",
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
    "total_patrimonio": 0.00
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
  
  const jsonText = response.text;
  return JSON.parse(jsonText);
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
  const validatedJson = validateAccountingEquation(rawJson);

  return validatedJson;
}

module.exports = {
  processFinancialDocumentWithAI
};
