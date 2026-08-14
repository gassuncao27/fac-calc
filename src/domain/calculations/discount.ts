import { roundCents } from '../money';

export interface SimpleDiscountArgs {
  nominalAmountCents: number;
  /** Taxa mensal em percentual (3 = 3% a.m.) */
  monthlyRate: number;
  days: number;
  /** Base de dias do mês comercial (padrão 30) */
  dayBase: number;
}

/**
 * Desconto simples por taxa mensal ("por fora"):
 *   desconto = valorNominal × taxaMensal × dias / baseDias
 * O arredondamento para centavos ocorre apenas no resultado final.
 */
export function simpleDiscountCents({ nominalAmountCents, monthlyRate, days, dayBase }: SimpleDiscountArgs): number {
  if (days <= 0 || nominalAmountCents <= 0 || monthlyRate <= 0) return 0;
  return roundCents((nominalAmountCents * (monthlyRate / 100) * days) / dayBase);
}
