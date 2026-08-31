const { dbAsync } = require('../database/db');
const { getFinancialRatios } = require('./ratioService');
const { getIvaReconciliation } = require('./ivaService');
const { parseFinancialPayload } = require('./financialPayload');

function money(value) {
  return `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildFindings(clientId, periodYear, periodMonth, ratiosResult, reconciliation) {
  const findings = [];
  const totals = ratiosResult?.totals;
  const ratios = ratiosResult?.ratios;

  // Un balance parcial de patrimonio/resultados no permite validar la ecuación.
  if (totals && ratiosResult?.hasBalance && totals.assets > 0) {
    const periodResult = String(ratiosResult.sourceType || '').includes('trial_balance')
      ? totals.income - totals.expenses
      : 0;
    const equationDifference = Math.abs(totals.assets - (totals.liabilities + totals.equity + periodResult));
    if (equationDifference > 5) {
      findings.push({
        sourceKey: `accounting-equation:${clientId}:${periodYear}:${periodMonth}`,
        testType: 'Cuadre contable',
        title: 'Descuadre en la ecuación contable',
        description: `Activo ${money(totals.assets)} no coincide con la estructura patrimonial esperada ${money(totals.liabilities + totals.equity + periodResult)}. Diferencia: ${money(equationDifference)}.`,
        impact: 'Crítico'
      });
    }
  }

  if (reconciliation?.status === 'DIFERENCIA') {
    if (reconciliation.differences.sales > 5) {
      findings.push({
        sourceKey: `iva-sales:${clientId}:${periodYear}:${periodMonth}`,
        testType: 'Cuadre IVA',
        title: 'Diferencia entre ventas IVA y contabilidad',
        description: `Ventas IVA ${money(reconciliation.iva.sales)} frente a ventas contables ${money(reconciliation.accounting.sales)}. Diferencia: ${money(reconciliation.differences.sales)}.`,
        impact: 'Crítico'
      });
    }
    if (reconciliation.differences.purchases !== null && reconciliation.differences.purchases > 5) {
      findings.push({
        sourceKey: `iva-purchases:${clientId}:${periodYear}:${periodMonth}`,
        testType: 'Cuadre IVA',
        title: 'Diferencia entre compras IVA y contabilidad',
        description: `Compras IVA ${money(reconciliation.iva.purchases)} frente a costos y gastos contables ${money(reconciliation.accounting.expenses)}. Diferencia: ${money(reconciliation.differences.purchases)}.`,
        impact: 'Medio'
      });
    }
  }

  if (ratios && ratios.currentRatio !== null && ratios.currentRatio < 1) {
    findings.push({
      sourceKey: `liquidity:${clientId}:${periodYear}:${periodMonth}`,
      testType: 'Ratios financieros',
      title: 'Liquidez corriente inferior a 1.00',
      description: `La entidad presenta una liquidez corriente de ${ratios.currentRatio.toFixed(2)}x, lo que indica que sus activos corrientes no cubren totalmente sus pasivos corrientes.`,
      impact: 'Medio'
    });
  }

  if (ratios && ratios.debtToAssets !== null && ratios.debtToAssets > 70) {
    findings.push({
      sourceKey: `debt:${clientId}:${periodYear}:${periodMonth}`,
      testType: 'Ratios financieros',
      title: 'Nivel de endeudamiento elevado',
      description: `Los pasivos representan ${ratios.debtToAssets.toFixed(2)}% de los activos, superando el umbral de revisión del 70%.`,
      impact: 'Medio'
    });
  }

  if (ratios && ratios.netMargin !== null && ratios.netMargin < 0) {
    findings.push({
      sourceKey: `loss:${clientId}:${periodYear}:${periodMonth}`,
      testType: 'Ratios financieros',
      title: 'Margen neto negativo',
      description: `La entidad presenta un margen neto de ${ratios.netMargin.toFixed(2)}%, indicando pérdidas en el período analizado.`,
      impact: 'Crítico'
    });
  }

  return findings;
}

function buildPeriodFinding(clientId, periodYear, periodMonth, metadata, statementType) {
  if (!metadata) return null;
  const isPointInTime = statementType === 'balance' || statementType === 'trial_balance';
  const hasRangeOnPointStatement = isPointInTime && metadata.periodStart && metadata.periodEnd && metadata.periodStart !== metadata.periodEnd;
  const lacksRangeOnFlowStatement = !isPointInTime && (!metadata.periodStart || !metadata.periodEnd);
  if (!hasRangeOnPointStatement && !lacksRangeOnFlowStatement) return null;
  return {
    sourceKey: `period-scope:${clientId}:${periodYear}:${periodMonth}`,
    testType: 'Calidad del período',
    title: hasRangeOnPointStatement ? 'Período incompatible con el tipo de estado' : 'Período incompleto',
    description: hasRangeOnPointStatement
      ? `El documento fue identificado como ${statementType}, pero declara un rango del ${metadata.periodStart} al ${metadata.periodEnd}. Un balance debe representar una fecha de corte.`
      : `El documento ${statementType} requiere fecha inicial y fecha final para validar el período informado.`,
    impact: 'Crítico'
  };
}

async function runAudit(clientId, periodYear, periodMonth) {
  const [ratios, reconciliation] = await Promise.all([
    getFinancialRatios(clientId, periodYear, periodMonth),
    getIvaReconciliation(clientId, periodYear, periodMonth)
  ]);
  const findings = buildFindings(clientId, periodYear, periodMonth, ratios, reconciliation);
  const financial = await dbAsync.get(
    `SELECT raw_data_json, type FROM financial_statements
     WHERE client_id = ? AND period_year = ? AND (period_month = ? OR period_month IS NULL)
     ORDER BY CASE WHEN period_month = ? THEN 0 ELSE 1 END, created_at DESC`,
    [clientId, periodYear, periodMonth, periodMonth]
  );
  if (financial?.raw_data_json) {
    const payload = parseFinancialPayload(financial.raw_data_json);
    const periodFinding = buildPeriodFinding(clientId, periodYear, periodMonth, payload.metadata, financial.type);
    if (periodFinding) findings.push(periodFinding);
  }

  const existing = await dbAsync.all(
    'SELECT source_key FROM audit_findings WHERE client_id = ? AND period_year = ? AND period_month = ?',
    [clientId, periodYear, periodMonth]
  );
  const activeKeys = new Set(findings.map(finding => finding.sourceKey));
  for (const row of existing) {
    if (!activeKeys.has(row.source_key)) {
      await dbAsync.run('DELETE FROM audit_findings WHERE source_key = ?', [row.source_key]);
    }
  }

  for (const finding of findings) {
    await dbAsync.run(
      `INSERT INTO audit_findings
        (client_id, period_year, period_month, source_key, test_type, title, description, impact)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(source_key) DO UPDATE SET
         test_type = excluded.test_type,
         title = excluded.title,
         description = excluded.description,
         impact = excluded.impact,
         updated_at = CURRENT_TIMESTAMP`,
      [clientId, periodYear, periodMonth, finding.sourceKey, finding.testType, finding.title, finding.description, finding.impact]
    );
  }

  return getAuditFindings(clientId, periodYear, periodMonth);
}

async function getAuditFindings(clientId, periodYear, periodMonth) {
  const rows = await dbAsync.all(
    `SELECT id, source_key, test_type, title, description, impact, status, observation, created_at, updated_at
     FROM audit_findings
     WHERE client_id = ? AND period_year = ? AND period_month = ?
     ORDER BY CASE impact WHEN 'Crítico' THEN 1 WHEN 'Medio' THEN 2 ELSE 3 END, created_at DESC`,
    [clientId, periodYear, periodMonth]
  );

  return rows.map(row => ({
    id: `H-${String(row.id).padStart(4, '0')}`,
    databaseId: row.id,
    type: row.test_type,
    title: row.title,
    description: row.description,
    impact: row.impact,
    status: row.status,
    observation: row.observation,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

async function updateFinding(findingId, status, observation = null) {
  await dbAsync.run(
    `UPDATE audit_findings
     SET status = ?, observation = COALESCE(?, observation), updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [status, observation, findingId]
  );
  return { success: true };
}

module.exports = { runAudit, getAuditFindings, updateFinding };
