const fs = require('fs');
const path = require('path');
const { dbAsync } = require('../database/db');
const { processIvaDocumentWithAI } = require('./aiParserEngine');
const { parseFinancialPayload } = require('./financialPayload');

const ALLOWED_TYPES = new Set([
  'iva_return',
  'sales_taxpayer',
  'sales_consumer',
  'purchases',
  'payment_on_account',
  'income_tax'
]);

function numberOrZero(value) {
  const number = Number(String(value ?? 0).replace(/,/g, ''));
  return Number.isFinite(number) ? number : 0;
}

async function analyzeIvaDocument(filePath, documentType, fallbackYear, fallbackMonth) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error('No se encontró el archivo seleccionado.');
  }
  if (!ALLOWED_TYPES.has(documentType)) {
    throw new Error('Tipo de documento IVA no válido.');
  }

  const extracted = await processIvaDocumentWithAI(filePath, documentType);
  const normalized = {
    empresa: extracted.empresa || '',
    periodo: extracted.periodo || `${fallbackYear}-${String(fallbackMonth).padStart(2, '0')}`,
    moneda: extracted.moneda || 'USD',
    tipo_documento: extracted.tipo_documento || documentType,
    ventas: numberOrZero(extracted.ventas),
    compras: numberOrZero(extracted.compras),
    debito_fiscal: numberOrZero(extracted.debito_fiscal),
    credito_fiscal: numberOrZero(extracted.credito_fiscal),
    impuesto_declarado: numberOrZero(extracted.impuesto_declarado),
    retenciones: numberOrZero(extracted.retenciones),
    documento_identificado: extracted.documento_identificado || '',
    observaciones: Array.isArray(extracted.observaciones) ? extracted.observaciones : []
  };

  return { success: true, document: normalized, sourceFilename: path.basename(filePath), sourcePath: filePath };
}

async function saveIvaDocument(clientId, periodYear, periodMonth, documentType, analysis) {
  const normalized = analysis.document;

  const result = await dbAsync.run(
    `INSERT INTO iva_documents
      (client_id, period_year, period_month, document_type, source_filename, source_path,
       extracted_data_json, total_sales, total_purchases, iva_debit, iva_credit,
       declared_tax, extraction_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processed')`,
    [
       clientId,
      periodYear,
      periodMonth,
       documentType,
       analysis.sourceFilename,
       analysis.sourcePath,
      JSON.stringify(normalized),
      normalized.ventas,
      normalized.compras,
      normalized.debito_fiscal,
      normalized.credito_fiscal,
      normalized.impuesto_declarado
    ]
  );

  return { success: true, id: result.lastID, document: normalized, sourceFilename: analysis.sourceFilename };
}

async function processIvaDocument(filePath, clientId, periodYear, periodMonth, documentType) {
  const analysis = await analyzeIvaDocument(filePath, documentType, periodYear, periodMonth);
  return saveIvaDocument(clientId, periodYear, periodMonth, documentType, analysis);
}

async function getIvaDocuments(clientId, periodYear, periodMonth) {
  const rows = await dbAsync.all(
    `SELECT * FROM iva_documents
     WHERE client_id = ? AND period_year = ? AND period_month = ?
     ORDER BY created_at DESC`,
    [clientId, periodYear, periodMonth]
  );

  return {
    success: true,
    documents: rows.map(row => ({
      ...row,
      extracted_data: JSON.parse(row.extracted_data_json)
    }))
  };
}

function extractFinancialAccounts(rawData) {
  return parseFinancialPayload(rawData).cuentas;
}

async function getIvaReconciliation(clientId, periodYear, periodMonth) {
  const documents = await dbAsync.all(
    `SELECT document_type, source_filename, total_sales, total_purchases,
            iva_debit, iva_credit, declared_tax
     FROM iva_documents
     WHERE client_id = ? AND period_year = ? AND period_month = ?
     ORDER BY created_at DESC`,
    [clientId, periodYear, periodMonth]
  );

  const financial = await dbAsync.get(
    `SELECT raw_data_json FROM financial_statements
     WHERE client_id = ? AND period_year = ?
       AND (period_month = ? OR period_month IS NULL)
     ORDER BY CASE WHEN period_month = ? THEN 0 ELSE 1 END, created_at DESC`,
    [clientId, periodYear, periodMonth, periodMonth]
  );

  let accountingSales = 0;
  let accountingExpenses = 0;
  const accountingAvailable = Boolean(financial?.raw_data_json);
  if (financial?.raw_data_json) {
    const accounts = extractFinancialAccounts(JSON.parse(financial.raw_data_json));
    for (const account of accounts) {
      const amount = numberOrZero(account.originalBalance ?? account.saldo ?? account.monto);
      const code = String(account.niifCode ?? account.niif_code ?? '');
      if (code.startsWith('4')) accountingSales += Math.abs(amount);
      if (code.startsWith('5') || code.startsWith('6')) accountingExpenses += Math.abs(amount);
    }
  }

  // Los libros de ventas/compras tienen prioridad sobre los totales declarativos.
  const salesDocuments = documents.filter(doc => ['sales_taxpayer', 'sales_consumer'].includes(doc.document_type));
  const purchaseDocuments = documents.filter(doc => doc.document_type === 'purchases');
  const ivaReturn = documents.find(doc => doc.document_type === 'iva_return');
  const ivaSales = salesDocuments.length
    ? salesDocuments.reduce((sum, doc) => sum + numberOrZero(doc.total_sales), 0)
    : numberOrZero(ivaReturn?.total_sales);
  const ivaPurchases = purchaseDocuments.reduce((sum, doc) => sum + numberOrZero(doc.total_purchases), 0);

  const salesDifference = Math.abs(ivaSales - accountingSales);
  const purchasesDifference = ivaPurchases > 0 ? Math.abs(ivaPurchases - accountingExpenses) : null;
  const tolerance = 5;

  return {
    success: true,
    periodYear,
    periodMonth,
    documentsCount: documents.length,
    documents: documents.map(doc => ({ ...doc })),
    accounting: { sales: accountingSales, expenses: accountingExpenses },
    iva: {
      sales: ivaSales,
      purchases: ivaPurchases,
      debit: documents.reduce((sum, doc) => sum + numberOrZero(doc.iva_debit), 0),
      credit: documents.reduce((sum, doc) => sum + numberOrZero(doc.iva_credit), 0),
      declaredTax: documents.reduce((sum, doc) => sum + numberOrZero(doc.declared_tax), 0)
    },
    differences: {
      sales: salesDifference,
      purchases: purchasesDifference
    },
    status: !documents.length || !accountingAvailable
      ? 'SIN_DATOS'
      : salesDifference <= tolerance && (purchasesDifference === null || purchasesDifference <= tolerance)
      ? 'OK'
      : 'DIFERENCIA'
  };
}

module.exports = { processIvaDocument, analyzeIvaDocument, saveIvaDocument, getIvaDocuments, getIvaReconciliation };
