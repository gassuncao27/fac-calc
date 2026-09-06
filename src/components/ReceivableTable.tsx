import { useRef, type KeyboardEvent } from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { addDays, format, parseISO } from 'date-fns';
import type { ReceivableDraft } from '../services/operationService';
import type { ReceivableCalcResult } from '../domain/calculations/operation';
import { CurrencyInput } from './inputs/CurrencyInput';
import { DateInput } from './inputs/DateInput';
import { inputClass } from './ui/Field';
import { Button } from './ui/Button';
import { formatCents, formatDate } from '../utils/format';
import { generateId } from '../utils/id';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface ReceivableTableProps {
  rows: ReceivableDraft[];
  calcRows: ReceivableCalcResult[];
  operationDate: string;
  onChange: (rows: ReceivableDraft[]) => void;
}

const COLS = ['doc', 'value', 'due'] as const;
type Col = (typeof COLS)[number];

/**
 * A tabela precisa de ~880px de container para não cortar valores.
 * O container depende de dois descontos:
 *   - sidebar (240px) + respiro lateral (64px)  → sempre
 *   - painel de Resumo (340px + gap)            → só a partir de xl (1280px)
 * Daí as duas faixas: abaixo de xl basta 1184px de viewport; a partir de xl,
 * onde o Resumo fica ao lado, só sobra espaço a partir de 1548px.
 * Fora dessas faixas usamos cartões — melhor ao toque do que rolar na horizontal.
 */
const TABLE_QUERY = '(min-width: 1184px) and (max-width: 1279.98px), (min-width: 1548px)';

/**
 * Títulos da operação. Enter avança pelos campos como em uma planilha e
 * cria uma nova linha ao final. Dias, desconto e líquido são recalculados
 * a cada tecla pelo motor de domínio.
 */
