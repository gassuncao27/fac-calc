import { describe, expect, it } from 'vitest';
import { effectiveMonthlyRate, monthlyToAnnual } from '../effectiveRate';
import { buildOperationCashflows } from '../cashflows';

describe('taxa efetiva da operação (XIRR mensal)', () => {
  it('resolve analiticamente o caso de um único título', () => {
    // Sai 9.550 hoje, entra 10.000 em 45 dias:
    // i = (10000/9550)^(30/45) − 1
    const rate = effectiveMonthlyRate([
      { date: '2026-08-14', amountCents: -955_000 },
      { date: '2026-09-28', amountCents: 1_000_000 },
    ]);
    const expected = Math.pow(1_000_000 / 955_000, 30 / 45) - 1;
    expect(rate).not.toBeNull();
    expect(rate!).toBeCloseTo(expected, 8);
    // A taxa efetiva "por fora" é maior que a taxa comercial de 3%
    expect(rate!).toBeGreaterThan(0.03);
  });

  it('zera o VPL dos fluxos na taxa encontrada (múltiplos títulos)', () => {
    const cashflows = buildOperationCashflows('2026-08-14', 3_173_250, [
      { settlementDate: '2026-09-15', nominalAmountCents: 1_000_000 },
      { settlementDate: '2026-09-30', nominalAmountCents: 1_500_000 },
      { settlementDate: '2026-10-15', nominalAmountCents: 800_000 },
    ]);
    const rate = effectiveMonthlyRate(cashflows);
    expect(rate).not.toBeNull();
    const npv = cashflows.reduce((sum, cf) => {
      const days = (new Date(cf.date).getTime() - new Date('2026-08-14').getTime()) / 86_400_000;
      return sum + cf.amountCents / Math.pow(1 + rate!, days / 30);
    }, 0);
    expect(Math.abs(npv)).toBeLessThan(0.01);
  });

  it('retorna null quando não há fluxos futuros de entrada', () => {
    expect(effectiveMonthlyRate([])).toBeNull();
    expect(effectiveMonthlyRate([{ date: '2026-08-14', amountCents: -1_000 }])).toBeNull();
    expect(
      effectiveMonthlyRate([
        { date: '2026-08-14', amountCents: -1_000_000 },
        { date: '2026-08-14', amountCents: 1_000_000 },
      ]),
    ).toBeNull();
  });

  it('converte taxa mensal em anual por capitalização composta', () => {
    // (1,03)^12 − 1 = 42,576...%
    expect(monthlyToAnnual(0.03)).toBeCloseTo(0.425761, 5);
    expect(monthlyToAnnual(0)).toBe(0);
  });
});
