const { dbAsync } = require('../database/db');

/**
 * Devuelve el array de cuentas normalizado a partir de un payload de estado financiero.
 * Soportado:
 *  - Array directo de cuentas.
 *  - { cuentas: [...] } (formato estándar actual).
 *  - { activos, pasivos, patrimonio, ... } (formato legacy de estructuración).
 */
function readAccounts(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.cuentas)) return payload.cuentas;
  const sections = ['activos', 'pasivos', 'patrimonio'];
  const hasLegacyShape = sections.some(key => Array.isArray(payload?.[key]));
  if (hasLegacyShape) {
    return sections.flatMap(key => (payload[key] || []).map(row => ({
      originalName: String(row.concepto || row.name || ''),
      originalBalance: Number(row.monto ?? row.saldo ?? row.balance ?? 0),
      niifCode: row.niifCode || '',
      niifName: row.niifName || ''
    })));
  }
  return [];
}

/** Parsea el raw_data_json a { metadata, cuentas } de forma tolerante. */
function parseFinancialPayload(raw) {
  let data = raw;
  if (typeof raw === 'string') {
    try { data = JSON.parse(raw); } catch (e) { return { metadata: {}, cuentas: [] }; }
  }
  return {
    metadata: data?.metadata || {},
    cuentas: readAccounts(data)
  };
}

/**
 * Consolida el catálogo de cuentas y sus saldos en client_accounts / account_balances.
 * Reutilizado por todos los caminos de guardado para que account_balances sea la fuente única.
 */
async function persistAccountsBalances(clientId, periodYear, periodMonth, statementType, mappedData, statementId) {
  for (const account of mappedData || []) {
    const originalName = String(account.originalName || '').trim();
    if (!originalName) continue;
    await dbAsync.run(
      `INSERT INTO client_accounts (client_id, original_name, niif_code, niif_name, confidence, last_seen_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(client_id, original_name) DO UPDATE SET
         niif_code = excluded.niif_code,
         niif_name = excluded.niif_name,
         confidence = excluded.confidence,
         last_seen_at = CURRENT_TIMESTAMP`,
      [clientId, originalName, account.niifCode || null, account.niifName || null, account.niifCode === 'Unmapped' ? 'low' : 'high']
    );
    const savedAccount = await dbAsync.get(
      'SELECT id FROM client_accounts WHERE client_id = ? AND original_name = ?',
      [clientId, originalName]
    );
    await dbAsync.run(
      `INSERT INTO account_balances
        (account_id, financial_statement_id, period_year, period_month, statement_type, balance)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(account_id, period_year, period_month, statement_type) DO UPDATE SET
         financial_statement_id = excluded.financial_statement_id,
         balance = excluded.balance,
         created_at = CURRENT_TIMESTAMP`,
      [savedAccount.id, statementId, periodYear, periodMonth, statementType, Number(account.originalBalance) || 0]
    );
  }
}

/** Consolida los saldos de un estado financiero ya guardado en account_balances. */
async function rebuildBalancesFromStatement(clientId, periodYear, periodMonth, statementType, statementId) {
  const statement = await dbAsync.get('SELECT raw_data_json FROM financial_statements WHERE id = ?', [statementId]);
  if (!statement) return;
  const { cuentas } = parseFinancialPayload(statement.raw_data_json);
  await persistAccountsBalances(clientId, periodYear, periodMonth, statementType, cuentas, statementId);
}

module.exports = { readAccounts, parseFinancialPayload, persistAccountsBalances, rebuildBalancesFromStatement };
