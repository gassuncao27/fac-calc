import { describe, expect, it } from 'vitest';
import { averageTermDays } from '../averageTerm';

describe('prazo médio ponderado', () => {
  it('equivale ao prazo do título quando há um único título', () => {
    expect(averageTermDays([{ nominalAmountCents: 1_000_000, days: 45 }])).toBe(45);
  });

  it('pondera pelo valor nominal com múltiplos títulos', () => {
    // (10.000×32 + 15.000×47 + 8.000×62) / 33.000 = 46,0909...
    const term = averageTermDays([
      { nominalAmountCents: 1_000_000, days: 32 },
      { nominalAmountCents: 1_500_000, days: 47 },
      { nominalAmountCents: 800_000, days: 62 },
    ]);
    expect(term).toBeCloseTo(46.0909, 4);
  });

  it('retorna zero sem títulos ou com nominal zero', () => {
    expect(averageTermDays([])).toBe(0);
    expect(averageTermDays([{ nominalAmountCents: 0, days: 30 }])).toBe(0);
  });
});
