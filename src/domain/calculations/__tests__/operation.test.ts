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

  // ---- Compensação D+x ----

  it('D+2 alonga o prazo, aumenta o deságio e reduz o líquido', () => {
    const titulo = [
      { id: '1', documentNumber: '001', nominalAmountCents: 1_000_000, dueDate: '2026-09-28' },
    ];
    const semComp = calculateOperation(baseInput({ receivables: titulo }));
    const comComp = calculateOperation(baseInput({ receivables: titulo, compensationDays: 2 }));

    // 45 dias até o vencimento; 47 até compensar
    expect(semComp.receivables[0].days).toBe(45);
    expect(comComp.receivables[0].dueDays).toBe(45);
    expect(comComp.receivables[0].days).toBe(47);
    expect(comComp.receivables[0].compensationDate).toBe('2026-09-30');

    // 10.000 × 3% × 47/30 = 470,00 (contra 450,00 sem compensação)
    expect(comComp.discountAmountCents).toBe(47_000);
    expect(comComp.netAmountCents).toBe(953_000);
    expect(comComp.netAmountCents).toBeLessThan(semComp.netAmountCents);
  });

  it('D+0 mantém exatamente o comportamento anterior', () => {
    const titulo = [
      { id: '1', documentNumber: '001', nominalAmountCents: 1_000_000, dueDate: '2026-09-28' },
    ];
    const semCampo = calculateOperation(baseInput({ receivables: titulo }));
    const comZero = calculateOperation(baseInput({ receivables: titulo, compensationDays: 0 }));

    expect(comZero.netAmountCents).toBe(semCampo.netAmountCents);
    expect(comZero.receivables[0].compensationDate).toBe('2026-09-28');
    expect(comZero.receivables[0].days).toBe(comZero.receivables[0].dueDays);
  });

  it('a taxa efetiva considera a data de compensação, não a de vencimento', () => {
    const result = calculateOperation(
      baseInput({
        compensationDays: 2,
        receivables: [
          { id: '1', documentNumber: '001', nominalAmountCents: 1_000_000, dueDate: '2026-09-28' },
        ],
      }),
    );
    // Sai 9.530 hoje, entra 10.000 em 47 dias (não em 45)
    const esperado = (Math.pow(1_000_000 / 953_000, 30 / 47) - 1) * 100;
    expect(result.effectiveMonthlyRate!).toBeCloseTo(esperado, 6);
  });

  it('prazo médio pondera pelos dias até a compensação', () => {
    const result = calculateOperation(
      baseInput({
        monthlyRate: 2.5,
        compensationDays: 2,
        receivables: [
          { id: '1', documentNumber: '001', nominalAmountCents: 1_000_000, dueDate: '2026-09-15' }, // 32 → 34
          { id: '2', documentNumber: '002', nominalAmountCents: 1_500_000, dueDate: '2026-09-30' }, // 47 → 49
        ],
      }),
    );
    expect(result.receivables.map((r) => r.days)).toEqual([34, 49]);
    // (10.000×34 + 15.000×49) / 25.000 = 43,0
    expect(result.averageTermDays).toBeCloseTo(43, 6);
  });

  it('a compensação atravessa a virada de mês corretamente', () => {
    const result = calculateOperation(
      baseInput({
        operationDate: '2026-08-26',
        compensationDays: 3,
        receivables: [
          { id: '1', documentNumber: '001', nominalAmountCents: 1_000_000, dueDate: '2026-09-30' },
        ],
      }),
    );
    expect(result.receivables[0].compensationDate).toBe('2026-10-03');
  });

  it('valores negativos ou fracionários de D+x são normalizados', () => {
    const titulo = [
      { id: '1', documentNumber: '001', nominalAmountCents: 1_000_000, dueDate: '2026-09-28' },
    ];
    expect(calculateOperation(baseInput({ receivables: titulo, compensationDays: -5 })).receivables[0].days).toBe(45);
    expect(calculateOperation(baseInput({ receivables: titulo, compensationDays: 2.9 })).receivables[0].days).toBe(47);
  });

  it('IOF usa o prazo até a compensação', () => {
    const titulo = [
      { id: '1', documentNumber: '001', nominalAmountCents: 1_000_000, dueDate: '2026-09-28' },
    ];
    const iof = { iofEnabled: true, iofDailyRate: 0.0082, iofAdditionalRate: 0.95 };
    const semComp = calculateOperation(baseInput({ receivables: titulo, ...iof }));
    const comComp = calculateOperation(baseInput({ receivables: titulo, ...iof, compensationDays: 2 }));
    // Mais dias de prazo → mais IOF por prazo
    expect(comComp.iofPrincipalCents).toBeGreaterThan(semComp.iofPrincipalCents);
  });

  // ---- Datas incompletas (usuário digitando à mão) ----
  // Regressão: o campo de data passa por '' e por anos parciais enquanto se
  // digita. Uma exceção aqui derruba o React e deixa a tela em branco.

  it.each([
    ['vazia', ''],
    ['parcial', '0000-00-00'],
    ['ano de um dígito', '0008-01-01'],
    ['texto inválido', 'abc'],
    ['incompleta', '2026-1'],
  ])('não lança com data de vencimento %s', (_rotulo, dueDate) => {
    const executar = () =>
      calculateOperation(
        baseInput({
          compensationDays: 2,
          receivables: [
            { id: '1', documentNumber: '001', nominalAmountCents: 1_000_000, dueDate },
          ],
        }),
      );
    expect(executar).not.toThrow();
    const r = executar();
    expect(Number.isFinite(r.netAmountCents)).toBe(true);
    expect(Number.isFinite(r.discountAmountCents)).toBe(true);
  });

  it('data da operação inválida também não quebra o cálculo', () => {
    const executar = () =>
      calculateOperation(
        baseInput({
          operationDate: '',
          compensationDays: 2,
          receivables: [
            { id: '1', documentNumber: '001', nominalAmountCents: 1_000_000, dueDate: '2026-10-25' },
          ],
        }),
      );
    expect(executar).not.toThrow();
    expect(executar().receivables[0].days).toBe(0);
  });

  it('título com data vazia não contamina o total da operação', () => {
    const r = calculateOperation(
      baseInput({
        compensationDays: 2,
        receivables: [
          { id: '1', documentNumber: '001', nominalAmountCents: 1_000_000, dueDate: '2026-09-28' },
          { id: '2', documentNumber: '002', nominalAmountCents: 500_000, dueDate: '' },
        ],
      }),
    );
    expect(Number.isFinite(r.nominalAmountCents)).toBe(true);
    expect(r.nominalAmountCents).toBe(1_500_000);
    // O título válido segue calculado normalmente (45 + 2 dias)
    expect(r.receivables[0].days).toBe(47);
    expect(r.receivables[1].days).toBe(0);
    expect(Number.isFinite(r.netAmountCents)).toBe(true);
  });

  // ---- Compensação em dias úteis ----

  it('em dias úteis, vencimento na sexta com D+2 compensa na terça', () => {
    const titulo = [
      // 11/09/2026 é sexta-feira
      { id: '1', documentNumber: '001', nominalAmountCents: 1_000_000, dueDate: '2026-09-11' },
    ];
    const corridos = calculateOperation(
      baseInput({ operationDate: '2026-09-08', compensationDays: 2, compensationMode: 'calendar', receivables: titulo }),
    );
    const uteis = calculateOperation(
      baseInput({ operationDate: '2026-09-08', compensationDays: 2, compensationMode: 'business', receivables: titulo }),
    );

    expect(corridos.receivables[0].compensationDate).toBe('2026-09-13'); // domingo
    expect(uteis.receivables[0].compensationDate).toBe('2026-09-15'); // terça
    // Dois dias a mais de prazo → mais deságio, menos líquido
    expect(uteis.receivables[0].days).toBe(corridos.receivables[0].days + 2);
    expect(uteis.netAmountCents).toBeLessThan(corridos.netAmountCents);
  });

  it('em dias úteis, vencimento na quinta com D+2 compensa na segunda', () => {
    const result = calculateOperation(
      baseInput({
        operationDate: '2026-09-08',
        compensationDays: 2,
        compensationMode: 'business',
        receivables: [
          { id: '1', documentNumber: '001', nominalAmountCents: 1_000_000, dueDate: '2026-09-10' },
        ],
      }),
    );
    expect(result.receivables[0].compensationDate).toBe('2026-09-14');
  });

  it('sem critério informado, mantém dias corridos (operações antigas não mudam)', () => {
    const result = calculateOperation(
      baseInput({
        operationDate: '2026-09-08',
        compensationDays: 2,
        receivables: [
          { id: '1', documentNumber: '001', nominalAmountCents: 1_000_000, dueDate: '2026-09-11' },
        ],
      }),
    );
    expect(result.receivables[0].compensationDate).toBe('2026-09-13');
  });

  it('dias úteis também não quebram com data inválida', () => {
    const executar = () =>
      calculateOperation(
        baseInput({
          compensationDays: 2,
          compensationMode: 'business',
          receivables: [{ id: '1', documentNumber: '001', nominalAmountCents: 1_000_000, dueDate: '' }],
        }),
      );
    expect(executar).not.toThrow();
    expect(executar().receivables[0].days).toBe(0);
  });
});
