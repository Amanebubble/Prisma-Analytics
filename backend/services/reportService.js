const { dbAsync } = require('../database/db');
const { getFinancialRatios } = require('./ratioService');

const OPINION_TYPES = [
  { key: 'limpia', code: 'NIA 700', label: 'Opinión Sin Salvedades (Limpia)', icon: 'green' },
  { key: 'salvedades', code: 'NIA 705', label: 'Opinión con Salvedades', icon: 'yellow' },
  { key: 'adversa', code: 'NIA 705', label: 'Opinión Desfavorable (Adversa)', icon: 'red' },
  { key: 'abstencion', code: 'NIA 705', label: 'Abstención / Denegación de Opinión', icon: 'grey' }
];

function money(value) {
  return `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function getOpinionDiagnosis(clientId, periodYear, periodMonth) {
  const [financials, findings, ivaCount, bankCount] = await Promise.all([
    dbAsync.all('SELECT DISTINCT type FROM financial_statements WHERE client_id = ? AND period_year = ? AND (period_month = ? OR period_month IS NULL)', [clientId, periodYear, periodMonth]),
    dbAsync.all('SELECT impact, status FROM audit_findings WHERE client_id = ? AND period_year = ? AND period_month = ?', [clientId, periodYear, periodMonth]),
    dbAsync.get('SELECT COUNT(*) AS c FROM iva_documents WHERE client_id = ? AND period_year = ? AND period_month = ?', [clientId, periodYear, periodMonth]),
    dbAsync.get('SELECT COUNT(*) AS c FROM bank_documents WHERE client_id = ? AND period_year = ? AND period_month = ?', [clientId, periodYear, periodMonth])
  ]);

  const requiredTypes = ['balance', 'trial_balance', 'results', 'equity_changes', 'cash_flow'];
  const presentTypes = new Set(financials.map(row => row.type));
  const missing = requiredTypes.filter(type => !presentTypes.has(type));

  const openCritical = findings.filter(f => f.status === 'Pendiente' && (f.impact === 'Crítico' || f.impact === 'Alto')).length;
  const openMedium = findings.filter(f => f.status === 'Pendiente' && f.impact === 'Medio').length;

  let suggestion = 'limpia';
  let severity = 'green';
  if (missing.includes('balance') && missing.includes('results')) { suggestion = 'abstencion'; severity = 'grey'; }
  else if (openCritical > 0) { suggestion = 'adversa'; severity = 'red'; }
  else if (missing.length > 0 || openMedium > 0 || openCritical > 0) { suggestion = 'salvedades'; severity = 'yellow'; }
  else if (!presentTypes.has('balance') && !presentTypes.has('trial_balance')) { suggestion = 'abstencion'; severity = 'grey'; }

  return {
    success: true,
    presentTypes: [...presentTypes],
    missing,
    openCritical,
    openMedium,
    hasIva: (ivaCount?.c || 0) > 0,
    hasBanks: (bankCount?.c || 0) > 0,
    suggestion,
    severity,
    opinionTypes: OPINION_TYPES
  };
}

async function getOpinionTemplate(opinionKey, clientId, periodYear, periodMonth) {
  const client = await dbAsync.get('SELECT * FROM clients WHERE id = ?', [clientId]);
  const ratios = await getFinancialRatios(clientId, periodYear, periodMonth);
  const totals = ratios?.totals || { assets: 0, liabilities: 0, equity: 0, netIncome: 0 };
  const periodLabel = `${periodYear}`;

  const option = OPINION_TYPES.find(item => item.key === opinionKey) || OPINION_TYPES[0];
  const company = client?.name || 'la empresa';
  const utility = totals.netIncome >= 0 ? 'utilidades' : 'pérdidas';
  const utilityText = `una ${utility} de ${money(Math.abs(totals.netIncome))}`;

  const blocks = [];
  const push = (value, size = 12, bold = false, rowFlex = null) => blocks.push({ value, size, bold, rowFlex: rowFlex || null });

  push('INFORME DEL AUDITOR INDEPENDIENTE', 16, true, 'center');
  push(`\n\n${option.label} (${option.code})`, 14, true, 'center');
  push(`\n\n${company}`, 12, true, 'center');
  push(`Período: ${periodLabel}\n`, 11, false, 'center');

  push('\n\n1. Opinión', 14, true);
  if (opinionKey === 'limpia') {
    push(`Hemos auditado los estados financieros adjuntos de ${company}, que comprenden el balance general al cierre del ejercicio ${periodLabel}, el estado de resultados, el estado de cambios en el patrimonio y el estado de flujos de efectivo, y las notas correspondientes.\n`);
    push(`En nuestra opinión, los estados financieros mencionados presentan razonablemente, en todos los aspectos materiales, la situación financiera de ${company} al ${periodLabel}, así como su desempeño financiero y sus flujos de efectivo, de conformidad con las Normas Internacionales de Información Financiera para PYMES.\n`);
  } else if (opinionKey === 'salvedades') {
    push(`Hemos auditado los estados financieros adjuntos de ${company} que comprenden el balance general al ${periodLabel}, el estado de resultados, el estado de cambios en el patrimonio y el estado de flujos de efectivo.\n`);
    push(`En nuestra opinión, excepto por los efectos del asunto descrito en el párrafo de "Fundamento de la Opinión con Salvedades", los estados financieros presentan razonablemente, en todos los aspectos materiales, la situación financiera de ${company} al ${periodLabel}, de conformidad con las NIIF para PYMES.\n`);
  } else if (opinionKey === 'adversa') {
    push(`Hemos auditado los estados financieros adjuntos de ${company} al ${periodLabel}.\n`);
    push(`En nuestra opinión, debido a la importancia de los asuntos descritos en el párrafo de "Fundamento de la Opinión Desfavorable", los estados financieros NO presentan razonablemente la situación financiera de ${company} al ${periodLabel}, de conformidad con las NIIF para PYMES.\n`);
  } else {
    push(`Fuimos contratados para auditar los estados financieros adjuntos de ${company} al ${periodLabel}.\n`);
    push(`No expresamos una opinión sobre los estados financieros. Debido a la importancia de la falta de evidencia de auditoría descrita en el párrafo de "Fundamento de la Abstención de Opinión", no nos fue posible obtener evidencia suficiente y apropiada para fundamentar nuestra opinión.\n`);
  }

  push('\n2. Fundamento de la Opinión', 14, true);
  push(`La auditoría se realizó de conformidad con las Normas Internacionales de Auditoría (NIA) aplicables en El Salvador. Nuestra responsabilidad se describe en el párrafo de "Responsabilidades del Auditor". Hemos cumplido con los requisitos de independencia.\n`);

  push('\n3. Responsabilidades de la Administración', 14, true);
  push(`La administración de ${company} es responsable de la preparación y presentación razonable de los estados financieros de conformidad con las NIIF para PYMES, así como del control interno que considere necesario.\n`);

  push('\n4. Responsabilidades del Auditor', 14, true);
  push(`Nuestra responsabilidad es expresar una opinión sobre los estados financieros con base en nuestra auditoría, la cual fue planeada y ejecutada para obtener seguridad razonable.\n`);

  push('\n\nResumen del desempeño del período', 14, true);
  push(`Los estados financieros reportan: Activo Total ${money(totals.assets)}, Pasivos ${money(totals.liabilities)}, Patrimonio ${money(totals.equity)} y un resultado del ejercicio con ${utilityText}.\n`);

  push('\n\n____________________________', 12, false, 'center');
  push('Lic. Auditor Independiente', 11, false, 'center');
  push('Registro CVPCPA', 11, false, 'center');

  return {
    success: true,
    opinion: option,
    company,
    periodLabel,
    totals,
    blocks
  };
}

async function getOpinionDrafts(clientId) {
  const rows = await dbAsync.all(
    'SELECT id, period_year, period_month, draft_content, last_modified FROM report_drafts WHERE client_id = ? ORDER BY last_modified DESC',
    [clientId]
  );
  const drafts = rows.map(row => {
    let content = null;
    try { content = JSON.parse(row.draft_content); } catch (e) {}
    return {
      id: row.id,
      periodYear: row.period_year,
      periodMonth: row.period_month,
      lastModified: row.last_modified,
      opinion: content?.opinion || null,
      company: content?.company || '',
      periodLabel: content?.periodLabel || '',
      firmante: content?.firmante || '',
      blocks: content?.blocks || null
    };
  });
  return { success: true, drafts };
}

async function getReportDraft(clientId, periodYear, periodMonth) {
  try {
    const sql = `SELECT * FROM report_drafts WHERE client_id = ? AND period_year = ? AND period_month = ?`;
    const draft = await dbAsync.get(sql, [clientId, periodYear, periodMonth]);
    
    if (draft) {
      return { success: true, draft: JSON.parse(draft.draft_content) };
    } else {
      return { success: true, draft: null };
    }
  } catch (error) {
    console.error('Error fetching report draft:', error);
    return { success: false, error: error.message };
  }
}

async function saveReportDraft(clientId, periodYear, periodMonth, draftContent) {
  try {
    const stringifiedContent = JSON.stringify(draftContent);
    
    // Check if it exists
    const checkSql = `SELECT id FROM report_drafts WHERE client_id = ? AND period_year = ? AND period_month = ?`;
    const existing = await dbAsync.get(checkSql, [clientId, periodYear, periodMonth]);
    
    if (existing) {
      const updateSql = `UPDATE report_drafts SET draft_content = ?, last_modified = CURRENT_TIMESTAMP WHERE id = ?`;
      await dbAsync.run(updateSql, [stringifiedContent, existing.id]);
    } else {
      const insertSql = `INSERT INTO report_drafts (client_id, period_year, period_month, draft_content) VALUES (?, ?, ?, ?)`;
      await dbAsync.run(insertSql, [clientId, periodYear, periodMonth, stringifiedContent]);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error saving report draft:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getReportDraft,
  saveReportDraft,
  getOpinionDiagnosis,
  getOpinionTemplate,
  getOpinionDrafts
};
