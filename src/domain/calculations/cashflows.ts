import { countDays } from '../dayCount';

export interface Cashflow {
  /** Data do fluxo (yyyy-MM-dd) */
  date: string;
  /** Valor em centavos. Negativo = saída de caixa; positivo = entrada. */
  amountCents: number;
}

/**
 * Monta os fluxos de caixa da operação sob a ótica da factoring:
 * - na data da operação, sai o valor líquido entregue ao cliente;
 * - em cada vencimento, entra o valor nominal do título.
 */
export function buildOperationCashflows(
  operationDate: string,
  netAmountCents: number,
  receivables: { dueDate: string; nominalAmountCents: number }[],
): Cashflow[] {
  return [
    { date: operationDate, amountCents: -netAmountCents },
    ...receivables.map((r) => ({ date: r.dueDate, amountCents: r.nominalAmountCents })),
  ];
}

/** Converte fluxos datados em pares (dias desde o primeiro fluxo, valor). */
export function toDayOffsets(cashflows: Cashflow[]): { days: number; amountCents: number }[] {
  if (cashflows.length === 0) return [];
  const firstDate = cashflows.reduce((min, cf) => (cf.date < min ? cf.date : min), cashflows[0].date);
  return cashflows.map((cf) => ({ days: countDays(firstDate, cf.date), amountCents: cf.amountCents }));
}
