/**
 * Valores monetários são representados internamente em CENTAVOS (inteiros),
 * evitando erros de precisão de ponto flutuante nas somas.
 * Arredondamentos acontecem apenas no resultado final de cada parcela de
 * cálculo (nunca em etapas intermediárias da fórmula).
 */

/** Arredonda um valor fracionário de centavos para o centavo mais próximo (meio para cima). */
export function roundCents(value: number): number {
  return Math.round(value + Number.EPSILON * Math.sign(value));
}

export function centsToNumber(cents: number): number {
  return cents / 100;
}

export function numberToCents(value: number): number {
  return roundCents(value * 100);
}
