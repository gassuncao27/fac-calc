import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Copy, FileDown, Pencil, Sheet, Trash2 } from 'lucide-react';
import { db } from '../db/database';
import {
  deleteOperation,
  duplicateOperation,
  updateOperationStatus,
} from '../services/operationService';
import { exportReceivablesCsv } from '../services/csvService';
import { getSettings } from '../services/settingsService';
import { OPERATION_STATUSES, operationTypeLabel } from '../constants';
import type { OperationStatus } from '../types/models';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Field';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useToast } from '../components/ui/Toast';
import { formatCents, formatDate, formatDays, formatPercent } from '../utils/format';

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] font-medium text-slate-400">{label}</p>
      <p className="mt-0.5 font-medium text-slate-900">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-1.5">
      <span className={`text-[13px] ${strong ? 'font-semibold uppercase tracking-widest text-slate-400' : 'text-slate-500'}`}>
        {label}
      </span>
      <span className={`tabular font-medium ${strong ? 'text-xl font-semibold text-slate-900' : 'text-slate-900'}`}>
        {value}
      </span>
    </div>
  );
}

export function OperationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const data = useLiveQuery(async () => {
    if (!id) return null;
    const operation = await db.operations.get(id);
    if (!operation) return { missing: true as const };
    const [receivables, client] = await Promise.all([
      db.receivables.where('operationId').equals(id).sortBy('dueDate'),
      operation.clientId ? db.clients.get(operation.clientId) : Promise.resolve(undefined),
    ]);
    return { operation, receivables, client: client ?? null };
  }, [id]);

  if (!data) return <p className="py-20 text-center text-sm text-slate-400">Carregando…</p>;
  if ('missing' in data) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-500">Operação não encontrada.</p>
        <Link to="/operacoes" className="mt-3 inline-block text-sm font-medium text-slate-900 underline">
          Voltar ao histórico
        </Link>
      </div>
    );
  }

  const { operation, receivables, client } = data;

  async function handleStatus(status: OperationStatus) {
    try {
      await updateOperationStatus(operation.id, status);
      toast('Status atualizado.');
    } catch (error) {
      console.error(error);
      toast('Não foi possível atualizar o status.', 'error');
    }
  }

  async function handleDuplicate() {
    try {
      const copy = await duplicateOperation(operation.id);
      if (copy) {
        toast(`Operação duplicada como ${copy.operationNumber}.`);
        navigate(`/operacoes/${copy.id}/editar`);
      }
    } catch (error) {
      console.error(error);
      toast('Não foi possível duplicar a operação.', 'error');
    }
  }

  async function handleDelete() {
    try {
      await deleteOperation(operation.id);
      toast('Operação excluída.');
      navigate('/operacoes');
    } catch (error) {
      console.error(error);
      toast('Não foi possível excluir a operação.', 'error');
    }
  }

  async function handlePdf() {
    try {
      const { generateOperationPdf } = await import('../services/pdfService');
      const settings = await getSettings();
      generateOperationPdf(operation, receivables, client, settings);
    } catch (error) {
      console.error(error);
      toast('Não foi possível gerar o arquivo. Tente novamente.', 'error');
    }
  }

  function handleCsv() {
    try {
      exportReceivablesCsv(operation, receivables);
    } catch (error) {
      console.error(error);
      toast('Não foi possível gerar o arquivo. Tente novamente.', 'error');
    }
  }

  return (
    <div>
      <Link
        to="/operacoes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="size-4" />
        Operações
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{operation.operationNumber}</h1>
          <StatusBadge status={operation.status} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-44">
            <Select
              value={operation.status}
              onChange={(e) => handleStatus(e.target.value as OperationStatus)}
              aria-label="Alterar status"
            >
              {OPERATION_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <Button variant="secondary" onClick={() => navigate(`/operacoes/${operation.id}/editar`)}>
            <Pencil className="size-4" />
            Editar
          </Button>
          <Button variant="secondary" onClick={handleDuplicate}>
            <Copy className="size-4" />
            Duplicar
          </Button>
          <Button variant="secondary" onClick={handlePdf}>
            <FileDown className="size-4" />
            PDF
          </Button>
          <Button variant="secondary" onClick={handleCsv}>
            <Sheet className="size-4" />
            CSV
          </Button>
          <Button variant="secondary" onClick={() => setConfirmDelete(true)} className="text-red-600">
            <Trash2 className="size-4" />
            Excluir
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6">
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
              <InfoItem label="Cliente" value={client?.name ?? 'Sem cliente'} />
              <InfoItem label="Data da operação" value={formatDate(operation.operationDate)} />
              <InfoItem label="Tipo" value={operationTypeLabel(operation.operationType)} />
              <InfoItem label="Taxa comercial" value={`${formatPercent(operation.monthlyRate)} a.m.`} />
              <InfoItem label="Base de cálculo" value={`${operation.dayBase} dias`} />
              <InfoItem label="Criada em" value={formatDate(operation.createdAt.slice(0, 10))} />
            </div>
            {operation.notes && (
              <p className="mt-5 whitespace-pre-wrap border-t border-slate-100 pt-4 text-sm text-slate-600">
                {operation.notes}
              </p>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-slate-400">
              Títulos ({receivables.length})
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[12px] uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3 font-medium">Documento</th>
                    <th className="px-5 py-3 text-right font-medium">Valor nominal</th>
                    <th className="px-5 py-3 font-medium">Vencimento</th>
                    <th className="px-3 py-3 text-right font-medium">Dias</th>
                    <th className="px-5 py-3 text-right font-medium">Desconto</th>
                    <th className="px-5 py-3 text-right font-medium">Líquido</th>
                  </tr>
                </thead>
                <tbody>
                  {receivables.map((r) => (
                    <tr key={r.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-3.5 font-medium text-slate-900">{r.documentNumber || '—'}</td>
                      <td className="tabular px-5 py-3.5 text-right text-slate-700">{formatCents(r.nominalAmountCents)}</td>
                      <td className="tabular px-5 py-3.5 text-slate-600">{formatDate(r.dueDate)}</td>
                      <td className="tabular px-3 py-3.5 text-right text-slate-500">{r.days}</td>
                      <td className="tabular px-5 py-3.5 text-right text-slate-500">{formatCents(r.discountAmountCents)}</td>
                      <td className="tabular px-5 py-3.5 text-right font-medium text-slate-900">{formatCents(r.netAmountCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6">
            <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-slate-400">Resumo</h2>
            <SummaryRow label="Valor nominal" value={formatCents(operation.nominalAmountCents)} />
            <SummaryRow label="Prazo médio" value={formatDays(operation.averageTermDays)} />
            <SummaryRow label="Deságio" value={`− ${formatCents(operation.discountAmountCents)}`} />
            <SummaryRow label="Tarifas" value={`− ${formatCents(operation.totalFeesCents)}`} />
            <SummaryRow label="Outras despesas" value={`− ${formatCents(operation.totalExpensesCents)}`} />
            <div className="my-4 border-t border-slate-100" />
            <p className="text-[12px] font-semibold uppercase tracking-widest text-slate-400">Valor líquido</p>
            <p className="tabular mt-1 text-[30px] font-semibold leading-tight tracking-tight text-slate-900">
              {formatCents(operation.netAmountCents)}
            </p>
            <div className="my-4 border-t border-slate-100" />
            <SummaryRow
              label="Taxa efetiva"
              value={operation.effectiveMonthlyRate === null ? '—' : `${formatPercent(operation.effectiveMonthlyRate)} a.m.`}
            />
            <SummaryRow
              label="Taxa efetiva anual"
              value={operation.effectiveAnnualRate === null ? '—' : `${formatPercent(operation.effectiveAnnualRate)} a.a.`}
            />
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir operação"
        description={
          <>
            A operação <strong>{operation.operationNumber}</strong> e todos os seus títulos serão excluídos
            permanentemente. Essa ação não pode ser desfeita.
          </>
        }
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
