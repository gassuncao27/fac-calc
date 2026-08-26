import { roundCents } from '../money';

/**
 * IOF/Crédito em operações de desconto de títulos e factoring
 * (estrutura do Decreto 6.306/2007):
 *
 *   IOF principal = base × alíquota diária × dias   (dias limitados a 365)
 *   IOF adicional = base × alíquota adicional       (independe do prazo)
 *
 * Duas decisões importantes:
 *
 * 1. O principal é apurado POR TÍTULO, porque cada um tem prazo próprio.
 *    A base total é rateada entre os títulos na proporção do que cada um
 *    contribui para o líquido.
 *
 * 2. A base é o valor líquido entregue ao cedente apurado ANTES do próprio
 *    IOF (nominal − deságio − tarifas − despesas). Usar o líquido final
 *    criaria circularidade (o IOF entraria no cálculo do próprio IOF).
 *
 * As alíquotas mudam por decreto — por isso são parâmetros, nunca constantes
 * no código. Ficam em Configurações.
 */

/** O IOF principal incide sobre no máximo 365 dias de prazo. */
export const IOF_MAX_DAYS = 365;

export interface IofItem {
  /** Prazo do título em dias */
  days: number;
  /** Peso do título no rateio da base (seu líquido antes de tarifas) */
  weightCents: number;
}

export interface IofArgs {
  /** Base de cálculo total, em centavos (líquido antes do IOF) */
  baseCents: number;
  /** Alíquota diária em percentual (0.0082 = 0,0082% a.d.) */
  dailyRate: number;
  /** Alíquota adicional em percentual (0.95 = 0,95%) */
  additionalRate: number;
  items: IofItem[];
}

export interface IofResult {
  /** IOF por prazo (alíquota diária × dias) */
  principalCents: number;
  /** IOF adicional (alíquota fixa sobre a base) */
  additionalCents: number;
  totalCents: number;
}

const ZERO: IofResult = { principalCents: 0, additionalCents: 0, totalCents: 0 };

export function calculateIof({ baseCents, dailyRate, additionalRate, items }: IofArgs): IofResult {
  if (baseCents <= 0) return ZERO;

  const totalWeight = items.reduce((sum, item) => sum + Math.max(item.weightCents, 0), 0);

  // Principal: rateia a base entre os títulos e aplica os dias de cada um.
  let principalRaw = 0;
  if (totalWeight > 0 && dailyRate > 0) {
    principalRaw = items.reduce((sum, item) => {
      const weight = Math.max(item.weightCents, 0);
      if (weight <= 0) return sum;
      const itemBase = baseCents * (weight / totalWeight);
      const days = Math.min(Math.max(item.days, 0), IOF_MAX_DAYS);
      return sum + itemBase * (dailyRate / 100) * days;
    }, 0);
  }

  const principalCents = roundCents(principalRaw);
  const additionalCents = additionalRate > 0 ? roundCents(baseCents * (additionalRate / 100)) : 0;

  return { principalCents, additionalCents, totalCents: principalCents + additionalCents };
}
