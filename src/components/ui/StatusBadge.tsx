import type { OperationStatus } from '../../types/models';
import { operationStatusLabel } from '../../constants';

const STYLES: Record<OperationStatus, string> = {
  simulacao: 'bg-amber-50 text-amber-700 border-amber-200/70',
  fechada: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
  cancelada: 'bg-slate-100 text-slate-500 border-slate-200',
};

export function StatusBadge({ status }: { status: OperationStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {operationStatusLabel(status)}
    </span>
  );
}
