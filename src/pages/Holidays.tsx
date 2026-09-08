import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarPlus, CalendarDays, Plus, Trash2 } from 'lucide-react';
import { db } from '../db/database';
import {
  addHoliday,
  generateNationalHolidays,
  removeHoliday,
  removeHolidaysOfYear,
} from '../services/holidayService';
import type { Holiday } from '../types/models';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Field, Select, TextInput } from '../components/ui/Field';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { DateInput } from '../components/inputs/DateInput';
import { formatDate, todayISO } from '../utils/format';

const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

function diaDaSemana(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number);
  if (!a || !m || !d) return '';
  return DIAS_SEMANA[new Date(a, m - 1, d).getDay()] ?? '';
}

export function HolidaysPage() {
  const { toast } = useToast();
  const anoAtual = Number(todayISO().slice(0, 4));
  const [ano, setAno] = useState(anoAtual);
  const [novaData, setNovaData] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [aRemover, setARemover] = useState<Holiday | null>(null);
  const [confirmarLimpeza, setConfirmarLimpeza] = useState(false);

  const todos = useLiveQuery(() => db.holidays.orderBy('date').toArray(), []);

  const anos = useMemo(() => {
    const base = new Set<number>([anoAtual, anoAtual + 1]);
    (todos ?? []).forEach((h) => base.add(Number(h.date.slice(0, 4))));
    return [...base].filter(Boolean).sort((a, b) => a - b);
  }, [todos, anoAtual]);

  if (!todos) return <p className="py-20 text-center text-sm text-slate-400">Carregando…</p>;

  const doAno = todos.filter((h) => h.date.startsWith(`${ano}-`));

  async function handleAdicionar() {
    try {
      await addHoliday(novaData, novoNome);
      toast('Feriado cadastrado.');
      setNovaData('');
      setNovoNome('');
    } catch (error) {
      console.error(error);
      toast(error instanceof Error ? error.message : 'Não foi possível cadastrar.', 'error');
    }
  }

  async function handleGerar() {
    try {
      const { adicionados, jaExistiam } = await generateNationalHolidays(ano);
      toast(
        adicionados === 0
          ? `Os ${jaExistiam} feriados nacionais de ${ano} já estavam cadastrados.`
          : `${adicionados} feriado(s) nacional(is) de ${ano} adicionado(s).`,
      );
    } catch (error) {
      console.error(error);
      toast('Não foi possível gerar os feriados.', 'error');
    }
  }

  async function handleRemover() {
    if (!aRemover) return;
    try {
      await removeHoliday(aRemover.date);
      toast('Feriado removido.');
    } catch (error) {
      console.error(error);
      toast('Não foi possível remover o feriado.', 'error');
    } finally {
      setARemover(null);
    }
  }

  async function handleLimparAno() {
    try {
      const n = await removeHolidaysOfYear(ano);
      toast(`${n} feriado(s) de ${ano} removido(s).`);
    } catch (error) {
      console.error(error);
      toast('Não foi possível remover os feriados.', 'error');
    } finally {
      setConfirmarLimpeza(false);
    }
  }

  const podeAdicionar = novaData !== '' && novoNome.trim() !== '';

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Feriados"
        subtitle="Usados na compensação em dias úteis. Ficam salvos neste aparelho e entram no backup."
      />

      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 md:p-6">
          <h2 className="mb-4 text-[12px] font-semibold uppercase tracking-widest text-slate-400">
            Cadastrar feriado
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto] sm:items-end">
            <Field label="Data">
              <DateInput value={novaData} onChangeValue={setNovaData} aria-label="Data do feriado" />
            </Field>
            <Field label="Descrição">
              <TextInput
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Ex.: Aniversário da cidade"
                aria-label="Nome do feriado"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && podeAdicionar) handleAdicionar();
                }}
              />
            </Field>
            <Button onClick={handleAdicionar} disabled={!podeAdicionar} className="sm:mb-0">
              <Plus className="size-4" />
              Adicionar
            </Button>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Cada feriado é uma data única. Para o ano seguinte, gere os nacionais de novo e cadastre
            os locais.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="w-32">
              <Field label="Ano">
                <Select value={ano} onChange={(e) => setAno(Number(e.target.value))} aria-label="Ano">
                  {anos.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={handleGerar}>
                <CalendarPlus className="size-4" />
                Gerar nacionais de {ano}
              </Button>
              {doAno.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => setConfirmarLimpeza(true)}
                  className="text-red-600"
                >
                  <Trash2 className="size-4" />
                  Limpar {ano}
                </Button>
              )}
            </div>
          </div>

          <div className="mt-5">
            {doAno.length === 0 ? (
              <EmptyState
                icon={<CalendarDays className="size-9" />}
                title={`Nenhum feriado cadastrado em ${ano}.`}
                description="Gere os nacionais e acrescente os estaduais e municipais da sua praça."
              />
            ) : (
              <ul className="divide-y divide-slate-50 rounded-xl border border-slate-100">
                {doAno.map((h) => (
                  <li key={h.date} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{h.name}</p>
                      <p className="tabular mt-0.5 text-[13px] text-slate-400">
                        {formatDate(h.date)} · {diaDaSemana(h.date)}
                      </p>
                    </div>
                    {h.source === 'nacional' && (
                      <span className="hidden shrink-0 rounded-full border border-slate-200 px-2.5 py-0.5 text-xs text-slate-500 sm:inline">
                        Nacional
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setARemover(h)}
                      aria-label={`Remover ${h.name}`}
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <p className="text-sm text-slate-500">
          Alterar esta lista <strong className="font-medium text-slate-700">não muda</strong> o valor
          de operações já salvas — as datas ficam gravadas em cada título. O recálculo só acontece se
          você editar a operação.
        </p>
      </div>

      <ConfirmDialog
        open={aRemover !== null}
        title="Remover feriado"
        description={
          <>
            Remover <strong>{aRemover?.name}</strong> de {aRemover ? formatDate(aRemover.date) : ''}?
            Novas operações passarão a contar esse dia como útil.
          </>
        }
        confirmLabel="Remover"
        danger
        onConfirm={handleRemover}
        onCancel={() => setARemover(null)}
      />

      <ConfirmDialog
        open={confirmarLimpeza}
        title={`Limpar feriados de ${ano}`}
        description={`Os ${doAno.length} feriado(s) cadastrados em ${ano} serão removidos.`}
        confirmLabel="Remover todos"
        danger
        onConfirm={handleLimparAno}
        onCancel={() => setConfirmarLimpeza(false)}
      />
    </div>
  );
}
