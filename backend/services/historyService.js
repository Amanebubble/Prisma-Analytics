const { dbAsync } = require('../database/db');

const TYPE_LABELS = {
  financial: { balance: 'Balance General', trial_balance: 'Balance de Comprobación', results: 'Estado de Resultados', equity_changes: 'Cambios en el Patrimonio', cash_flow: 'Flujo de Efectivo' },
  iva: { iva_return: 'Declaración IVA F-07', sales_taxpayer: 'Ventas a Contribuyentes', sales_consumer: 'Ventas a Consumidor Final', purchases: 'Detalle de Compras', payment_on_account: 'Pago a Cuenta / PAC', income_tax: 'Declaración de Renta' }
};

function join(clients, row) {
  return clients.find(c => c.id === row.client_id);
}

async function getHistory(clientId = null, query = '', sort = 'recent') {
  const clients = await dbAsync.all('SELECT id, name FROM clients');

  const events = [];

  const financials = await dbAsync.all(`
    SELECT f.client_id, f.type, f.period_year, f.period_month, f.created_at
    FROM financial_statements f WHERE (f.client_id = ? OR ? IS NULL)
  `, [clientId, clientId]);
  for (const row of financials) {
    const client = join(clients, row);
    events.push({ kind: 'financial', clientId: row.client_id, clientName: client?.name || '—', action: 'Estado financiero cargado', detail: `${TYPE_LABELS.financial[row.type] || row.type} · ${row.period_year}`, module: 'Carga de Datos', date: row.created_at, tone: 'info' });
  }

  const ivas = await dbAsync.all('SELECT client_id, document_type, source_filename, created_at FROM iva_documents WHERE (client_id = ? OR ? IS NULL)', [clientId, clientId]);
  for (const row of ivas) {
    const client = join(clients, row);
    events.push({ kind: 'iva', clientId: row.client_id, clientName: client?.name || '—', action: 'Documento IVA cargado', detail: `${TYPE_LABELS.iva[row.document_type] || row.document_type} · ${row.source_filename || ''}`, module: 'Carga de Datos', date: row.created_at, tone: 'info' });
  }

  const banks = await dbAsync.all('SELECT client_id, source_filename, bank_name, created_at FROM bank_documents WHERE (client_id = ? OR ? IS NULL)', [clientId, clientId]);
  for (const row of banks) {
    const client = join(clients, row);
    events.push({ kind: 'bank', clientId: row.client_id, clientName: client?.name || '—', action: 'Estado bancario cargado', detail: `${row.bank_name || 'Banco'} · ${row.source_filename || ''}`, module: 'Carga de Datos', date: row.created_at, tone: 'info' });
  }

  const findings = await dbAsync.all(`
    SELECT client_id, title, impact, status, updated_at FROM audit_findings WHERE (client_id = ? OR ? IS NULL)
  `, [clientId, clientId]);
  for (const row of findings) {
    const client = join(clients, row);
    const critical = row.impact === 'Crítico' || row.impact === 'Alto';
    events.push({ kind: 'finding', clientId: row.client_id, clientName: client?.name || '—', action: `Hallazgo ${critical ? 'crítico' : 'detectado'}`, detail: `${row.title} · Estado: ${row.status}`, module: 'Auditoría', date: row.updated_at, tone: critical ? 'danger' : 'warn' });
  }

  const adjustments = await dbAsync.all('SELECT client_id, reference, kind, description, created_at FROM audit_adjustments WHERE (client_id = ? OR ? IS NULL)', [clientId, clientId]);
  for (const row of adjustments) {
    const client = join(clients, row);
    events.push({ kind: 'adjustment', clientId: row.client_id, clientName: client?.name || '—', action: `Ajuste ${row.kind === 'reclassification' ? 'reclasificación' : 'contable'}`, detail: `${row.reference} · ${row.description}`, module: 'Auditoría', date: row.created_at, tone: 'info' });
  }

  const reviews = await dbAsync.all(`
    SELECT r.client_id, a.original_name, r.updated_at
    FROM audit_account_reviews r
    JOIN client_accounts a ON a.id = r.account_id
    WHERE (r.client_id = ? OR ? IS NULL)
  `, [clientId, clientId]);
  for (const row of reviews) {
    const client = join(clients, row);
    events.push({ kind: 'review', clientId: row.client_id, clientName: client?.name || '—', action: 'Revisión de cuenta', detail: row.original_name, module: 'Auditoría', date: row.updated_at, tone: 'success' });
  }

  const notes = await dbAsync.all(`
    SELECT n.client_id, n.title, n.updated_at FROM audit_notes n WHERE (n.client_id = ? OR ? IS NULL)
  `, [clientId, clientId]);
  for (const row of notes) {
    const client = join(clients, row);
    events.push({ kind: 'note', clientId: row.client_id, clientName: client?.name || '—', action: 'Nota a estados financieros', detail: row.title, module: 'Auditoría', date: row.updated_at, tone: 'success' });
  }

  const drafts = await dbAsync.all(`
    SELECT client_id, draft_content, last_modified FROM report_drafts WHERE (client_id = ? OR ? IS NULL)
  `, [clientId, clientId]);
  for (const row of drafts) {
    const client = join(clients, row);
    let opinion = '';
    try { const data = JSON.parse(row.draft_content); opinion = data?.opinion?.label || ''; } catch (e) {}
    events.push({ kind: 'draft', clientId: row.client_id, clientName: client?.name || '—', action: 'Dictamen guardado', detail: opinion || 'Borrador de dictamen', module: 'Dictamen', date: row.last_modified, tone: 'success' });
  }

  const engagements = await dbAsync.all('SELECT client_id, type, description, created_at FROM engagements WHERE (client_id = ? OR ? IS NULL)', [clientId, clientId]);
  for (const row of engagements) {
    const client = join(clients, row);
    events.push({ kind: 'engagement', clientId: row.client_id, clientName: client?.name || '—', action: 'Trabajo creado', detail: `${row.type} · ${row.description}`, module: 'Planificación', date: row.created_at, tone: 'info' });
  }

  const billing = await dbAsync.all('SELECT client_id, amount, status, created_at, received_at FROM billing WHERE (client_id = ? OR ? IS NULL)', [clientId, clientId]);
  for (const row of billing) {
    const client = join(clients, row);
    const paid = row.status === 'paid';
    events.push({ kind: 'billing', clientId: row.client_id, clientName: client?.name || '—', action: paid ? 'Honorario cobrado' : 'Honorario registrado', detail: `$${Number(row.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, module: 'Cobranza', date: row.received_at || row.created_at, tone: paid ? 'success' : 'warn' });
  }

  const normalized = query.trim().toLowerCase();
  const filtered = events.filter(ev => {
    if (normalized) {
      const haystack = [ev.action, ev.detail, ev.clientName, ev.module].join(' ').toLowerCase();
      if (!haystack.includes(normalized)) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    const at = new Date(a.date).getTime() || 0;
    const bt = new Date(b.date).getTime() || 0;
    return sort === 'older' ? at - bt : bt - at;
  });

  return { success: true, events: filtered };
}

module.exports = { getHistory };
