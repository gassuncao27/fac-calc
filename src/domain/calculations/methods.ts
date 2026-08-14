import type { CalculationMethod } from '../../types/models';
import { simpleDiscountCents, type SimpleDiscountArgs } from './discount';

/**
 * Registro de métodos de cálculo de desconto.
 * Para adicionar um novo método (desconto composto, taxa por dentro, fator...):
 *   1. adicione o literal em CalculationMethod (types/models.ts);
 *   2. registre a implementação aqui.
 * Nada mais na aplicação precisa mudar.
 */
export interface DiscountMethod {
  id: CalculationMethod;
  label: string;
  discountCents(args: SimpleDiscountArgs): number;
}

export const DISCOUNT_METHODS: Record<CalculationMethod, DiscountMethod> = {
  simple_monthly: {
    id: 'simple_monthly',
    label: 'Desconto simples por taxa mensal',
    discountCents: simpleDiscountCents,
  },
};

export function getDiscountMethod(id: CalculationMethod): DiscountMethod {
  return DISCOUNT_METHODS[id] ?? DISCOUNT_METHODS.simple_monthly;
}
