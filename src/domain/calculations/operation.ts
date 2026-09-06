import type { CalculationMethod } from '../../types/models';
import { addDaysISO, countDays } from '../dayCount';
import { roundCents } from '../money';
import { averageTermDays } from './averageTerm';
import { buildOperationCashflows } from './cashflows';
import { effectiveMonthlyRate, monthlyToAnnual } from './effectiveRate';
import { calculateIof } from './iof';
import { getDiscountMethod } from './methods';

export interface ReceivableCalcInput {
  id: string;
  documentNumber: string;
  nominalAmountCents: number;
  dueDate: string; // yyyy-MM-dd
  expensesCents?: number;
  notes?: string;
}

export interface OperationCalcInput {
  operationDate: string; // yyyy-MM-dd
  monthlyRate: number; // % a.m.
  dayBase: number;
  method: CalculationMethod;
  fixedFeeCents: number;
  percentageFee: number; // % sobre o nominal
  otherExpensesCents: number;
  /**
   * Compensação D+x: dias somados ao vencimento de cada título até o dinheiro
   * ficar disponível. Alonga o prazo, aumenta o deságio e reduz o líquido.
   */
  compensationDays?: number;
  /** IOF incide nesta operação? (padrão: não) */
  iofEnabled?: boolean;
  /** Alíquota diária do IOF em % (0.0082 = 0,0082% a.d.) */
  iofDailyRate?: number;
  /** Alíquota adicional do IOF em % (0.95 = 0,95%) */
  iofAdditionalRate?: number;
  receivables: ReceivableCalcInput[];
}

export interface ReceivableCalcResult extends ReceivableCalcInput {
  /** Data em que o título compensa (vencimento + D+x) */
  compensationDate: string;
  /** Dias até o vencimento (sem a compensação) */
  dueDays: number;
  /** Dias até a compensação — é o prazo usado no cálculo */
  days: number;
  rate: number;
  discountAmountCents: number;
  expensesCents: number;
  netAmountCents: number;
}

export interface OperationCalcResult {
  nominalAmountCents: number;
  averageTermDays: number;
  discountAmountCents: number;
  /** Tarifa fixa + tarifa percentual */
  feesAmountCents: number;
  /** Outras despesas da operação + despesas por título */
  expensesAmountCents: number;
  /** IOF total (principal + adicional); zero quando não incide */
  iofAmountCents: number;
  /** IOF por prazo */
  iofPrincipalCents: number;
  /** IOF adicional */
  iofAdditionalCents: number;
  /** Base sobre a qual o IOF foi apurado (líquido antes do IOF) */
  iofBaseCents: number;
  netAmountCents: number;
  effectiveMonthlyRate: number | null; // % a.m.
  effectiveAnnualRate: number | null; // % a.a.
  receivables: ReceivableCalcResult[];
}

/**
 * Motor central de cálculo da operação. Toda a interface consome apenas
 * esta função — as fórmulas nunca ficam acopladas aos componentes.
 */
export function calculateOperation(input: OperationCalcInput): OperationCalcResult {
  const method = getDiscountMethod(input.method);

  const compensationDays = Math.max(0, Math.trunc(input.compensationDays ?? 0));

  const receivables: ReceivableCalcResult[] = input.receivables.map((r) => {
    const compensationDate = addDaysISO(r.dueDate, compensationDays);
    const dueDays = Math.max(0, countDays(input.operationDate, r.dueDate));
    // O prazo que remunera a operação vai até a compensação, não até o vencimento.
    const days = Math.max(0, countDays(input.operationDate, compensationDate));
    const discountAmountCents = method.discountCents({
      nominalAmountCents: r.nominalAmountCents,
      monthlyRate: input.monthlyRate,
      days,
      dayBase: input.dayBase,
    });
    const expensesCents = r.expensesCents ?? 0;
    return {
      ...r,
      compensationDate,
      dueDays,
      days,
      rate: input.monthlyRate,
      discountAmountCents,
      expensesCents,
      netAmountCents: r.nominalAmountCents - discountAmountCents - expensesCents,
    };
  });

  const nominalAmountCents = receivables.reduce((sum, r) => sum + r.nominalAmountCents, 0);
  const discountAmountCents = receivables.reduce((sum, r) => sum + r.discountAmountCents, 0);
  const receivableExpensesCents = receivables.reduce((sum, r) => sum + r.expensesCents, 0);

  const percentageFeeCents = roundCents(nominalAmountCents * (input.percentageFee / 100));
  const feesAmountCents = input.fixedFeeCents + percentageFeeCents;
  const expensesAmountCents = input.otherExpensesCents + receivableExpensesCents;

  // Líquido antes do IOF — é também a base de cálculo do imposto.
  const netBeforeIofCents =
    nominalAmountCents - discountAmountCents - feesAmountCents - expensesAmountCents;

  const iof = input.iofEnabled
    ? calculateIof({
        baseCents: netBeforeIofCents,
        dailyRate: input.iofDailyRate ?? 0,
        additionalRate: input.iofAdditionalRate ?? 0,
        // Rateia a base entre os títulos pelo líquido que cada um gera,
        // pois o IOF por prazo depende dos dias de cada título.
        items: receivables.map((r) => ({ days: r.days, weightCents: r.netAmountCents })),
      })
    : { principalCents: 0, additionalCents: 0, totalCents: 0 };

  const netAmountCents = netBeforeIofCents - iof.totalCents;

  const term = averageTermDays(receivables);

  let effMonthly: number | null = null;
  let effAnnual: number | null = null;
  if (netAmountCents > 0 && receivables.length > 0) {
    const cashflows = buildOperationCashflows(
      input.operationDate,
      netAmountCents,
      receivables.map((r) => ({
        settlementDate: r.compensationDate,
        nominalAmountCents: r.nominalAmountCents,
      })),
    );
    const monthly = effectiveMonthlyRate(cashflows);
    if (monthly !== null && Number.isFinite(monthly)) {
      effMonthly = monthly * 100;
      effAnnual = monthlyToAnnual(monthly) * 100;
    }
  }

  return {
    nominalAmountCents,
    averageTermDays: term,
    discountAmountCents,
    feesAmountCents,
    expensesAmountCents,
    iofAmountCents: iof.totalCents,
    iofPrincipalCents: iof.principalCents,
    iofAdditionalCents: iof.additionalCents,
    iofBaseCents: input.iofEnabled ? netBeforeIofCents : 0,
    netAmountCents,
    effectiveMonthlyRate: effMonthly,
    effectiveAnnualRate: effAnnual,
    receivables,
  };
}
