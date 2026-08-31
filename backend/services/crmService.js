const { dbAsync } = require('../database/db');

async function getEngagements(clientId) {
  try {
    const sql = `SELECT * FROM engagements WHERE client_id = ? ORDER BY created_at DESC`;
    const engagements = await dbAsync.all(sql, [clientId]);
    
    // Fetch billing for each engagement
    for (let eng of engagements) {
      const billingSql = `SELECT * FROM billing WHERE engagement_id = ?`;
      eng.billing = await dbAsync.all(billingSql, [eng.id]);
    }
    
    return { success: true, engagements };
  } catch (error) {
    console.error('Error fetching engagements:', error);
    return { success: false, error: error.message };
  }
}

async function createEngagement(clientId, type, description, deadlineDate, amount = 0) {
  try {
    const sql = `INSERT INTO engagements (client_id, type, description, status, deadline_date) VALUES (?, ?, ?, 'pending', ?)`;
    const result = await dbAsync.run(sql, [clientId, type, description, deadlineDate]);
    // Si se indica monto a cobrar, crear automáticamente el honorario pendiente.
    if (amount > 0) {
      await dbAsync.run(
        'INSERT INTO billing (engagement_id, amount, due_date, status) VALUES (?, ?, ?, \'pending\')',
        [result.lastID, amount, deadlineDate]
      );
    }
    return { success: true, id: result.lastID };
  } catch (error) {
    console.error('Error creating engagement:', error);
    return { success: false, error: error.message };
  }
}

async function getAllEngagements() {
  try {
    const sql = `
      SELECT e.*, c.name as client_name
      FROM engagements e
      JOIN clients c ON e.client_id = c.id
      ORDER BY
        CASE e.status
          WHEN 'pending' THEN 1
          WHEN 'active' THEN 2
          WHEN 'completed' THEN 3
          ELSE 4
        END,
        COALESCE(e.deadline_date, '9999-12-31') ASC
    `;
    const engagements = await dbAsync.all(sql);
    for (const eng of engagements) {
      const billing = await dbAsync.all('SELECT * FROM billing WHERE engagement_id = ?', [eng.id]);
      eng.billing = billing;
      eng.total_billed = billing.reduce((sum, b) => sum + Number(b.amount || 0), 0);
      eng.days_to_deadline = eng.deadline_date
        ? Math.ceil((new Date(eng.deadline_date).getTime() - Date.now()) / 86400000)
        : null;
    }
    return { success: true, engagements };
  } catch (error) {
    console.error('Error fetching all engagements:', error);
    return { success: false, error: error.message };
  }
}

async function getIncomeByMonth(month, year) {
  try {
    const monthStr = String(month).padStart(2, '0');
    const sql = `
      SELECT c.id as client_id, c.name as client_name,
             COALESCE(SUM(b.amount), 0) as income
      FROM billing b
      JOIN engagements e ON b.engagement_id = e.id
      JOIN clients c ON e.client_id = c.id
      WHERE b.status = 'paid'
        AND (b.received_at LIKE ? OR (b.received_at IS NULL AND b.due_date LIKE ?))
      GROUP BY c.id, c.name
      ORDER BY income DESC
    `;
    const prefix = `${year}-${monthStr}-%`;
    const rows = await dbAsync.all(sql, [prefix, prefix]);
    return { success: true, month, year, income: rows };
  } catch (error) {
    console.error('Error fetching income by month:', error);
    return { success: false, error: error.message };
  }
}

async function getClientImportance() {
  try {
    const sql = `
      SELECT c.id as client_id, c.name as client_name, c.sector,
             COALESCE(SUM(b.amount), 0) as total_billed,
             COALESCE(SUM(CASE WHEN b.status = 'paid' THEN b.amount ELSE 0 END), 0) as total_collected,
             COUNT(DISTINCT e.id) as total_engagements
      FROM clients c
      LEFT JOIN engagements e ON e.client_id = c.id
      LEFT JOIN billing b ON b.engagement_id = e.id
      GROUP BY c.id, c.name, c.sector
      ORDER BY total_billed DESC
    `;
    const clients = await dbAsync.all(sql);
    const max = Math.max(1, ...clients.map(c => c.total_billed));
    return {
      success: true,
      clients: clients.map(c => ({ ...c, importance_pct: Math.round((c.total_billed / max) * 100) }))
    };
  } catch (error) {
    console.error('Error fetching client importance:', error);
    return { success: false, error: error.message };
  }
}

async function addBilling(engagementId, amount, dueDate) {
  try {
    const sql = `INSERT INTO billing (engagement_id, amount, due_date, status) VALUES (?, ?, ?, 'pending')`;
    const result = await dbAsync.run(sql, [engagementId, amount, dueDate]);
    return { success: true, id: result.lastID };
  } catch (error) {
    console.error('Error adding billing:', error);
    return { success: false, error: error.message };
  }
}

async function updateEngagementStatus(engagementId, status) {
  try {
    let sql = `UPDATE engagements SET status = ? WHERE id = ?`;
    let params = [status, engagementId];
    if (status === 'completed') {
      sql = `UPDATE engagements SET status = ?, actual_delivery_date = CURRENT_TIMESTAMP WHERE id = ?`;
      await dbAsync.run(sql, params);
      // Al finalizar, los honorarios se consideran cobrados y se registra el ingreso del mes actual.
      await dbAsync.run(
        "UPDATE billing SET status = 'paid', received_at = CURRENT_TIMESTAMP WHERE engagement_id = ? AND status = 'pending'",
        [engagementId]
      );
      return { success: true };
    }
    await dbAsync.run(sql, params);
    return { success: true };
  } catch (error) {
    console.error('Error updating engagement status:', error);
    return { success: false, error: error.message };
  }
}

async function updateBillingStatus(billingId, status) {
  try {
    const sql = `UPDATE billing SET status = ? WHERE id = ?`;
    await dbAsync.run(sql, [status, billingId]);
    return { success: true };
  } catch (error) {
    console.error('Error updating billing status:', error);
    return { success: false, error: error.message };
  }
}

async function getAllBilling(month, year) {
  try {
    let sql = `
      SELECT b.*, e.type, e.description as eng_desc, c.name as client_name 
      FROM billing b
      JOIN engagements e ON b.engagement_id = e.id
      JOIN clients c ON e.client_id = c.id
    `;
    let params = [];
    
    // Optional date filtering based on due_date
    if (month && year) {
      // due_date format is YYYY-MM-DD
      const monthStr = month.toString().padStart(2, '0');
      const prefix = `${year}-${monthStr}-`;
      sql += ` WHERE b.due_date LIKE ?`;
      params.push(`${prefix}%`);
    }

    sql += ` ORDER BY b.due_date DESC`;
    
    const billing = await dbAsync.all(sql, params);
    return { success: true, billing };
  } catch (error) {
    console.error('Error fetching all billing:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getEngagements,
  createEngagement,
  addBilling,
  updateEngagementStatus,
  updateBillingStatus,
  getAllBilling,
  getAllEngagements,
  getIncomeByMonth,
  getClientImportance
};
