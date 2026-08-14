import { describe, expect, it } from 'vitest';
import { simpleDiscountCents } from '../discount';

describe('desconto simples por taxa mensal', () => {
  it('calcula o exemplo da especificação: R$ 10.000, 3% a.m., 45 dias, base 30 → R$ 450', () => {
    expect(
      simpleDiscountCents({ nominalAmountCents: 1_000_000, monthlyRate: 3, days: 45, dayBase: 30 }),
    ).toBe(45_000);
  });

  it('calcula título com 30 dias (um mês exato): R$ 10.000, 3% a.m. → R$ 300', () => {
    expect(
      simpleDiscountCents({ nominalAmountCents: 1_000_000, monthlyRate: 3, days: 30, dayBase: 30 }),
    ).toBe(30_000);
  });

  it('arredonda para o centavo mais próximo apenas no resultado final', () => {
    // 1.234,56 × 2,5% × 17 / 30 = 17,4896 → R$ 17,49
    expect(
      simpleDiscountCents({ nominalAmountCents: 123_456, monthlyRate: 2.5, days: 17, dayBase: 30 }),
    ).toBe(1_749);
  });

  it('respeita a base de dias 360', () => {
    // 10.000 × 12% × 45 / 360 = 150,00
    expect(
      simpleDiscountCents({ nominalAmountCents: 1_000_000, monthlyRate: 12, days: 45, dayBase: 360 }),
    ).toBe(15_000);
  });

  it('retorna zero para prazo zero ou negativo', () => {
    expect(simpleDiscountCents({ nominalAmountCents: 1_000_000, monthlyRate: 3, days: 0, dayBase: 30 })).toBe(0);
    expect(simpleDiscountCents({ nominalAmountCents: 1_000_000, monthlyRate: 3, days: -5, dayBase: 30 })).toBe(0);
  });
});
