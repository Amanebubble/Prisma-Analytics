const { dbAsync } = require('../database/db');

function accountDelta(account, debit, credit) {
  const code = String(account.niif_code || '');
  const debitNature = code.startsWith('1') || code.startsWith('5') || code.startsWith('6');
  const movement = Number(debit || 0) - Number(credit || 0);
  return debitNature ? movement : -movement;
}

async function getSettings(clientId, periodYear, periodMonth) {
  const settings = await dbAsync.get(
    `SELECT * FROM audit_settings WHERE client_id = ? AND period_year = ? AND period_month = ?`,
    [clientId, periodYear, periodMonth]
  );
  return settings || {
    client_id: clientId,
    period_year: periodYear,
    period_month: periodMonth,
    planning_materiality: 0,
    execution_materiality: 0,
    trivial_threshold: 0,
    status: 'in_review'
  };
}

async function saveSettings(clientId, periodYear, periodMonth, values) {
  await dbAsync.run(
    `INSERT INTO audit_settings
      (client_id, period_year, period_month, planning_materiality, execution_materiality, trivial_threshold, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(client_id, period_year, period_month) DO UPDATE SET
       planning_materiality = excluded.planning_materiality,
       execution_materiality = excluded.execution_materiality,
       trivial_threshold = excluded.trivial_threshold,
       status = excluded.status,
       updated_at = CURRENT_TIMESTAMP`,
    [clientId, periodYear, periodMonth, values.planningMateriality || 0, values.executionMateriality || 0, values.trivialThreshold || 0, values.status || 'in_review']
  );
  return getSettings(clientId, periodYear, periodMonth);
}

async function createAdjustment(clientId, periodYear, periodMonth, data) {
  if (!data.reference || !data.description || !Array.isArray(data.lines) || data.lines.length === 0) {
    throw new Error('El ajuste requiere referencia, descripción y al menos una línea.');
  }
  const debitTotal = data.lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
  const creditTotal = data.lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
  if (Math.abs(debitTotal - creditTotal) > 0.01) throw new Error('El asiento no está cuadrado: Debe y Haber deben coincidir.');

  const adjustment = await dbAsync.run(
    `INSERT INTO audit_adjustments (client_id, period_year, period_month, reference, kind, description, status)
     VALUES (?, ?, ?, ?, ?, ?, 'proposed')`,
    [clientId, periodYear, periodMonth, data.reference, data.kind || 'adjustment', data.description]
  );
  for (const line of data.lines) {
    await dbAsync.run(
      `INSERT INTO audit_adjustment_lines (adjustment_id, account_id, debit, credit) VALUES (?, ?, ?, ?)`,
      [adjustment.lastID, line.accountId, Number(line.debit || 0), Number(line.credit || 0)]
    );
  }
  return { success: true, id: adjustment.lastID };
}