export function ReceivableTable({ rows, calcRows, operationDate, onChange }: ReceivableTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const showTable = useMediaQuery(TABLE_QUERY);

  const calcById = new Map(calcRows.map((r) => [r.id, r]));

  function focusCell(row: number, col: Col) {
    requestAnimationFrame(() => {
      const el = containerRef.current?.querySelector<HTMLInputElement>(
        `[data-row="${row}"][data-col="${col}"]`,
      );
      el?.focus();
      el?.select?.();
    });
  }

  function newRow(): ReceivableDraft {
    const last = rows[rows.length - 1];
    return {
      id: generateId(),
      documentNumber: String(rows.length + 1).padStart(3, '0'),
      nominalAmountCents: 0,
      // sugere +30 dias sobre o último vencimento (ou sobre a data da operação)
      dueDate: last?.dueDate
        ? format(addDays(parseISO(last.dueDate), 30), 'yyyy-MM-dd')
        : format(addDays(parseISO(operationDate), 30), 'yyyy-MM-dd'),
      expensesCents: 0,
    };
  }

  function addRow() {
    const next = [...rows, newRow()];
    onChange(next);
    focusCell(next.length - 1, 'value');
  }

  function duplicateRow(index: number) {
    const copy: ReceivableDraft = { ...rows[index], id: generateId() };
    onChange([...rows.slice(0, index + 1), copy, ...rows.slice(index + 1)]);
    focusCell(index + 1, 'value');
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  function patchRow(index: number, patch: Partial<ReceivableDraft>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Enter') return;
    const target = e.target as HTMLElement;
    const rowAttr = target.getAttribute('data-row');
    const colAttr = target.getAttribute('data-col') as Col | null;
    if (rowAttr === null || colAttr === null) return;
    e.preventDefault();
    const row = Number(rowAttr);
    const colIndex = COLS.indexOf(colAttr);
    if (colIndex < COLS.length - 1) {
      focusCell(row, COLS[colIndex + 1]);
    } else if (row < rows.length - 1) {
      focusCell(row + 1, 'doc');
    } else {
      addRow();
    }
  }

  const empty = (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-12 text-center text-sm text-slate-400">
      Nenhum título ainda. Toque em “Adicionar título” para começar.
    </div>
  );

  function RowActions({ index }: { index: number }) {
    return (
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => duplicateRow(index)}
          aria-label={`Duplicar título ${index + 1}`}
          title="Duplicar"
          className="flex size-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <Copy className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => removeRow(index)}
          aria-label={`Excluir título ${index + 1}`}
          title="Excluir"
          className="flex size-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {rows.length === 0 && empty}

      {rows.length > 0 && showTable && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[11%]" />
              <col className="w-[20%]" />
              <col className="w-[18%]" />
              <col className="w-[6%]" />
              <col className="w-[15%]" />
              <col className="w-[20%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-100 text-left text-[12px] font-medium uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3 font-medium">Documento</th>
                <th className="px-3 py-3 text-right font-medium">Valor nominal</th>
                <th className="px-3 py-3 font-medium">Vencimento</th>
                <th className="px-2 py-3 text-right font-medium" title="Dias até a compensação">
                  Dias
                </th>
                <th className="px-3 py-3 text-right font-medium">Desconto</th>
                <th className="px-3 py-3 text-right font-medium">Líquido</th>
                <th className="px-2 py-3" aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const calc = calcById.get(row.id);
                return (
                  <tr key={row.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-1.5 py-1.5">
                      <input
                        type="text"
                        value={row.documentNumber}
                        data-row={index}
                        data-col="doc"
                        aria-label={`Documento do título ${index + 1}`}
                        onChange={(e) => patchRow(index, { documentNumber: e.target.value })}
                        className={`${inputClass} h-10 border-transparent bg-transparent px-2 shadow-none focus:bg-white`}
                      />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <CurrencyInput
                        valueCents={row.nominalAmountCents || null}
                        data-row={index}
                        data-col="value"
                        aria-label={`Valor nominal do título ${index + 1}`}
                        onChangeCents={(cents) => patchRow(index, { nominalAmountCents: cents ?? 0 })}
                        className="h-10 border-transparent bg-transparent px-2 shadow-none focus:bg-white"
                      />
                    </td>
                    <td className="px-1.5 py-1.5">
                      <DateInput
                        value={row.dueDate}
                        data-row={index}
                        data-col="due"
                        aria-label={`Vencimento do título ${index + 1}`}
                        onChangeValue={(date) => patchRow(index, { dueDate: date })}
                        className="h-10 border-transparent bg-transparent px-2 shadow-none focus:bg-white"
                      />
                    </td>
                    <td
                      className="tabular px-2 py-1.5 text-right text-slate-500"
                      title={
                        calc && calc.compensationDate !== calc.dueDate
                          ? `Vencimento ${formatDate(calc.dueDate)} + compensação = ${formatDate(calc.compensationDate)}`
                          : undefined
                      }
                    >
                      {calc?.days ?? '—'}
                    </td>
                    <td className="tabular truncate px-3 py-1.5 text-right text-slate-500">
                      {calc ? formatCents(calc.discountAmountCents) : '—'}
                    </td>
                    <td className="tabular truncate px-3 py-1.5 text-right font-medium text-slate-900">
                      {calc ? formatCents(calc.netAmountCents) : '—'}
                    </td>
                    <td className="px-1 py-1.5">
                      <RowActions index={index} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && !showTable && (
        <ul className="space-y-3">
          {rows.map((row, index) => {
            const calc = calcById.get(row.id);
            return (
              <li key={row.id} className="rounded-2xl border border-slate-200/80 bg-white p-4">
                <div className="flex items-end justify-between gap-3">
                  <label className="min-w-0 flex-1 sm:max-w-[240px]">
                    <span className="mb-1 block text-[12px] font-medium text-slate-500">Documento</span>
                    <input
                      type="text"
                      value={row.documentNumber}
                      data-row={index}
                      data-col="doc"
                      aria-label={`Documento do título ${index + 1}`}
                      onChange={(e) => patchRow(index, { documentNumber: e.target.value })}
                      className={inputClass}
                    />
                  </label>
                  <RowActions index={index} />
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-slate-500">Valor nominal</span>
                    <CurrencyInput
                      valueCents={row.nominalAmountCents || null}
                      data-row={index}
                      data-col="value"
                      aria-label={`Valor nominal do título ${index + 1}`}
                      onChangeCents={(cents) => patchRow(index, { nominalAmountCents: cents ?? 0 })}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-slate-500">Vencimento</span>
                    <DateInput
                      value={row.dueDate}
                      data-row={index}
                      data-col="due"
                      aria-label={`Vencimento do título ${index + 1}`}
                      onChangeValue={(date) => patchRow(index, { dueDate: date })}
                    />
                  </label>
                </div>

                <dl className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-slate-100 pt-3 text-sm">
                  <div className="flex items-baseline gap-1.5">
                    <dt className="text-slate-400">Dias</dt>
                    <dd className="tabular font-medium text-slate-600">{calc?.days ?? '—'}</dd>
                  </div>
                  {calc && calc.compensationDate !== calc.dueDate && (
                    <div className="flex items-baseline gap-1.5">
                      <dt className="text-slate-400">Compensa em</dt>
                      <dd className="tabular font-medium text-slate-600">
                        {formatDate(calc.compensationDate)}
                      </dd>
                    </div>
                  )}
                  <div className="flex items-baseline gap-1.5">
                    <dt className="text-slate-400">Desconto</dt>
                    <dd className="tabular font-medium text-slate-600">
                      {calc ? formatCents(calc.discountAmountCents) : '—'}
                    </dd>
                  </div>
                  <div className="ml-auto flex items-baseline gap-1.5">
                    <dt className="text-slate-400">Líquido</dt>
                    <dd className="tabular font-semibold text-slate-900">
                      {calc ? formatCents(calc.netAmountCents) : '—'}
                    </dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}

      <Button variant="secondary" onClick={addRow} className="mt-3" type="button">
        <Plus className="size-4" />
        Adicionar título
      </Button>
    </div>
  );
}
