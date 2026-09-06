export type OperationType = 'duplicata' | 'cheque' | 'nota_promissoria' | 'outro';

export type OperationStatus = 'simulacao' | 'fechada' | 'cancelada';

/** Métodos de cálculo de desconto. Extensível: registre novos em domain/calculations/methods.ts */
export type CalculationMethod = 'simple_monthly';

/** Contagem de dias. V1 usa dias corridos; 'business' fica preparado para V2. */
export type DayCountMode = 'calendar' | 'business';

export interface Client {
  id: string;
  name: string;
  tradeName?: string;
  document?: string;
  phone?: string;
  email?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Operation {
  id: string;
  operationNumber: string;
  clientId: string | null;
  operationDate: string; // yyyy-MM-dd
  operationType: OperationType;
  status: OperationStatus;
  monthlyRate: number; // % a.m. (ex.: 3 = 3,00% a.m.)
  dayBase: number; // base de dias do desconto (padrão 30)
  calculationMethod: CalculationMethod;
  fixedFeeCents: number;
  percentageFee: number; // % sobre o valor nominal
  otherExpensesCents: number;
  /** Compensação D+x: dias somados ao vencimento até o dinheiro ficar disponível */
  compensationDays: number;
  /** IOF incidiu nesta operação? */
  iofEnabled: boolean;
  /** Alíquotas vigentes no momento do cálculo (ficam gravadas na operação) */
  iofDailyRate: number;
  iofAdditionalRate: number;
  iofPrincipalCents: number;
  iofAdditionalCents: number;
  iofAmountCents: number;
  nominalAmountCents: number;
  discountAmountCents: number;
  totalFeesCents: number;
  totalExpensesCents: number;
  netAmountCents: number;
  averageTermDays: number;
  effectiveMonthlyRate: number | null; // % a.m.
  effectiveAnnualRate: number | null; // % a.a.
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Receivable {
  id: string;
  operationId: string;
  documentNumber: string;
  nominalAmountCents: number;
  dueDate: string; // yyyy-MM-dd
  /** Vencimento + D+x — data em que o título compensa */
  compensationDate: string;
  /** Dias até a COMPENSAÇÃO (prazo usado no cálculo) */
  days: number;
  rate: number; // % a.m. aplicada
  discountAmountCents: number;
  expensesCents: number;
  netAmountCents: number;
  notes?: string;
}

export interface Settings {
  id: 'app';
  companyName: string;
  companyDocument: string;
  /** Empresa é factoring? Se sim, o IOF já vem marcado em novas operações. */
  isFactoring: boolean;
  /** Alíquota diária do IOF em % (muda por decreto — por isso é configurável) */
  iofDailyRate: number;
  /** Alíquota adicional do IOF em % */
  iofAdditionalRate: number;
  /** Compensação padrão de novas operações (D+x) */
  defaultCompensationDays: number;
  defaultRate: number;
  defaultDayBase: number;
  defaultFixedFeeCents: number;
  defaultPercentageFee: number;
  defaultCalculationMethod: CalculationMethod;
  decimalPlaces: number; // casas decimais para exibir taxas
  pinEnabled: boolean;
  pinHash: string | null;
  /** Contador local por ano para o número amigável OP-AAAA-NNNNNN */
  operationCounters: Record<string, number>;
}
