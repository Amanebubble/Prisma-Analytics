const path = require('path');
const fs = require('fs');
const aiParserEngine = require('./services/aiParserEngine');

// Función auxiliar temporal para exponer los métodos internos y probarlos
async function testBothMethods(filePath) {
  console.log(`[TEST] ==== INICIANDO PRUEBAS DE EXTRACCIÓN ====`);
  console.log(`[TEST] Archivo: ${path.basename(filePath)}`);
  
  // Extraemos funciones privadas re-importándolas aquí como mock o usando el orquestador
  const { processFinancialDocumentWithAI } = require('./services/aiParserEngine');
  
  // Vamos a modificar temporalmente el script para correr la cadena LlamaParse y la de Gemini.
  // Pero como las funciones no están exportadas, haremos un truco leyendo el archivo y evaluándolo,
  // o simplemente testeamos la principal. Para evitar romper encapsulamiento, vamos a forzar
  // que el orquestador falle llamaparse para probar el fallback.
  
  try {
    console.log(`\n[TEST 1] Cadena Normal (LlamaParse -> Gemini JSON)`);
    const start1 = Date.now();
    const resultLlama = await processFinancialDocumentWithAI(filePath);
    const end1 = Date.now();
    console.log(`[TEST 1] ÉXITO en ${(end1 - start1) / 1000}s`);
    console.log(`[TEST 1] Empresa: ${resultLlama.empresa}, Activos: $${resultLlama.total_activos}`);
    
  } catch(e) {
    console.error(`[TEST 1 ERROR]:`, e.message);
  }

  try {
    console.log(`\n[TEST 2] Forzando Cadena Fallback (Gemini Vision -> Gemini JSON)`);
    // Simulamos fallo de LlamaParse rompiendo la llave temporalmente en el process env
    const originalKey = process.env.LLAMA_CLOUD_API_KEY;
    process.env.LLAMA_CLOUD_API_KEY = 'llave_falsa_para_forzar_error';
    
    const start2 = Date.now();
    const resultGemini = await processFinancialDocumentWithAI(filePath);
    const end2 = Date.now();
    
    // Restaurar llave
    process.env.LLAMA_CLOUD_API_KEY = originalKey;
    
    console.log(`[TEST 2] ÉXITO en ${(end2 - start2) / 1000}s`);
    console.log(`[TEST 2] Empresa: ${resultGemini.empresa}, Activos: $${resultGemini.total_activos}`);
  } catch(e) {
    console.error(`[TEST 2 ERROR]:`, e.message);
  }
}

async function runTest() {
  const testFile = path.resolve(__dirname, '../materiales/dastos de prueba/2025-BG BENGALA.xlsx');
  await testBothMethods(testFile);
}

runTest();
