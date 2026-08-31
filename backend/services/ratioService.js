const { dbAsync } = require('../database/db');
const { parseFinancialPayload } = require('./financialPayload');

function amount(value) {
  const parsed = Number(String(value ?? 0).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function ratio(numerator, denominator) {
  return denominator === 0 ? null : numerator / denominator;
}

function percent(numerator, denominator) {
  const result = ratio(numerator, denominator);
  return result === null ? null : result * 100;
}

function accountsFrom(rawData) {
  return parseFinancialPayload(rawData).cuentas;
}

function leafAccounts(accounts) {
  const codes = accounts.map(account => String(account.originalName || '').match(/^\s*(\d+)/)?.[1]).filter(Boolean);
  return accounts.filter(account => {
    const code = String(account.originalName || '').match(/^\s*(\d+)/)?.[1];
    return !code || !codes.some(other => other !== code && other.startsWith(code));
  });
}

function calculateRatios(accounts, periodYear, periodMonth) {
  const totals = {
    assets: 0, currentAssets: 0, liabilities: 0, currentLiabilities: 0,
    equity: 0, income: 0, expenses: 0, inventory: 0,
    receivables: 0, payables: 0, interest: 0
  };

  // Respetar el signo de cada cuenta (cuentas correctoras como depreciación acumulada
  // y pérdidas acumuladas son negativas). Deduplicar por nombre para evitar doble conteo.
  const seen = new Set();
  for (const account of accounts) {
    const nameKey = String(account.originalName || account.concepto || '').trim().toLowerCase();
    if (nameKey) {
      if (seen.has(nameKey)) continue;
      seen.add(nameKey);
    }
    const code = String(account.niifCode ?? account.niif_code ?? '');
    const value = amount(account.originalBalance ?? account.saldo ?? account.monto);
    if (code.startsWith('1')) totals.assets += value;
    if (code.startsWith('1.1')) totals.currentAssets += value;
    if (code.startsWith('1.1.2')) totals.receivables += value;
    if (code.startsWith('1.1.3')) totals.inventory += value;
    if (code.startsWith('2')) totals.liabilities += value;
    if (code.startsWith('2.1')) totals.currentLiabilities += value;
    if (code.startsWith('2.1.1')) totals.payables += value;
    if (code.startsWith('3')) totals.equity += value;
    if (code.startsWith('4')) totals.income += value;
    if (code.startsWith('5') || code.startsWith('6')) totals.expenses += value;
    if (code.startsWith('5.4')) totals.interest += value;
  }

  const netIncome = totals.income - totals.expenses;
  const workingCapital = totals.currentAssets - totals.currentLiabilities;
  const days = 365;
  const dso = ratio(totals.receivables * days, totals.income);
  const dio = ratio(totals.inventory * days, totals.expenses);
  const dpo = ratio(totals.payables * days, totals.expenses);

  return {
    period: { year: periodYear, month: periodMonth },
    totals: { ...totals, netIncome, workingCapital },
    ratios: {
      currentRatio: ratio(totals.currentAssets, totals.currentLiabilities),
      quickRatio: ratio(totals.currentAssets - totals.inventory, totals.currentLiabilities),
      debtToAssets: percent(totals.liabilities, totals.assets),
      debtToEquity: ratio(totals.liabilities, totals.equity),
      netMargin: percent(netIncome, totals.income),
      roa: percent(netIncome, totals.assets),
      roe: percent(netIncome, totals.equity),
      interestCoverage: ratio(netIncome + totals.interest, totals.interest),
      daysSalesOutstanding: dso,
      daysInventoryOutstanding: dio,
      daysPayablesOutstanding: dpo,
      cashConversionCycle: dso === null || dio === null || dpo === null ? null : dio + dso - dpo
    }
  };
}

async function getFinancialRatios(clientId, periodYear, periodMonth) {
  const records = await dbAsync.all(
    `SELECT raw_data_json, period_year, period_month, type
     FROM financial_statements
     WHERE client_id = ? AND period_year = ?
       AND type IN ('balance', 'trial_balance', 'results')
       AND (period_month = ? OR period_month IS NULL)
     ORDER BY CASE WHEN period_month = ? THEN 0 ELSE 1 END, created_at DESC`,
    [clientId, periodYear, periodMonth, periodMonth]
  );

  const latestByType = new Map();
  for (const record of records) {
    if (!latestByType.has(record.type)) latestByType.set(record.type, record);
  }
  if (!latestByType.size) {
    return { success: true, available: false, ratios: null };
  }

  const accounts = leafAccounts([...latestByType.values()].flatMap(record => accountsFrom(JSON.parse(record.raw_data_json))));
  const ratios = calculateRatios(accounts, periodYear, periodMonth);
  return {
    success: true,
    available: true,
    sourceType: [...latestByType.keys()].join(', '),
    hasBalance: latestByType.has('balance') || latestByType.has('trial_balance'),
    ...ratios
  };
}

// Resumen del cliente usando el período más reciente con estados cargados.
// Esto evita el problema de que el dashboard/analisis queden en 0 al reiniciar.
async function getClientSummary(clientId) {
  const record = await dbAsync.get(
    `SELECT raw_data_json, period_year, period_month
     FROM financial_statements
     WHERE client_id = ? ORDER BY period_year DESC, period_month DESC, id DESC LIMIT 1`,
    [clientId]
  );
  if (!record) return { success: true, hasData: false, totals: null };

  const accounts = leafAccounts(accountsFrom(JSON.parse(record.raw_data_json)));
  const ratios = calculateRatios(accounts, record.period_year, record.period_month);
  const totals = ratios.totals;
  const netIncome = totals.netIncome;
  const margin = totals.income > 0 ? (netIncome / totals.income) * 100 : 0;

  let score = 50;
  if (totals.assets > totals.liabilities) score += 20;
  if (netIncome > 0) score += 20;
  if (totals.assets > 0 && (totals.liabilities / totals.assets) < 0.5) score += 10;
  if (Math.abs(totals.assets - (totals.liabilities + totals.equity)) > 5) score -= 30;
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    success: true,
    hasData: true,
    periodYear: record.period_year,
    periodMonth: record.period_month,
    totals,
    margin: parseFloat(margin.toFixed(2)),
    score
  };
}

module.exports = { calculateRatios, getFinancialRatios, getClientSummary };
