import type { OperationCalcResult } from '../domain/calculations/operation';
import { formatCents, formatDays, formatPercent } from '../utils/format';

interface OperationSummaryProps {
  result: OperationCalcResult;
  monthlyRate: number;
  decimalPlaces?: number;
  compensationDays?: number;
}

function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-[13px] text-slate-500">{label}</span>
      <span className={`tabular text-base font-medium ${muted ? 'text-slate-500' : 'text-slate-900'}`}>
        {value}
      </span>
    </div>
  );
}

/** Painel de resumo com o VALOR LÍQUIDO em destaque máximo. */
export function OperationSummary({
  result,
  monthlyRate,
  decimalPlaces = 2,
  compensationDays = 0,
}: OperationSummaryProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6">
      <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-slate-400">Resumo</h2>

      <Row label="Valor nominal" value={formatCents(result.nominalAmountCents)} />
      <Row label="Prazo médio" value={formatDays(result.averageTermDays)} />
      {compensationDays > 0 && <Row label="Compensação" value={`D + ${compensationDays}`} muted />}
      <Row label="Taxa comercial" value={`${formatPercent(monthlyRate, decimalPlaces)} a.m.`} />
      <Row label="Deságio" value={`− ${formatCents(result.discountAmountCents)}`} muted />
      <Row label="Tarifas" value={`− ${formatCents(result.feesAmountCents)}`} muted />
      <Row label="Outras despesas" value={`− ${formatCents(result.expensesAmountCents)}`} muted />
      {result.iofAmountCents > 0 && (
        <Row label="IOF" value={`− ${formatCents(result.iofAmountCents)}`} muted />
      )}

      <div className="my-4 border-t border-slate-100" />

      <p className="text-[12px] font-semibold uppercase tracking-widest text-slate-400">Valor líquido</p>
      <p className="tabular mt-1 text-[34px] font-semibold leading-tight tracking-tight text-slate-900">
        {formatCents(result.netAmountCents)}
      </p>

      <div className="my-4 border-t border-slate-100" />

      <Row
        label="Taxa efetiva"
        value={
          result.effectiveMonthlyRate === null
            ? '—'
            : `${formatPercent(result.effectiveMonthlyRate, decimalPlaces)} a.m.`
        }
      />
      <Row
        label="Taxa efetiva anual (base 360)"
        value={
          result.effectiveAnnualRate === null
            ? '—'
            : `${formatPercent(result.effectiveAnnualRate, decimalPlaces)} a.a.`
        }
      />
      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
        Taxa comercial é a contratada no desconto. Taxa efetiva é a taxa implícita dos fluxos
        financeiros, calculada sobre o valor líquido entregue — mês comercial de 30 dias e
        anualização composta em base 360.
        {compensationDays > 0 && ' Os prazos vão até a compensação, não até o vencimento.'}
      </p>
    </div>
  );
}
