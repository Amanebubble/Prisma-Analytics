import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai';

export interface MappedAccount {
  originalName: string;
  originalBalance: number;
  niifCode: string;
  niifName: string;
}

export interface AIResponse {
  success: boolean;
  mapped_data?: MappedAccount[];
  empresa?: string;
  periodo?: string;
  periodo_inicio?: string;
  periodo_fin?: string;
  naturaleza_periodo?: string;
  tipo_documento?: string;
  moneda?: string;
  error?: string;
}

export const processFinancialDataWithAI = async (csvData: string, statementType = 'balance'): Promise<AIResponse> => {
  const apiKey = localStorage.getItem('geminiKey');
  
  if (!apiKey) {
    return {
      success: false,
      error: "No se encontró la API Key de Gemini. Configúrala en el panel de administrador."
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    const prompt = `
Eres un Auditor Financiero experto en NIIF (Normas Internacionales de Información Financiera).
Tu tarea es analizar un documento financiero en formato CSV y mapear cada cuenta contable al catálogo estándar NIIF.
Tipo de documento sugerido por el auditor: ${statementType}. Detecta el tipo real si el contenido indica otro.

Reglas:
1. Analiza cuidadosamente la naturaleza de la cuenta basándote en su nombre.
2. Asigna el código NIIF que mejor corresponda:
   - 11 a 19: Activos
   - 21 a 29: Pasivos
   - 31 a 39: Patrimonio
   - 41 a 49: Ingresos
   - 51 a 69: Costos y Gastos
3. Si una cuenta es de orden o no es financiera, clasifícala como "Unmapped" o usa el código NIIF más cercano si aplica.
4. Identifica la empresa, período de cierre, tipo de documento y moneda visibles en el archivo.
5. Devuelve los datos de las cuentas sin realizar cálculos matemáticos ni sumatorias.

Formato de Respuesta:
Debes devolver estrictamente un objeto JSON con estas propiedades:
- empresa: nombre de la empresa detectada, o cadena vacía si no aparece.
- periodo: período detectado en formato YYYY-MM, o cadena vacía si no aparece.
- periodo_inicio: fecha inicial visible en formato YYYY-MM-DD, o cadena vacía.
- periodo_fin: fecha final visible en formato YYYY-MM-DD, o cadena vacía.
- naturaleza_periodo: point_in_time para balances o range para resultados/flujo.
- tipo_documento: uno de balance, trial_balance, results, equity_changes o cash_flow.
- moneda: código de moneda detectado, por ejemplo USD.
- mapped_data: array de objetos con las propiedades:
- originalName: El nombre de la cuenta en el archivo original.
- originalBalance: El saldo de la cuenta (número).
- niifCode: El código NIIF asignado (ej. "11").
- niifName: El nombre estándar NIIF de la cuenta (ej. "Efectivo y Equivalentes").

Datos CSV:
${csvData}
    `;

    const responseSchema: Schema = {
      type: SchemaType.OBJECT,
      properties: {
        empresa: { type: SchemaType.STRING },
        periodo: { type: SchemaType.STRING },
        periodo_inicio: { type: SchemaType.STRING },
        periodo_fin: { type: SchemaType.STRING },
        naturaleza_periodo: { type: SchemaType.STRING },
        tipo_documento: { type: SchemaType.STRING },
        moneda: { type: SchemaType.STRING },
        mapped_data: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              originalName: { type: SchemaType.STRING },
              originalBalance: { type: SchemaType.NUMBER },
              niifCode: { type: SchemaType.STRING },
              niifName: { type: SchemaType.STRING }
            },
            required: ["originalName", "originalBalance", "niifCode", "niifName"]
          }
        }
      },
      required: ["empresa", "periodo", "periodo_inicio", "periodo_fin", "naturaleza_periodo", "tipo_documento", "moneda", "mapped_data"]
    };

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const response = await result.response;
    const text = response.text();

    // Intentar extraer el JSON del texto de respuesta (a veces incluye formato markdown)
    let cleanText = text.trim();
    if (cleanText.startsWith('\`\`\`json')) {
      cleanText = cleanText.substring(7);
    }
    if (cleanText.startsWith('\`\`\`')) {
        cleanText = cleanText.substring(3);
    }
    if (cleanText.endsWith('\`\`\`')) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }

    const parsedData = JSON.parse(cleanText);

    return {
      success: true,
      mapped_data: parsedData.mapped_data,
      empresa: parsedData.empresa,
      periodo: parsedData.periodo,
      periodo_inicio: parsedData.periodo_inicio,
      periodo_fin: parsedData.periodo_fin,
      naturaleza_periodo: parsedData.naturaleza_periodo,
      tipo_documento: parsedData.tipo_documento,
      moneda: parsedData.moneda
    };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return {
      success: false,
      error: error.message || "Error procesando el archivo con IA."
    };
  }
};
