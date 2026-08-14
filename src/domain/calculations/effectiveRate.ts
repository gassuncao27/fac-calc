import { toDayOffsets, type Cashflow } from './cashflows';

/**
 * Taxa interna de retorno com datas irregulares (equivalente a XIRR),
 * expressa como taxa efetiva MENSAL (mês comercial de 30 dias):
 *
 *   Σ  fluxo_i / (1 + i)^(dias_i / 30)  =  0
 *
 * Resolvida por Newton-Raphson com fallback de bisseção (a função de VPL
 * é estritamente decrescente para o padrão "saída hoje, entradas futuras").
 */

const PERIOD_DAYS = 30;
const TOLERANCE = 1e-10;
const MAX_ITERATIONS = 100;

function npv(rate: number, flows: { days: number; amountCents: number }[]): number {
  return flows.reduce((sum, f) => sum + f.amountCents / Math.pow(1 + rate, f.days / PERIOD_DAYS), 0);
}

function npvDerivative(rate: number, flows: { days: number; amountCents: number }[]): number {
  return flows.reduce((sum, f) => {
    const t = f.days / PERIOD_DAYS;
    return sum - (t * f.amountCents) / Math.pow(1 + rate, t + 1);
  }, 0);
}

/**
 * Retorna a taxa efetiva mensal como fração decimal (0.03 = 3% a.m.),
 * ou null quando não há solução significativa (fluxos vazios, sem prazo etc.).
 */
export function effectiveMonthlyRate(cashflows: Cashflow[]): number | null {
  const flows = toDayOffsets(cashflows);
  const hasOutflow = flows.some((f) => f.amountCents < 0);
  const hasFutureInflow = flows.some((f) => f.amountCents > 0 && f.days > 0);
  if (!hasOutflow || !hasFutureInflow) return null;

  // Newton-Raphson
  let rate = 0.03;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const value = npv(rate, flows);
    const derivative = npvDerivative(rate, flows);
    if (Math.abs(derivative) < 1e-12) break;
    const next = rate - value / derivative;
    if (!Number.isFinite(next) || next <= -1) break;
    if (Math.abs(next - rate) < TOLERANCE) return next;
    rate = next;
  }

  // Fallback: bisseção com expansão do intervalo superior
  let low = -0.999999;
  let high = 1;
  let iterations = 0;
  while (npv(high, flows) > 0 && iterations < 200) {
    high *= 2;
    iterations++;
  }
  if (npv(high, flows) > 0) return null;
  for (let i = 0; i < 300; i++) {
    const mid = (low + high) / 2;
    const value = npv(mid, flows);
    if (Math.abs(value) < TOLERANCE || (high - low) / 2 < TOLERANCE) return mid;
    if (value > 0) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/** Converte taxa efetiva mensal (fração) em anual (fração): (1+i)^12 - 1 */
export function monthlyToAnnual(monthlyRate: number): number {
  return Math.pow(1 + monthlyRate, 12) - 1;
}
