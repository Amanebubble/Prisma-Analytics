const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const SCHEMAS = {
  sales_taxpayer: {
    label: 'Ventas a contribuyentes', columns: 20, annex: '1',
    documentTypes: new Set(['03', '05', '06']),
    classes: new Set(['1', '2', '4']), numeric: [9, 10, 11, 12, 13, 14, 15]
  },
  sales_consumer: {
    label: 'Ventas a consumidor final', columns: 23, annex: '2',
    documentTypes: new Set(['01', '02', '10', '11']),
    classes: new Set(['1', '2', '4']), numeric: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
  },
  purchases: {
    label: 'Detalle de compras', columns: 21, annex: '3',
    documentTypes: new Set(['03', '05', '06', '11', '12', '13']),
    classes: new Set(['1', '2', '3', '4']), numeric: [6, 7, 8, 9, 10, 11, 12, 13, 14]
  }
};

function parseNumber(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const number = Number(text.replace(/,/g, ''));
  return Number.isFinite(number) ? number : null;
}

function parseDate(value) {
  const match = String(value ?? '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  return { day: Number(match[1]), month: Number(match[2]), year: Number(match[3]) };
}

function validateDate(value, year, month) {
  const date = parseDate(value);
  if (!date) return 'Fecha inválida: use DD/MM/AAAA.';
  const periodIndex = year * 12 + month;
  const dateIndex = date.year * 12 + date.month;
  if (dateIndex > periodIndex || dateIndex < periodIndex - 3) {
    return `Fecha fuera del período permitido (${String(month).padStart(2, '0')}/${year} y hasta tres períodos anteriores).`;
  }
  return null;
}

function validateIvaCsv(filePath, documentType, periodYear, periodMonth) {
  const schema = SCHEMAS[documentType];
  if (!schema) throw new Error('Este tipo de anexo CSV aún no tiene esquema oficial configurado.');
  if (!fs.existsSync(filePath)) throw new Error('No se encontró el archivo CSV.');

  const workbook = XLSX.readFile(filePath, { raw: false, cellText: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  const errors = [];
  const normalizedRows = [];

  rows.forEach((row, index) => {
    const line = index + 1;
    if (!row.some(value => String(value).trim() !== '')) return;
    if (row.length !== schema.columns) {
      errors.push({ line, message: `Se esperaban ${schema.columns} columnas y se recibieron ${row.length}.` });
      return;
    }
    if (index === 0 && /fecha|documento|nombre|ventas|compras/i.test(row.join(' '))) {
      errors.push({ line, message: 'El archivo no debe contener encabezados.' });
      return;
    }

    const dateError = validateDate(row[0], periodYear, periodMonth);
    if (dateError) errors.push({ line, message: dateError });
    const classValue = String(row[1]).trim();
    if (!schema.classes.has(classValue)) errors.push({ line, message: `Clase de documento no válida: ${classValue || '(vacía)'}.` });
    const typeValue = String(row[2]).trim().padStart(2, '0');
    if (!schema.documentTypes.has(typeValue)) errors.push({ line, message: `Tipo de documento no válido: ${typeValue || '(vacío)'}.` });
    const annexIndex = schema.columns - 1;
    if (String(row[annexIndex]).trim() !== schema.annex) errors.push({ line, message: `El número de anexo debe ser ${schema.annex}.` });

    for (const column of schema.numeric) {
      const number = parseNumber(row[column]);
      if (number === null) errors.push({ line, message: `La columna ${String.fromCharCode(65 + column)} debe contener un número.` });
      else if (number < 0) errors.push({ line, message: `La columna ${String.fromCharCode(65 + column)} no puede ser negativa.` });
    }

    if (documentType === 'sales_taxpayer') {
      const salesTotal = [9, 10, 11, 13].reduce((sum, column) => sum + (parseNumber(row[column]) || 0), 0);
      const reportedTotal = parseNumber(row[15]) || 0;
      if (Math.abs(salesTotal - reportedTotal) > 0.05) errors.push({ line, message: 'El total de ventas no coincide con sus componentes.' });
    }
    if (documentType === 'sales_consumer') {
      const salesTotal = [10, 11, 12, 13, 14, 15, 16, 17, 18].reduce((sum, column) => sum + (parseNumber(row[column]) || 0), 0);
      const reportedTotal = parseNumber(row[19]) || 0;
      if (Math.abs(salesTotal - reportedTotal) > 0.05) errors.push({ line, message: 'El total de ventas no coincide con sus componentes.' });
    }
    if (documentType === 'purchases') {
      const purchasesTotal = [6, 7, 8, 9, 10, 11, 12].reduce((sum, column) => sum + (parseNumber(row[column]) || 0), 0);
      const reportedTotal = parseNumber(row[14]) || 0;
      if (Math.abs(purchasesTotal - reportedTotal) > 0.05) errors.push({ line, message: 'El total de compras no coincide con sus componentes.' });
      const taxableBase = [9, 10, 11, 12].reduce((sum, column) => sum + (parseNumber(row[column]) || 0), 0);
      const credit = parseNumber(row[13]) || 0;
      if (Math.abs(taxableBase * 0.13 - credit) > 0.05) errors.push({ line, message: 'El crédito fiscal no corresponde al 13% de las compras gravadas.' });
    }
    normalizedRows.push(row.map(value => String(value ?? '').trim()));
  });

  return {
    success: errors.length === 0,
    sourceFilename: path.basename(filePath),
    documentType,
    periodYear,
    periodMonth,
    rows: normalizedRows,
    errors,
    summary: { records: normalizedRows.length }
  };
}

module.exports = { validateIvaCsv, SCHEMAS };
