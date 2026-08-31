const { dbAsync } = require('../database/db');
const { parseFinancialPayload, persistAccountsBalances } = require('./financialPayload');

/**
 * Realiza un Análisis Horizontal entre dos estados financieros (Módulo 2)
 * Calcula Variación Absoluta y Variación Relativa (%)
 * @param {Array} currentData Datos del año actual (JSON parseado de la base de datos)
 * @param {Array} previousData Datos del año anterior
 * @param {string} joinKey La llave de cuenta para cruzar (ej. 'codigo_cuenta' o 'nombre_cuenta')
 * @param {string} valueKey La llave donde está el saldo (ej. 'saldo')
 */
function calculateHorizontalAnalysis(currentData, previousData, joinKey = 'cuenta', valueKey = 'saldo') {
  const result = [];

  // Indexar el año anterior para búsqueda rápida O(1)
  const previousIndex = {};
  previousData.forEach(row => {
    const key = row[joinKey];
    if (key) {
      previousIndex[key] = parseFloat(row[valueKey]) || 0;
    }
  });

  // Calcular variaciones para cada cuenta del año actual
  currentData.forEach(row => {
    const key = row[joinKey];
    if (key) {
      const currentVal = parseFloat(row[valueKey]) || 0;
      const previousVal = previousIndex[key] || 0;
      
      const absVariation = currentVal - previousVal;
      let relVariation = 0;
      if (previousVal !== 0) {
        relVariation = (absVariation / previousVal) * 100;
      }

      result.push({
        cuenta: key,
        saldo_actual: currentVal,
        saldo_anterior: previousVal,
        variacion_absoluta: absVariation,
        variacion_relativa_porcentaje: Number(relVariation.toFixed(2))
      });
    }
  });

  return result;
}

/**
 * Realiza un Análisis Vertical (Módulo 2)
 * Determina el peso porcentual de cada cuenta respecto a una cuenta base (ej. Activo Total o Ventas Netas)
 * @param {Array} data Datos del estado financiero
 * @param {number} baseValue Valor total contra el cual comparar
 * @param {string} keyName Llave del nombre de la cuenta
 * @param {string} valueKey Llave del saldo
 */
function calculateVerticalAnalysis(data, baseValue, keyName = 'cuenta', valueKey = 'saldo') {
  if (!baseValue || baseValue === 0) throw new Error("El valor base para análisis vertical no puede ser cero");

  return data.map(row => {
    const val = parseFloat(row[valueKey]) || 0;
    const peso = (val / baseValue) * 100;
    return {
      cuenta: row[keyName],
      saldo: val,
      peso_porcentual: Number(peso.toFixed(2))
    };
  });
}

/**
 * Extrae los estados financieros de un cliente desde la BD y retorna su objeto JS
 */
async function getClientFinancials(clientId, year, type) {
  const record = await dbAsync.get(
    'SELECT raw_data_json FROM financial_statements WHERE client_id = ? AND period_year = ? AND type = ?',
    [clientId, year, type]
  );

  if (!record) return null;
  return parseFinancialPayload(record.raw_data_json);
}

async function saveFinancialData(clientId, periodYear, periodMonth, mappedData, statementType = 'balance', metadata = {}) {
  try {
    const rawDataJson = JSON.stringify({ metadata, cuentas: mappedData });
    
    // Check if it exists to update, else insert (using type 'balance' as default for now, could be passed)
    const checkSql = `SELECT id FROM financial_statements WHERE client_id = ? AND period_year = ? AND period_month = ? AND type = ?`;
    const existing = await dbAsync.get(checkSql, [clientId, periodYear, periodMonth, statementType]);

    let statementId;
    if (existing) {
      const updateSql = `UPDATE financial_statements SET raw_data_json = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?`;
      await dbAsync.run(updateSql, [rawDataJson, existing.id]);
      statementId = existing.id;
    } else {
      const insertSql = `INSERT INTO financial_statements (client_id, period_year, period_month, type, raw_data_json) VALUES (?, ?, ?, ?, ?)`;
      const inserted = await dbAsync.run(insertSql, [clientId, periodYear, periodMonth, statementType, rawDataJson]);
      statementId = inserted.lastID;
    }

    // Consolidar cuentas y saldos en client_accounts / account_balances (fuente única).
    await persistAccountsBalances(clientId, periodYear, periodMonth, statementType, mappedData, statementId);

    return { success: true };
  } catch (error) {
    console.error('Error saving financial data:', error);
    return { success: false, error: error.message };
  }
}

async function getClientAccounts(clientId, periodYear, periodMonth) {
  const accounts = await dbAsync.all(
    `SELECT a.id, a.original_name, a.niif_code, a.niif_name, a.confidence,
            b.balance, b.period_year, b.period_month, b.statement_type
     FROM client_accounts a
     LEFT JOIN account_balances b
       ON b.account_id = a.id AND b.period_year = ? AND b.period_month = ?
     WHERE a.client_id = ?
     ORDER BY a.original_name`,
    [periodYear, periodMonth, clientId]
  );
  return { success: true, accounts };
}

async function getNiifCatalog() {
  return dbAsync.all('SELECT code, name, type, level FROM niif_catalog ORDER BY code');
}

module.exports = {
  calculateHorizontalAnalysis,
  calculateVerticalAnalysis,
  getClientFinancials,
  saveFinancialData,
  getClientAccounts,
  getNiifCatalog
};
