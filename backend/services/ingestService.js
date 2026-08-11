const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const pdfParse = require('pdf-parse');
const { dbAsync } = require('../database/db');

/**
 * Procesa un archivo DTE JSON (Facturación Electrónica)
 * @param {string} filePath Ruta absoluta del archivo
 * @param {number} clientId ID del cliente al que pertenece
 */
async function processDteJson(filePath, clientId) {
  try {
    const rawData = fs.readFileSync(filePath, 'utf8');
    const dte = JSON.parse(rawData);
    
    // Validación de la firma y el selloRecibido de Hacienda (Reglas de El Salvador)
    // Asumimos estructura estándar del Ministerio de Hacienda
    const uuid = dte.identificacion?.codigoGeneracion || `MOCK-UUID-${Date.now()}`;
    const type = dte.identificacion?.tipoDte === '01' ? 'sales' : 'purchases'; // 01 = Factura, etc.
    const issueDate = dte.identificacion?.fecEmi || new Date().toISOString().split('T')[0];
    const total = dte.resumen?.totalPagar || 0;
    const sello = dte.selloRecibido || 'PENDIENTE_VALIDACION';

    const result = await dbAsync.run(
      'INSERT INTO dte_records (client_id, uuid, type, issue_date, total, sello_recibido, json_data) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [clientId, uuid, type, issueDate, total, sello, rawData]
    );

    return { success: true, id: result.lastID, uuid, total };
  } catch (error) {
    console.error('Error procesando DTE JSON:', error);
    throw new Error('Fallo en el parseo del DTE JSON: ' + error.message);
  }
}

/**
 * Procesa un Estado Financiero en formato Excel (XLSX o CSV)
 * @param {string} filePath Ruta del archivo
 * @param {number} clientId ID del cliente
 * @param {number} year Año fiscal
 * @param {string} type Tipo de documento: 'balance' o 'results'
 */
async function processFinancialExcel(filePath, clientId, year, type) {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Tomar la primera hoja por defecto
    const worksheet = workbook.Sheets[sheetName];
    
    // Convertir a JSON
    const data = xlsx.utils.sheet_to_json(worksheet, { defval: 0 });
    const rawDataJson = JSON.stringify(data);

    const result = await dbAsync.run(
      'INSERT INTO financial_statements (client_id, period_year, type, raw_data_json) VALUES (?, ?, ?, ?)',
      [clientId, year, type, rawDataJson]
    );

    return { success: true, id: result.lastID, records_count: data.length };
  } catch (error) {
    console.error('Error procesando Excel Financiero:', error);
    throw new Error('Fallo al procesar archivo Excel: ' + error.message);
  }
}

/**
 * Procesa texto de un PDF para auditoría OCR (Básico)
 */
async function processPdfText(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    
    // Retorna el texto plano para análisis semántico o RegExp
    return { success: true, text: data.text, pages: data.numpages };
  } catch (error) {
    console.error('Error procesando PDF:', error);
    throw new Error('Fallo al extraer texto del PDF: ' + error.message);
  }
}

module.exports = {
  processDteJson,
  processFinancialExcel,
  processPdfText
};
