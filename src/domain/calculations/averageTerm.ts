export interface WeightedItem {
  nominalAmountCents: number;
  days: number;
}

/**
 * Prazo médio ponderado pelo valor nominal:
 *   Σ(valor × dias) / Σ(valor)
 */
export function averageTermDays(items: WeightedItem[]): number {
  const totalNominal = items.reduce((sum, item) => sum + item.nominalAmountCents, 0);
  if (totalNominal <= 0) return 0;
  const weighted = items.reduce((sum, item) => sum + item.nominalAmountCents * item.days, 0);
  return weighted / totalNominal;
}
