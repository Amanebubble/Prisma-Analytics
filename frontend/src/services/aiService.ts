import { GoogleGenerativeAI } from '@google/generative-ai';

export interface MappedAccount {
  originalName: string;
  originalBalance: number;
  niifCode: string;
  niifName: string;
}

export interface AIResponse {
  success: boolean;
  mapped_data?: MappedAccount[];
  ai_status?: string;
  ai_diff?: number;
  error?: string;
}

export const processFinancialDataWithAI = async (csvData: string): Promise<AIResponse> => {
  const apiKey = localStorage.getItem('geminiKey');
  
  if (!apiKey) {
    return {
      success: false,
      error: "No se encontró la API Key de Gemini. Configúrala en el panel de administrador."
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
Eres un Auditor Financiero experto en NIIF (Normas Internacionales de Información Financiera).
Te entregaré un texto extraído de un archivo Excel que contiene un Balance General o Estado de Resultados con sus cuentas y saldos (en formato CSV).

Tu tarea es:
1. Extraer cada cuenta contable y su saldo. Si el saldo es negativo (ej. depreciaciones, gastos), consérvalo negativo.
2. Mapear cada cuenta extraída a una clasificación NIIF básica. Puedes usar los siguientes códigos/nombres como guía o generar el más adecuado:
   - "11" -> "Efectivo y Equivalentes de Efectivo"
   - "12" -> "Cuentas por Cobrar"
   - "13" -> "Inventarios"
   - "14" -> "Propiedad, Planta y Equipo"
   - "21" -> "Cuentas por Pagar"
   - "22" -> "Préstamos Bancarios a Corto Plazo"
   - "31" -> "Capital Social"
   - "41" -> "Ingresos Operativos"
   - "51" -> "Costos Operativos"
   - "61" -> "Gastos Operativos"
   Si no estás seguro, asigna "Unmapped" como código.

3. Verifica si se cumple la ecuación contable básica (Activo = Pasivo + Patrimonio).
   Si los datos entregados no son un balance completo, ignora esta verificación y marca el status como "OK" y diff como 0.
   Si sí es un balance completo y no cuadra, indica "DESCUADRE" y la diferencia.

DEBES DEVOLVER ESTRICTAMENTE UN OBJETO JSON VÁLIDO con la siguiente estructura (NO devuelvas formato markdown, solo el JSON raw):
{
  "mapped_data": [
    {
      "originalName": "string",
      "originalBalance": number,
      "niifCode": "string",
      "niifName": "string"
    }
  ],
  "ai_status": "OK" | "DESCUADRE",
  "ai_diff": number
}

Aquí están los datos:
${csvData}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Intentar extraer el JSON del texto de respuesta (a veces incluye formato markdown)
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.substring(7);
    }
    if (cleanText.startsWith('```')) {
        cleanText = cleanText.substring(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.substring(0, cleanText.length - 3);
    }

    const parsedData = JSON.parse(cleanText);

    return {
      success: true,
      mapped_data: parsedData.mapped_data,
      ai_status: parsedData.ai_status,
      ai_diff: parsedData.ai_diff
    };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return {
      success: false,
      error: error.message || "Error procesando el archivo con IA."
    };
  }
};
