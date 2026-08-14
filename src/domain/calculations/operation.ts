import type { CalculationMethod } from '../../types/models';
import { countDays } from '../dayCount';
import { roundCents } from '../money';
import { averageTermDays } from './averageTerm';
import { buildOperationCashflows } from './cashflows';
import { effectiveMonthlyRate, monthlyToAnnual } from './effectiveRate';
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
  receivables: ReceivableCalcInput[];
}

export interface ReceivableCalcResult extends ReceivableCalcInput {
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

  const receivables: ReceivableCalcResult[] = input.receivables.map((r) => {
    const days = Math.max(0, countDays(input.operationDate, r.dueDate));
    const discountAmountCents = method.discountCents({
      nominalAmountCents: r.nominalAmountCents,
      monthlyRate: input.monthlyRate,
      days,
      dayBase: input.dayBase,
    });
    const expensesCents = r.expensesCents ?? 0;
    return {
      ...r,
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

  const netAmountCents = nominalAmountCents - discountAmountCents - feesAmountCents - expensesAmountCents;

  const term = averageTermDays(receivables);

  let effMonthly: number | null = null;
  let effAnnual: number | null = null;
  if (netAmountCents > 0 && receivables.length > 0) {
    const cashflows = buildOperationCashflows(input.operationDate, netAmountCents, receivables);
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
    netAmountCents,
    effectiveMonthlyRate: effMonthly,
    effectiveAnnualRate: effAnnual,
    receivables,
  };
}
