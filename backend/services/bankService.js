const fs = require('fs');
const path = require('path');
const { dbAsync } = require('../database/db');
const { processBankDocumentWithAI } = require('./aiParserEngine');

function numberOrZero(value) {
  const number = Number(String(value ?? 0).replace(/,/g, ''));
  return Number.isFinite(number) ? number : 0;
}

async function analyzeBankDocument(filePath) {
  if (!filePath || !fs.existsSync(filePath)) throw new Error('No se encontró el estado de cuenta.');
  const extracted = await processBankDocumentWithAI(filePath);
  const normalized = {
    empresa: extracted.empresa || '',
    periodo: extracted.periodo || '',
    moneda: extracted.moneda || 'USD',
    banco: extracted.banco || '',
    cuenta_bancaria: extracted.cuenta_bancaria || '',
    observaciones: Array.isArray(extracted.observaciones) ? extracted.observaciones : [],
    movimientos: (Array.isArray(extracted.movimientos) ? extracted.movimientos : []).map(movement => ({
      fecha: movement.fecha || '',
      descripcion: movement.descripcion || '',
      referencia: movement.referencia || '',
      debito: numberOrZero(movement.debito),
      credito: numberOrZero(movement.credito),
      saldo: numberOrZero(movement.saldo)
    }))
  };
  return { success: true, sourceFilename: path.basename(filePath), sourcePath: filePath, document: normalized };
}

async function saveBankDocument(clientId, periodYear, periodMonth, analysis) {
  const document = analysis.document;
  const result = await dbAsync.run(
    `INSERT INTO bank_documents
      (client_id, period_year, period_month, source_filename, source_path, bank_name,
       account_number, currency, extracted_data_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      clientId, periodYear, periodMonth, analysis.sourceFilename, analysis.sourcePath,
      document.banco, document.cuenta_bancaria, document.moneda, JSON.stringify(document)
    ]
  );
  for (const movement of document.movimientos) {
    await dbAsync.run(
      `INSERT INTO bank_transactions
        (bank_document_id, transaction_date, description, reference, debit, credit, balance)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [result.lastID, movement.fecha, movement.descripcion, movement.referencia, movement.debito, movement.credito, movement.saldo]
    );
  }
  return { success: true, id: result.lastID, movementsCount: document.movimientos.length };
}

async function getBankDocuments(clientId, periodYear, periodMonth) {
  const rows = await dbAsync.all(
    `SELECT d.*, COUNT(t.id) AS movements_count
     FROM bank_documents d
     LEFT JOIN bank_transactions t ON t.bank_document_id = d.id
     WHERE d.client_id = ? AND d.period_year = ? AND d.period_month = ?
     GROUP BY d.id ORDER BY d.created_at DESC`,
    [clientId, periodYear, periodMonth]
  );
  return { success: true, documents: rows };
}

module.exports = { analyzeBankDocument, saveBankDocument, getBankDocuments };
