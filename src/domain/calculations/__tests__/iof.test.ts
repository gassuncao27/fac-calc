import { describe, expect, it } from 'vitest';
import { calculateIof, IOF_MAX_DAYS } from '../iof';

// Alíquotas usadas nos testes (as reais ficam em Configurações)
const DIARIA = 0.0082;
const ADICIONAL = 0.95;

describe('IOF/Crédito', () => {
  it('aplica alíquota diária sobre a base pelo prazo do título', () => {
    // 15.722,50 × 0,0082% × 60 dias = 77,35  |  adicional 0,95% = 149,36
    const r = calculateIof({
      baseCents: 1_572_250,
      dailyRate: DIARIA,
      additionalRate: ADICIONAL,
      items: [{ days: 60, weightCents: 1_572_250 }],
    });
    expect(r.principalCents).toBe(7_735);
    expect(r.additionalCents).toBe(14_936);
    expect(r.totalCents).toBe(22_671);
  });

  it('rateia a base entre títulos de prazos diferentes', () => {
    // Base 100.000,00 dividida igualmente entre 30 e 90 dias:
    // 50.000×0,0082%×30 = 123,00  +  50.000×0,0082%×90 = 369,00  = 492,00
    const r = calculateIof({
      baseCents: 10_000_000,
      dailyRate: DIARIA,
      additionalRate: 0,
      items: [
        { days: 30, weightCents: 5_000_000 },
        { days: 90, weightCents: 5_000_000 },
      ],
    });
    expect(r.principalCents).toBe(49_200);
    expect(r.additionalCents).toBe(0);
  });

  it('limita o principal a 365 dias de prazo', () => {
    const base = { baseCents: 1_000_000, dailyRate: DIARIA, additionalRate: 0 };
    const a = calculateIof({ ...base, items: [{ days: IOF_MAX_DAYS, weightCents: 1_000_000 }] });
    const b = calculateIof({ ...base, items: [{ days: 900, weightCents: 1_000_000 }] });
    expect(b.principalCents).toBe(a.principalCents);
  });

  it('cobra o adicional mesmo com prazo zero', () => {
    const r = calculateIof({
      baseCents: 1_000_000,
      dailyRate: DIARIA,
      additionalRate: ADICIONAL,
      items: [{ days: 0, weightCents: 1_000_000 }],
    });
    expect(r.principalCents).toBe(0);
    expect(r.additionalCents).toBe(9_500);
    expect(r.totalCents).toBe(9_500);
  });

  it('retorna zero quando a base é zero ou negativa', () => {
    const args = { dailyRate: DIARIA, additionalRate: ADICIONAL, items: [{ days: 60, weightCents: 100 }] };
    expect(calculateIof({ ...args, baseCents: 0 }).totalCents).toBe(0);
    expect(calculateIof({ ...args, baseCents: -5_000 }).totalCents).toBe(0);
  });

  it('não quebra sem títulos: cobra só o adicional', () => {
    const r = calculateIof({
      baseCents: 1_000_000,
      dailyRate: DIARIA,
      additionalRate: ADICIONAL,
      items: [],
    });
    expect(r.principalCents).toBe(0);
    expect(r.additionalCents).toBe(9_500);
  });

  it('alíquotas zeradas resultam em IOF zero', () => {
    const r = calculateIof({
      baseCents: 1_000_000,
      dailyRate: 0,
      additionalRate: 0,
      items: [{ days: 60, weightCents: 1_000_000 }],
    });
    expect(r.totalCents).toBe(0);
  });
});
