import { type MappedAccount } from '../services/aiService';

export interface ValidationResult {
  ai_status: 'OK' | 'DESCUADRE' | 'NO_APLICA';
  ai_diff: number;
  calculated_totals: {
    income: number;
    expenses: number;
    assets: number;
    liabilities: number;
    equity: number;
    margin: number;
    score: number;
  };
}

export function validateFinancialData(mappedData: MappedAccount[], statementType = 'balance'): ValidationResult {
  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;
  let totalIncome = 0;
  let totalExpenses = 0;

  const accountCodes = mappedData.map(account => String(account.originalName).match(/^\s*(\d+)/)?.[1]).filter(Boolean) as string[];
  const leafAccounts = mappedData.filter(account => {
    const code = String(account.originalName).match(/^\s*(\d+)/)?.[1];
    return !code || !accountCodes.some(other => other !== code && other.startsWith(code));
  });

  const seen = new Set();
  for (const account of leafAccounts) {
    // Deduplicar cuentas por nombre: evita doble conteo cuando la IA repite una cuenta.
    const nameKey = String(account.originalName || '').trim().toLowerCase();
    if (nameKey) {
      if (seen.has(nameKey)) continue;
      seen.add(nameKey);
    }
    // Parse balance safely
    const balanceStr = String(account.originalBalance).replace(/,/g, '');
    const balance = parseFloat(balanceStr);
    
    if (isNaN(balance)) continue;

    // NIIF Classification Math
    const code = account.niifCode;
    
    if (code.startsWith('1')) {
      totalAssets += balance;
    } else if (code.startsWith('2')) {
      totalLiabilities += balance;
    } else if (code.startsWith('3')) {
      totalEquity += balance;
    } else if (code.startsWith('4')) {
      totalIncome += balance;
    } else if (code.startsWith('5') || code.startsWith('6')) {
      totalExpenses += balance;
    }
  }

  // Respetar el signo de cada cuenta (cuentas correctoras y pérdidas son negativas).
  const validatesEquation = statementType === 'balance' || statementType === 'trial_balance';
  // En una balanza de comprobación el resultado del período aún está separado
  // del patrimonio; en un balance general normalmente ya está incorporado.
  const periodResult = statementType === 'trial_balance' ? totalIncome - totalExpenses : 0;
  const expectedAssets = totalLiabilities + totalEquity + periodResult;
  const diff = Math.abs(totalAssets - expectedAssets);

  // Solo un balance o balance de comprobación debe cumplir esta ecuación.
  const isDescuadre = validatesEquation && totalAssets > 0 && diff > 5;

  const ai_status = !validatesEquation ? 'NO_APLICA' : isDescuadre ? 'DESCUADRE' : 'OK';
  const ai_diff = isDescuadre ? parseFloat(diff.toFixed(2)) : 0;

  // Margin calculation
  const netIncome = totalIncome - totalExpenses;
  let netMargin = 0;
  if (totalIncome > 0) {
    netMargin = parseFloat(((netIncome / totalIncome) * 100).toFixed(2));
  }

  // Score calculation (0 - 100)
  let score = 50; // base score
  if (totalAssets > totalLiabilities) score += 20; // Solvency
  if (totalIncome > totalExpenses) score += 20; // Profitability
  if (totalAssets > 0 && (totalLiabilities / totalAssets) < 0.5) score += 10; // Low debt
  if (isDescuadre) score -= 30; // Penalty for accounting error

  // Bound score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  return {
    ai_status,
    ai_diff,
    calculated_totals: {
      income: parseFloat(totalIncome.toFixed(2)),
      expenses: parseFloat(totalExpenses.toFixed(2)),
      assets: parseFloat(totalAssets.toFixed(2)),
      liabilities: parseFloat(totalLiabilities.toFixed(2)),
      equity: parseFloat(totalEquity.toFixed(2)),
      margin: netMargin,
      score: Math.round(score)
    }
  };
}
