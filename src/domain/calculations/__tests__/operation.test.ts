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

  // Caso conferido manualmente pelo usuário (16.550 / 2,50% a.m. / 60 dias):
  // deságio 827,50 · líquido 15.722,50 · efetiva 2,5978% a.m. · 36,04% a.a.
  it('reproduz o exemplo validado de 60 dias, sem IOF', () => {
    const result = calculateOperation(
      baseInput({
        operationDate: '2026-08-26',
        monthlyRate: 2.5,
        receivables: [
          { id: '1', documentNumber: '001', nominalAmountCents: 1_655_000, dueDate: '2026-10-25' },
        ],
      }),
    );
    expect(result.receivables[0].days).toBe(60);
    expect(result.discountAmountCents).toBe(82_750); // R$ 827,50
    expect(result.netAmountCents).toBe(1_572_250); // R$ 15.722,50
    expect(result.iofAmountCents).toBe(0);
    expect(result.effectiveMonthlyRate!).toBeCloseTo(2.5978, 4);
    expect(result.effectiveAnnualRate!).toBeCloseTo(36.04, 2);
  });

  it('aplica IOF sobre o líquido entregue, reduzindo o valor final', () => {
    const comum = {
      operationDate: '2026-08-26',
      monthlyRate: 2.5,
      receivables: [
        { id: '1', documentNumber: '001', nominalAmountCents: 1_655_000, dueDate: '2026-10-25' },
      ],
    };
    const semIof = calculateOperation(baseInput(comum));
    const comIof = calculateOperation(
      baseInput({ ...comum, iofEnabled: true, iofDailyRate: 0.0082, iofAdditionalRate: 0.95 }),
    );

    // Base do IOF é o líquido ANTES do imposto (sem circularidade)
    expect(comIof.iofBaseCents).toBe(semIof.netAmountCents);
    expect(comIof.iofPrincipalCents).toBe(7_735); // 15.722,50 × 0,0082% × 60
    expect(comIof.iofAdditionalCents).toBe(14_936); // 15.722,50 × 0,95%
    expect(comIof.iofAmountCents).toBe(22_671); // R$ 226,71
    expect(comIof.netAmountCents).toBe(1_549_579); // R$ 15.495,79

    // Deságio e nominal não mudam; só o líquido cai
    expect(comIof.discountAmountCents).toBe(semIof.discountAmountCents);
    expect(comIof.nominalAmountCents).toBe(semIof.nominalAmountCents);
    // Entregando menos pelo mesmo recebimento, a taxa efetiva sobe
    expect(comIof.effectiveMonthlyRate!).toBeGreaterThan(semIof.effectiveMonthlyRate!);
  });

  it('IOF desligado ignora as alíquotas informadas', () => {
    const result = calculateOperation(
      baseInput({
        iofEnabled: false,
        iofDailyRate: 0.0082,
        iofAdditionalRate: 0.95,
        receivables: [
          { id: '1', documentNumber: '001', nominalAmountCents: 1_000_000, dueDate: '2026-09-28' },
        ],
      }),
    );
    expect(result.iofAmountCents).toBe(0);
    expect(result.iofBaseCents).toBe(0);
    expect(result.netAmountCents).toBe(955_000);
  });

  it('IOF respeita os prazos de cada título em operação com vários', () => {
    const result = calculateOperation(
      baseInput({
        monthlyRate: 2.5,
        iofEnabled: true,
        iofDailyRate: 0.0082,
        iofAdditionalRate: 0.95,
        receivables: [
          { id: '1', documentNumber: '001', nominalAmountCents: 1_000_000, dueDate: '2026-09-15' },
          { id: '2', documentNumber: '002', nominalAmountCents: 1_500_000, dueDate: '2026-09-30' },
          { id: '3', documentNumber: '003', nominalAmountCents: 800_000, dueDate: '2026-10-15' },
        ],
      }),
    );
    expect(result.iofBaseCents).toBe(3_173_250);
    expect(result.iofAdditionalCents).toBe(30_146); // 3.173.250 × 0,95%
    // principal > 0 e coerente com o prazo médio da carteira
    expect(result.iofPrincipalCents).toBeGreaterThan(0);
    expect(result.netAmountCents).toBe(3_173_250 - result.iofAmountCents);
  });
});
