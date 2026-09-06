import type { OperationStatus, OperationType, Settings } from '../types/models';

export const APP_NAME = 'FactorCalc';

export const OPERATION_TYPES: { value: OperationType; label: string }[] = [
  { value: 'duplicata', label: 'Duplicata' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'nota_promissoria', label: 'Nota promissória' },
  { value: 'outro', label: 'Outro' },
];

export const OPERATION_STATUSES: { value: OperationStatus; label: string }[] = [
  { value: 'simulacao', label: 'Simulação' },
  { value: 'fechada', label: 'Fechada' },
  { value: 'cancelada', label: 'Cancelada' },
];

export const DAY_BASES = [30, 360] as const;

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  companyName: '',
  companyDocument: '',
  isFactoring: false,
  // Pré-preenchido; confira as alíquotas vigentes em Configurações.
  iofDailyRate: 0.0082,
  iofAdditionalRate: 0.95,
  defaultCompensationDays: 2,
  defaultRate: 3,
  defaultDayBase: 30,
  defaultFixedFeeCents: 0,
  defaultPercentageFee: 0,
  defaultCalculationMethod: 'simple_monthly',
  decimalPlaces: 2,
  pinEnabled: false,
  pinHash: null,
  operationCounters: {},
};

export function operationTypeLabel(type: OperationType): string {
  return OPERATION_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function operationStatusLabel(status: OperationStatus): string {
  return OPERATION_STATUSES.find((s) => s.value === status)?.label ?? status;
}
