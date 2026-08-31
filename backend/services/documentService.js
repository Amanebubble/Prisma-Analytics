const { dbAsync } = require('../database/db');

const TYPE_LABELS = {
  financial: {
    balance: 'Balance General',
    trial_balance: 'Balance de Comprobación',
    results: 'Estado de Resultados',
    equity_changes: 'Cambios en el Patrimonio',
    cash_flow: 'Flujo de Efectivo'
  },
  iva: {
    iva_return: 'Declaración IVA F-07',
    sales_taxpayer: 'Ventas a Contribuyentes',
    sales_consumer: 'Ventas a Consumidor Final',
    purchases: 'Detalle de Compras',
    payment_on_account: 'Pago a Cuenta / PAC',
    income_tax: 'Declaración de Renta'
  },
  bank: { statement: 'Estado de Cuenta Bancario' }
};

function periodLabel(year, month) {
  if (!year) return 'Sin período';
  const monthName = month ? new Date(year, month - 1, 1).toLocaleDateString('es-ES', { month: 'long' }) : 'Anual';
  return `${month ? monthName[0].toUpperCase() + monthName.slice(1) : 'Año'} ${year}`;
}

async function getPeriodStatus(clientId, periodYear, periodMonth) {
  const [settings, findingsCount, reviewsCount] = await Promise.all([
    dbAsync.get('SELECT status FROM audit_settings WHERE client_id = ? AND period_year = ? AND period_month = ?', [clientId, periodYear, periodMonth]),
    dbAsync.get('SELECT COUNT(*) AS c FROM audit_findings WHERE client_id = ? AND period_year = ? AND period_month = ?', [clientId, periodYear, periodMonth]),
    dbAsync.get('SELECT COUNT(*) AS c FROM audit_account_reviews WHERE client_id = ? AND period_year = ? AND period_month = ?', [clientId, periodYear, periodMonth])
  ]);
  if (settings?.status === 'completed') return { key: 'auditado', label: 'Auditado' };
  if ((findingsCount?.c || 0) > 0 || (reviewsCount?.c || 0) > 0 || settings?.status === 'in_progress') return { key: 'en_proceso', label: 'En proceso' };
  return { key: 'sin_auditar', label: 'Sin Auditar' };
}

async function getDocumentRegistry(clientId, query = '', sort = 'recent') {
  const [financials, ivas, banks] = await Promise.all([
    dbAsync.all('SELECT id, type, period_year, period_month, created_at FROM financial_statements WHERE client_id = ?', [clientId]),
    dbAsync.all('SELECT id, document_type, period_year, period_month, source_filename, created_at FROM iva_documents WHERE client_id = ?', [clientId]),
    dbAsync.all('SELECT id, period_year, period_month, source_filename, bank_name FROM bank_documents WHERE client_id = ?', [clientId])
  ]);

  const docs = [];
  for (const row of financials) {
    const periodStatus = await getPeriodStatus(clientId, row.period_year, row.period_month);
    docs.push({
      id: `fin-${row.id}`,
      kind: 'financial',
      subKind: row.type,
      title: TYPE_LABELS.financial[row.type] || 'Estado Financiero',
      periodYear: row.period_year,
      periodMonth: row.period_month,
      periodLabel: periodLabel(row.period_year, row.period_month),
      filename: '',
      createdAt: row.created_at,
      status: periodStatus
    });
  }
  for (const row of ivas) {
    const periodStatus = await getPeriodStatus(clientId, row.period_year, row.period_month);
    docs.push({
      id: `iva-${row.id}`,
      kind: 'iva',
      subKind: row.document_type,
      title: TYPE_LABELS.iva[row.document_type] || 'Documento IVA',
      periodYear: row.period_year,
      periodMonth: row.period_month,
      periodLabel: periodLabel(row.period_year, row.period_month),
      filename: row.source_filename,
      createdAt: row.created_at,
      status: periodStatus
    });
  }
  for (const row of banks) {
    const periodStatus = await getPeriodStatus(clientId, row.period_year, row.period_month);
    docs.push({
      id: `bank-${row.id}`,
      kind: 'bank',
      subKind: 'statement',
      title: 'Estado de Cuenta Bancario',
      periodYear: row.period_year,
      periodMonth: row.period_month,
      periodLabel: periodLabel(row.period_year, row.period_month),
      filename: row.source_filename,
      bankName: row.bank_name || '',
      createdAt: row.created_at,
      status: periodStatus
    });
  }

  const normalized = query.trim().toLowerCase();
  const filtered = docs.filter(doc => {
    if (!normalized) return true;
    const haystack = [doc.title, doc.periodLabel, doc.filename, doc.bankName, String(doc.periodYear)].join(' ').toLowerCase();
    return haystack.includes(normalized);
  });

  filtered.sort((left, right) => {
    const leftTs = new Date(left.createdAt).getTime() || 0;
    const rightTs = new Date(right.createdAt).getTime() || 0;
    return sort === 'older' ? leftTs - rightTs : rightTs - leftTs;
  });

  return { success: true, documents: filtered };
}

async function clientHasData(clientId) {
  const [financial, iva, bank] = await Promise.all([
    dbAsync.get('SELECT COUNT(*) AS c FROM financial_statements WHERE client_id = ?', [clientId]),
    dbAsync.get('SELECT COUNT(*) AS c FROM iva_documents WHERE client_id = ?', [clientId]),
    dbAsync.get('SELECT COUNT(*) AS c FROM bank_documents WHERE client_id = ?', [clientId])
  ]);
  return { success: true, hasData: (financial?.c || 0) > 0 || (iva?.c || 0) > 0 || (bank?.c || 0) > 0 };
}

module.exports = { getDocumentRegistry, clientHasData };