async function getWorkingPaper(clientId, periodYear, periodMonth) {
  const accounts = await dbAsync.all(
    `SELECT a.id, a.original_name, a.niif_code, a.niif_name, COALESCE(b.balance, 0) AS client_balance,
            r.tick_marks_json, r.assertions_json, r.reviewer_note,
            n.id AS note_id, n.title AS note_title, n.content AS note_content
     FROM client_accounts a
     LEFT JOIN account_balances b ON b.account_id = a.id
       AND b.period_year = ? AND b.period_month = ?
     LEFT JOIN audit_account_reviews r ON r.account_id = a.id
       AND r.client_id = ? AND r.period_year = ? AND r.period_month = ?
     LEFT JOIN audit_notes n ON n.account_id = a.id
       AND n.client_id = ? AND n.period_year = ? AND n.period_month = ?
     WHERE a.client_id = ? ORDER BY a.niif_code, a.original_name`,
    [periodYear, periodMonth, clientId, periodYear, periodMonth, clientId, periodYear, periodMonth, clientId]
  );
  const adjustments = await dbAsync.all(
    `SELECT a.id, a.reference, a.kind, a.description, a.status,
            l.account_id, l.debit, l.credit
     FROM audit_adjustments a
     JOIN audit_adjustment_lines l ON l.adjustment_id = a.id
     WHERE a.client_id = ? AND a.period_year = ? AND a.period_month = ?
     ORDER BY a.created_at, a.id`,
    [clientId, periodYear, periodMonth]
  );
  const grouped = new Map();
  for (const adjustment of adjustments) {
    const current = grouped.get(adjustment.account_id) || { debit: 0, credit: 0, references: [] };
    current.debit += Number(adjustment.debit || 0);
    current.credit += Number(adjustment.credit || 0);
    current.references.push(adjustment.reference);
    grouped.set(adjustment.account_id, current);
  }
  const [financialCount, ivaCount, bankCount] = await Promise.all([
    dbAsync.get('SELECT COUNT(*) AS c FROM financial_statements WHERE client_id = ? AND period_year = ? AND (period_month = ? OR period_month IS NULL)', [clientId, periodYear, periodMonth]),
    dbAsync.get('SELECT COUNT(*) AS c FROM iva_documents WHERE client_id = ? AND period_year = ? AND period_month = ?', [clientId, periodYear, periodMonth]),
    dbAsync.get('SELECT COUNT(*) AS c FROM bank_documents WHERE client_id = ? AND period_year = ? AND period_month = ?', [clientId, periodYear, periodMonth])
  ]);
  const hasDocuments = (financialCount?.c || 0) > 0 || (ivaCount?.c || 0) > 0 || (bankCount?.c || 0) > 0;

  return {
    success: true,
    hasDocuments,
    documents: { financial: financialCount?.c || 0, iva: ivaCount?.c || 0, banks: bankCount?.c || 0 },
    accounts: accounts.map(account => {
      const movement = grouped.get(account.id) || { debit: 0, credit: 0, references: [] };
      return {
        ...account,
        adjustments_debit: movement.debit,
        adjustments_credit: movement.credit,
        audited_balance: Number(account.client_balance) + accountDelta(account, movement.debit, movement.credit),
        references: [...new Set(movement.references)],
        tickMarks: JSON.parse(account.tick_marks_json || '[]'),
        assertions: JSON.parse(account.assertions_json || '{}'),
        reviewerNote: account.reviewer_note || '',
        noteId: account.note_id,
        noteTitle: account.note_title || '',
        noteContent: account.note_content || ''
      };
    }),
    adjustments
  };
}

async function saveAccountReview(clientId, periodYear, periodMonth, accountId, data) {
  await dbAsync.run(
    `INSERT INTO audit_account_reviews
      (client_id, period_year, period_month, account_id, tick_marks_json, assertions_json, reviewer_note)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(client_id, period_year, period_month, account_id) DO UPDATE SET
       tick_marks_json = excluded.tick_marks_json,
       assertions_json = excluded.assertions_json,
       reviewer_note = excluded.reviewer_note,
       updated_at = CURRENT_TIMESTAMP`,
    [clientId, periodYear, periodMonth, accountId, JSON.stringify(data.tickMarks || []), JSON.stringify(data.assertions || {}), data.reviewerNote || '']
  );
  return { success: true };
}

async function saveNote(clientId, periodYear, periodMonth, accountId, title, content) {
  const existing = await dbAsync.get(
    'SELECT id, content FROM audit_notes WHERE client_id = ? AND period_year = ? AND period_month = ? AND account_id = ?',
    [clientId, periodYear, periodMonth, accountId]
  );
  let noteId;
  if (existing) {
    noteId = existing.id;
    if (existing.content !== content) await dbAsync.run('INSERT INTO audit_note_revisions (note_id, content) VALUES (?, ?)', [noteId, existing.content]);
    await dbAsync.run('UPDATE audit_notes SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [title, content, noteId]);
  } else {
    const result = await dbAsync.run(
      'INSERT INTO audit_notes (client_id, period_year, period_month, account_id, title, content) VALUES (?, ?, ?, ?, ?, ?)',
      [clientId, periodYear, periodMonth, accountId, title, content]
    );
    noteId = result.lastID;
  }
  return { success: true, id: noteId };
}

async function getNoteRevisions(noteId) {
  return dbAsync.all('SELECT * FROM audit_note_revisions WHERE note_id = ? ORDER BY created_at DESC', [noteId]);
}

module.exports = { getSettings, saveSettings, createAdjustment, getWorkingPaper, saveAccountReview, saveNote, getNoteRevisions };
