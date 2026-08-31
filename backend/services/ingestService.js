const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const pdfParse = require('pdf-parse');
const { dbAsync } = require('../database/db');
const { persistAccountsBalances } = require('./financialPayload');

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
 * Función auxiliar para mapear una cuenta contable a código NIIF basado en palabras clave
 */
function mapAccountToNIIF(accountName, catalog) {
  const name = accountName.toLowerCase();
  
  // Reglas heurísticas simples para demostración
  if (name.includes('caja') || name.includes('banco') || name.includes('efectivo')) return '1.1.1'; // Efectivo
  if (name.includes('cliente') || name.includes('cuenta por cobrar') || name.includes('deudores')) return '1.1.2'; // CxC
  if (name.includes('inventario') || name.includes('almacén') || name.includes('mercancía')) return '1.1.3'; // Inventarios
  if (name.includes('propiedad') || name.includes('planta') || name.includes('equipo') || name.includes('vehículo') || name.includes('maquinaria')) return '1.2.1'; // PPE
  
  if (name.includes('proveedor') || name.includes('cuenta por pagar')) return '2.1.1'; // CxP Comerciales
  if (name.includes('préstamo') && name.includes('corto')) return '2.1.2'; // Préstamos CP
  if (name.includes('préstamo') || name.includes('bancario') || name.includes('obligación')) return '2.2.1'; // Préstamos LP
  
  if (name.includes('capital') || name.includes('acciones')) return '3.1'; // Capital
  if (name.includes('utilidad') || name.includes('reserva') || name.includes('ganancia')) return '3.2'; // Utilidades

  if (name.includes('venta') || name.includes('ingreso')) return '4.1'; // Ingresos Ordinarios
  
  if (name.includes('costo')) return '5.1'; // Costos
  if (name.includes('admin') || name.includes('oficina') || name.includes('sueldo')) return '5.2'; // Gastos Admin
  if (name.includes('ventas') || name.includes('marketing') || name.includes('publicidad')) return '5.3'; // Gastos Venta
  if (name.includes('interés') || name.includes('financiero') || name.includes('comisión')) return '5.4'; // Gastos Financieros

  return 'Unmapped';
}

const { processFinancialDocumentWithAI } = require('./aiParserEngine');

/**
 * Procesa un Estado Financiero en formato Excel o PDF usando el Motor IA
 * @param {string} filePath Ruta del archivo
 * @param {number} clientId ID del cliente
 * @param {number} year Año fiscal
 * @param {string} type Tipo de documento: 'balance' o 'results'
 */
async function analyzeFinancialDocument(filePath) {
  try {
    // La extracción PDF se prepara sin guardar ni emitir conclusiones de auditoría.
    const aiValidatedData = await processFinancialDocumentWithAI(filePath);
    
    // Obtener catálogo NIIF de la base de datos
    const catalog = await dbAsync.all('SELECT * FROM niif_catalog');
    
    // 2. Mapear cada período de forma independiente.
    const mapPeriod = period => {
      const allAccounts = [
        ...(period.activos || []),
        ...(period.pasivos || []),
        ...(period.patrimonio || [])
      ];
      return allAccounts.map(acc => {
        const accountName = String(acc.concepto || '');
        const balance = parseFloat(acc.monto) || 0;
        const niifCode = mapAccountToNIIF(accountName, catalog);
        const niifInfo = catalog.find(c => c.code === niifCode) || { name: 'Sin Mapear', type: 'unknown' };
        return { originalName: accountName, originalBalance: balance, niifCode, niifName: niifInfo.name, niifType: niifInfo.type, rawData: acc };
      });
    };
    const sourcePeriods = aiValidatedData.periodos || [aiValidatedData];
    const mappedPeriods = sourcePeriods.map(period => ({
      ...period,
      mapped_data: mapPeriod(period)
    }));
    const mappedData = mappedPeriods[0]?.mapped_data || [];

    return { 
      success: true, 
      records_count: mappedData.length, 
      mapped_data: mappedData,
      periods: mappedPeriods,
      empresa: aiValidatedData.empresa || '',
      periodo: aiValidatedData.periodo || '',
      periodo_inicio: aiValidatedData.periodo_inicio || '',
      periodo_fin: aiValidatedData.periodo_fin || '',
      moneda: aiValidatedData.moneda || 'USD',
      tipo_documento: aiValidatedData.tipo_documento || '',
      ai_status: 'PENDIENTE_REVISION',
      ai_diff: 0
    };
  } catch (error) {
    console.error('Error procesando Documento Financiero con IA:', error);
    throw new Error('Fallo al procesar archivo con IA: ' + error.message);
  }
}

async function processFinancialExcel(filePath, clientId, year, type) {
  const analysis = await analyzeFinancialDocument(filePath);
  const result = await dbAsync.run(
    'INSERT INTO financial_statements (client_id, period_year, type, raw_data_json) VALUES (?, ?, ?, ?)',
    [clientId, year, type, JSON.stringify({ metadata: analysis, cuentas: analysis.mapped_data })]
  );
  // Consolidar cuentas y saldos en account_balances para que sean la fuente única.
  await persistAccountsBalances(clientId, year, null, type, analysis.mapped_data, result.lastID);
  return { ...analysis, id: result.lastID };
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
  analyzeFinancialDocument,
  processPdfText
};
