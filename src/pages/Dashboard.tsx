import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, Calculator, Plus } from 'lucide-react';
import { db } from '../db/database';
import { APP_NAME } from '../constants';
import { MetricCard } from '../components/ui/MetricCard';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { formatCents, formatDate, formatDays } from '../utils/format';

const RECENT_LIMIT = 8;

export function DashboardPage() {
  const operations = useLiveQuery(
    () => db.operations.orderBy('createdAt').reverse().limit(RECENT_LIMIT).toArray(),
    [],
  );
  const stats = useLiveQuery(async () => {
    const all = await db.operations.toArray();
    const active = all.filter((op) => op.status !== 'cancelada');
    const nominal = active.reduce((sum, op) => sum + op.nominalAmountCents, 0);
    const net = active.reduce((sum, op) => sum + op.netAmountCents, 0);
    const withNominal = active.filter((op) => op.nominalAmountCents > 0);
    const avgTerm =
      withNominal.length > 0
        ? withNominal.reduce((sum, op) => sum + op.averageTermDays * op.nominalAmountCents, 0) /
          withNominal.reduce((sum, op) => sum + op.nominalAmountCents, 0)
        : 0;
    return { count: all.length, nominal, net, avgTerm };
  }, []);
  const clients = useLiveQuery(() => db.clients.toArray(), [], []);

  if (!operations || !stats) {
    return <p className="py-20 text-center text-sm text-slate-400">Carregando…</p>;
  }

  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name ?? 'Sem cliente';

  if (stats.count === 0) {
    return (
      <div className="mx-auto max-w-xl pt-10 md:pt-20">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{APP_NAME}</h1>
          <p className="mt-2 text-slate-500">Calcule operações de recebíveis de forma simples.</p>
        </div>
        <div className="mt-10">
          <EmptyState
            icon={<Calculator className="size-10" />}
            title="Comece criando sua primeira operação."
            description="Adicione títulos, veja o valor líquido em tempo real e salve tudo no próprio aparelho."
            action={
              <Link to="/operacoes/nova">
                <Button size="lg">
                  <Plus className="size-5" />
                  Nova operação
                </Button>
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Início</h1>
          <p className="mt-0.5 text-sm text-slate-500">Resumo das suas operações.</p>
        </div>
        <Link to="/operacoes/nova">
          <Button size="lg">
            <Plus className="size-5" />
            Nova operação
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Operações" value={String(stats.count)} />
        <MetricCard label="Volume nominal" value={formatCents(stats.nominal)} hint="Exclui canceladas" />
        <MetricCard label="Valor líquido" value={formatCents(stats.net)} hint="Exclui canceladas" />
        <MetricCard label="Prazo médio" value={formatDays(stats.avgTerm)} hint="Ponderado pelo nominal" />
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[12px] font-semibold uppercase tracking-widest text-slate-400">
            Operações recentes
          </h2>
          <Link
            to="/operacoes"
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Ver todas
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <ul className="divide-y divide-slate-50">
            {operations.map((op) => (
              <li key={op.id}>
                <Link
                  to={`/operacoes/${op.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{clientName(op.clientId)}</p>
                    <p className="mt-0.5 truncate text-[13px] text-slate-400">
                      {op.operationNumber} · {formatDate(op.operationDate)}
                    </p>
                  </div>
                  <StatusBadge status={op.status} />
                  <div className="tabular shrink-0 text-right">
                    <p className="font-semibold text-slate-900">{formatCents(op.netAmountCents)}</p>
                    <p className="text-[13px] text-slate-400">{formatCents(op.nominalAmountCents)} bruto</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
