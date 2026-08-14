import { useRef, type KeyboardEvent } from 'react';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { addDays, format, parseISO } from 'date-fns';
import type { ReceivableDraft } from '../services/operationService';
import type { ReceivableCalcResult } from '../domain/calculations/operation';
import { CurrencyInput } from './inputs/CurrencyInput';
import { DateInput } from './inputs/DateInput';
import { inputClass } from './ui/Field';
import { Button } from './ui/Button';
import { formatCents } from '../utils/format';
import { generateId } from '../utils/id';

interface ReceivableTableProps {
  rows: ReceivableDraft[];
  calcRows: ReceivableCalcResult[];
  operationDate: string;
  onChange: (rows: ReceivableDraft[]) => void;
}

const COLS = ['doc', 'value', 'due'] as const;
type Col = (typeof COLS)[number];

/**
 * Grade de títulos com preenchimento rápido: Enter avança pelos campos
 * como em uma planilha e cria uma nova linha ao final. Dias, desconto e
 * líquido são recalculados a cada tecla pelo motor de domínio.
 */
export function ReceivableTable({ rows, calcRows, operationDate, onChange }: ReceivableTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);

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
    const next = [...rows.slice(0, index + 1), copy, ...rows.slice(index + 1)];
    onChange(next);
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

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[12px] font-medium uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3 font-medium">Documento</th>
              <th className="px-4 py-3 text-right font-medium">Valor nominal</th>
              <th className="px-4 py-3 font-medium">Vencimento</th>
              <th className="px-3 py-3 text-right font-medium">Dias</th>
              <th className="px-4 py-3 text-right font-medium">Desconto</th>
              <th className="px-4 py-3 text-right font-medium">Líquido</th>
              <th className="w-24 px-2 py-3" aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                  Nenhum título ainda. Toque em “Adicionar título” para começar.
                </td>
              </tr>
            )}
            {rows.map((row, index) => {
              const calc = calcById.get(row.id);
              return (
                <tr key={row.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={row.documentNumber}
                      data-row={index}
                      data-col="doc"
                      aria-label={`Documento do título ${index + 1}`}
                      onChange={(e) => patchRow(index, { documentNumber: e.target.value })}
                      className={`${inputClass} h-10 min-w-24 border-transparent bg-transparent shadow-none focus:bg-white`}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <CurrencyInput
                      valueCents={row.nominalAmountCents || null}
                      data-row={index}
                      data-col="value"
                      aria-label={`Valor nominal do título ${index + 1}`}
                      onChangeCents={(cents) => patchRow(index, { nominalAmountCents: cents ?? 0 })}
                      className="h-10 min-w-32 border-transparent bg-transparent shadow-none focus:bg-white"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <DateInput
                      value={row.dueDate}
                      data-row={index}
                      data-col="due"
                      aria-label={`Vencimento do título ${index + 1}`}
                      onChangeValue={(date) => patchRow(index, { dueDate: date })}
                      className="h-10 min-w-36 border-transparent bg-transparent shadow-none focus:bg-white"
                    />
                  </td>
                  <td className="tabular px-3 py-1.5 text-right text-slate-500">{calc?.days ?? '—'}</td>
                  <td className="tabular px-4 py-1.5 text-right text-slate-500">
                    {calc ? formatCents(calc.discountAmountCents) : '—'}
                  </td>
                  <td className="tabular px-4 py-1.5 text-right font-medium text-slate-900">
                    {calc ? formatCents(calc.netAmountCents) : '—'}
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => duplicateRow(index)}
                        aria-label={`Duplicar título ${index + 1}`}
                        title="Duplicar"
                        className="flex size-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                      >
                        <Copy className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        aria-label={`Excluir título ${index + 1}`}
                        title="Excluir"
                        className="flex size-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Button variant="secondary" onClick={addRow} className="mt-3" type="button">
        <Plus className="size-4" />
        Adicionar título
      </Button>
    </div>
  );
}
