import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ArrowUp, History, Plus, Search } from 'lucide-react';
import { db } from '../db/database';
import { operationTypeLabel } from '../constants';
import { PageHeader } from '../components/ui/PageHeader';
import { TextInput } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatCents, formatDate, formatNumber, formatPercent } from '../utils/format';
import { useMediaQuery } from '../hooks/useMediaQuery';

type SortKey = 'operationDate' | 'operationNumber' | 'nominalAmountCents' | 'netAmountCents' | 'averageTermDays';

/**
 * São 9 colunas, três delas monetárias: a tabela só fica legível com
 * ~1050px de container (viewport − sidebar 240 − respiro 64).
 * Abaixo disso, cartões.
 */
const TABLE_QUERY = '(min-width: 1360px)';

const COLUMNS: { key: SortKey; label: string; align?: 'right' }[] = [
  { key: 'operationNumber', label: 'Número' },
  { key: 'operationDate', label: 'Data' },
  { key: 'nominalAmountCents', label: 'Valor nominal', align: 'right' },
  { key: 'netAmountCents', label: 'Valor líquido', align: 'right' },
  { key: 'averageTermDays', label: 'Prazo', align: 'right' },
];

export function OperationsListPage() {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('operationDate');
  const [sortAsc, setSortAsc] = useState(false);
  const navigate = useNavigate();
  const compact = !useMediaQuery(TABLE_QUERY);

  const operations = useLiveQuery(() => db.operations.toArray(), []);
  const clients = useLiveQuery(() => db.clients.toArray(), [], []);

  const clientName = useMemo(() => {
    const map = new Map(clients.map((c) => [c.id, c.name]));
    return (id: string | null) => (id ? (map.get(id) ?? 'Sem cliente') : 'Sem cliente');
  }, [clients]);

  const filtered = useMemo(() => {
    if (!operations) return [];
    const q = query.trim().toLowerCase();
    const list = q
      ? operations.filter((op) =>
          [op.operationNumber, clientName(op.clientId), operationTypeLabel(op.operationType), formatDate(op.operationDate)]
            .join(' ')
            .toLowerCase()
            .includes(q),
        )
      : [...operations];
    list.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [operations, query, sortKey, sortAsc, clientName]);

  if (!operations) {
    return <p className="py-20 text-center text-sm text-slate-400">Carregando…</p>;
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(key === 'operationNumber');
    }
  }

  return (
    <div>
      <PageHeader
        title="Operações"
        subtitle={`${operations.length} ${operations.length === 1 ? 'operação registrada' : 'operações registradas'}`}
        actions={
          <Link to="/operacoes/nova">
            <Button>
              <Plus className="size-4" />
              Nova operação
            </Button>
          </Link>
        }
      />

      {operations.length === 0 ? (
        <EmptyState
          icon={<History className="size-10" />}
          title="Nenhuma operação cadastrada."
          description="Crie a primeira operação para vê-la aqui no histórico."
          action={
            <Link to="/operacoes/nova">
              <Button>
                <Plus className="size-4" />
                Nova operação
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="relative mb-4 max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar por número, cliente, tipo…"
              className="pl-10"
              aria-label="Pesquisar operações"
            />
          </div>

          {compact ? (
            <ul className="space-y-3">
              {filtered.map((op) => (
                <li key={op.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/operacoes/${op.id}`)}
                    className="w-full rounded-2xl border border-slate-200/80 bg-white p-4 text-left transition-colors hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{clientName(op.clientId)}</p>
                        <p className="mt-0.5 text-[13px] text-slate-400">
                          {op.operationNumber} · {formatDate(op.operationDate)} · {operationTypeLabel(op.operationType)}
                        </p>
                      </div>
                      <StatusBadge status={op.status} />
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-sm lg:grid-cols-4">
                      <div>
                        <dt className="text-[12px] text-slate-400">Nominal</dt>
                        <dd className="tabular font-medium text-slate-700">{formatCents(op.nominalAmountCents)}</dd>
                      </div>
                      <div>
                        <dt className="text-[12px] text-slate-400">Líquido</dt>
                        <dd className="tabular font-semibold text-slate-900">{formatCents(op.netAmountCents)}</dd>
                      </div>
                      <div>
                        <dt className="text-[12px] text-slate-400">Prazo</dt>
                        <dd className="tabular font-medium text-slate-700">{formatNumber(op.averageTermDays, 1)} dias</dd>
                      </div>
                      <div>
                        <dt className="text-[12px] text-slate-400">Taxa</dt>
                        <dd className="tabular font-medium text-slate-700">{formatPercent(op.monthlyRate)} a.m.</dd>
                      </div>
                    </dl>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center text-sm text-slate-400">
                  Nenhuma operação encontrada para “{query}”.
                </li>
              )}
            </ul>
          ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[13%]" />
                  <col className="w-[9%]" />
                  <col className="w-[14%]" />
                  <col className="w-[9%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[7%]" />
                  <col className="w-[9%]" />
                  <col className="w-[11%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[12px] uppercase tracking-wide text-slate-400">
                    {COLUMNS.slice(0, 2).map((col) => (
                      <th key={col.key} className="px-3 py-3.5 font-medium">
                        <button
                          type="button"
                          onClick={() => toggleSort(col.key)}
                          className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-600"
                        >
                          {col.label}
                          {sortKey === col.key && (sortAsc ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                        </button>
                      </th>
                    ))}
                    <th className="px-3 py-3.5 font-medium">Cliente</th>
                    <th className="px-3 py-3.5 font-medium">Tipo</th>
                    {COLUMNS.slice(2).map((col) => (
                      <th key={col.key} className="px-3 py-3.5 text-right font-medium">
                        <button
                          type="button"
                          onClick={() => toggleSort(col.key)}
                          className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-600"
                        >
                          {col.label}
                          {sortKey === col.key && (sortAsc ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                        </button>
                      </th>
                    ))}
                    <th className="px-3 py-3.5 text-right font-medium">Taxa</th>
                    <th className="px-3 py-3.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((op) => (
                    <tr
                      key={op.id}
                      onClick={() => navigate(`/operacoes/${op.id}`)}
                      className="cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-3 py-4 font-medium text-slate-900">{op.operationNumber}</td>
                      <td className="tabular whitespace-nowrap px-3 py-4 text-slate-600">{formatDate(op.operationDate)}</td>
                      <td className="max-w-48 truncate px-3 py-4 text-slate-700">{clientName(op.clientId)}</td>
                      <td className="px-3 py-4 text-slate-500">{operationTypeLabel(op.operationType)}</td>
                      <td className="tabular px-3 py-4 text-right text-slate-700">{formatCents(op.nominalAmountCents)}</td>
                      <td className="tabular px-3 py-4 text-right font-medium text-slate-900">{formatCents(op.netAmountCents)}</td>
                      <td className="tabular px-3 py-4 text-right text-slate-500">{formatNumber(op.averageTermDays, 1)}d</td>
                      <td className="tabular px-3 py-4 text-right text-slate-500">{formatPercent(op.monthlyRate)}</td>
                      <td className="px-3 py-4">
                        <StatusBadge status={op.status} />
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-5 py-10 text-center text-slate-400">
                        Nenhuma operação encontrada para “{query}”.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
