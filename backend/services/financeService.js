const { dbAsync } = require('../database/db');

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
  return JSON.parse(record.raw_data_json);
}

module.exports = {
  calculateHorizontalAnalysis,
  calculateVerticalAnalysis,
  getClientFinancials
};
