import { describe, expect, it } from 'vitest';
import { calculateOperation, type OperationCalcInput } from '../operation';

function baseInput(overrides: Partial<OperationCalcInput> = {}): OperationCalcInput {
  return {
    operationDate: '2026-08-14',
    monthlyRate: 3,
    dayBase: 30,
    method: 'simple_monthly',
    fixedFeeCents: 0,
    percentageFee: 0,
    otherExpensesCents: 0,
    receivables: [],
    ...overrides,
  };
}

describe('calculateOperation', () => {
  it('reproduz o exemplo da especificação (título único, 45 dias, sem tarifas)', () => {
    const result = calculateOperation(
      baseInput({
        receivables: [
          { id: '1', documentNumber: '001', nominalAmountCents: 1_000_000, dueDate: '2026-09-28' },
        ],
      }),
    );
    expect(result.receivables[0].days).toBe(45);
    expect(result.nominalAmountCents).toBe(1_000_000);
    expect(result.discountAmountCents).toBe(45_000); // R$ 450,00
    expect(result.feesAmountCents).toBe(0);
    expect(result.netAmountCents).toBe(955_000); // R$ 9.550,00
    expect(result.averageTermDays).toBe(45);
  });

  it('calcula título com 30 dias', () => {
    const result = calculateOperation(
      baseInput({
        receivables: [
          { id: '1', documentNumber: '001', nominalAmountCents: 1_000_000, dueDate: '2026-09-13' },
        ],
      }),
    );
    expect(result.receivables[0].days).toBe(30);
    expect(result.discountAmountCents).toBe(30_000);
    expect(result.netAmountCents).toBe(970_000);
  });

  it('soma corretamente múltiplos títulos com dias calculados pelas datas', () => {
    const result = calculateOperation(
      baseInput({
        monthlyRate: 2.5,
        receivables: [
          { id: '1', documentNumber: '001', nominalAmountCents: 1_000_000, dueDate: '2026-09-15' }, // 32 dias
          { id: '2', documentNumber: '002', nominalAmountCents: 1_500_000, dueDate: '2026-09-30' }, // 47 dias
          { id: '3', documentNumber: '003', nominalAmountCents: 800_000, dueDate: '2026-10-15' }, // 62 dias
        ],
      }),
    );
    expect(result.receivables.map((r) => r.days)).toEqual([32, 47, 62]);
    // 10.000×2,5%×32/30 = 266,67 | 15.000×2,5%×47/30 = 587,50 | 8.000×2,5%×62/30 = 413,33
    expect(result.receivables.map((r) => r.discountAmountCents)).toEqual([26_667, 58_750, 41_333]);
    expect(result.nominalAmountCents).toBe(3_300_000);
    expect(result.discountAmountCents).toBe(126_750);
    expect(result.netAmountCents).toBe(3_173_250);
    expect(result.averageTermDays).toBeCloseTo(46.0909, 4);
  });

  it('aplica tarifa fixa, tarifa percentual e outras despesas', () => {
    const result = calculateOperation(
      baseInput({
        monthlyRate: 2.5,
        fixedFeeCents: 5_000, // R$ 50,00
        percentageFee: 1, // 1% de 33.000 = R$ 330,00
        otherExpensesCents: 2_000, // R$ 20,00
        receivables: [
          { id: '1', documentNumber: '001', nominalAmountCents: 1_000_000, dueDate: '2026-09-15' },
          { id: '2', documentNumber: '002', nominalAmountCents: 1_500_000, dueDate: '2026-09-30' },
          { id: '3', documentNumber: '003', nominalAmountCents: 800_000, dueDate: '2026-10-15' },
        ],
      }),
    );
    expect(result.feesAmountCents).toBe(5_000 + 33_000);
    expect(result.expensesAmountCents).toBe(2_000);
    expect(result.netAmountCents).toBe(3_300_000 - 126_750 - 38_000 - 2_000);
  });

  it('inclui despesas por título no total de despesas e no líquido do título', () => {
    const result = calculateOperation(
      baseInput({
        receivables: [
          {
            id: '1',
            documentNumber: '001',
            nominalAmountCents: 1_000_000,
            dueDate: '2026-09-28',
            expensesCents: 1_500,
          },
        ],
      }),
    );
    expect(result.expensesAmountCents).toBe(1_500);
    expect(result.receivables[0].netAmountCents).toBe(1_000_000 - 45_000 - 1_500);
    expect(result.netAmountCents).toBe(955_000 - 1_500);
  });

  it('taxa efetiva sem tarifas fica próxima da comercial, e maior com tarifas', () => {
    const receivables = [
      { id: '1', documentNumber: '001', nominalAmountCents: 1_000_000, dueDate: '2026-09-28' },
    ];
    const semTarifa = calculateOperation(baseInput({ receivables }));
    const comTarifa = calculateOperation(baseInput({ receivables, fixedFeeCents: 10_000 }));

    // Sem tarifa: i = (10000/9550)^(30/45) − 1 ≈ 3,1171% a.m.
    expect(semTarifa.effectiveMonthlyRate).not.toBeNull();
    expect(semTarifa.effectiveMonthlyRate!).toBeCloseTo(
      (Math.pow(1_000_000 / 955_000, 30 / 45) - 1) * 100,
      6,
    );
    expect(semTarifa.effectiveMonthlyRate!).toBeGreaterThan(3);

    // Tarifas reduzem o líquido entregue → taxa efetiva sobe
    expect(comTarifa.effectiveMonthlyRate!).toBeGreaterThan(semTarifa.effectiveMonthlyRate!);

    // Anual coerente com a mensal: (1+i)^12 − 1
    const annual = (Math.pow(1 + semTarifa.effectiveMonthlyRate! / 100, 12) - 1) * 100;
    expect(semTarifa.effectiveAnnualRate!).toBeCloseTo(annual, 6);
  });

  it('operação vazia devolve zeros e taxas nulas', () => {
    const result = calculateOperation(baseInput());
    expect(result.nominalAmountCents).toBe(0);
    expect(result.netAmountCents).toBe(0);
    expect(result.averageTermDays).toBe(0);
    expect(result.effectiveMonthlyRate).toBeNull();
    expect(result.effectiveAnnualRate).toBeNull();
  });

  it('título vencendo no mesmo dia não gera desconto nem taxa efetiva', () => {
    const result = calculateOperation(
      baseInput({
        receivables: [
          { id: '1', documentNumber: '001', nominalAmountCents: 1_000_000, dueDate: '2026-08-14' },
        ],
      }),
    );
    expect(result.discountAmountCents).toBe(0);
    expect(result.netAmountCents).toBe(1_000_000);
    expect(result.effectiveMonthlyRate).toBeNull();
  });
});
