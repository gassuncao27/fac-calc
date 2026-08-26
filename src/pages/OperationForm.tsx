import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileDown, Save } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { calculateOperation } from '../domain/calculations/operation';
import { getOperationWithReceivables, saveOperation, type OperationDraft, type ReceivableDraft } from '../services/operationService';
import { getSettings } from '../services/settingsService';
import { db } from '../db/database';
import type { CalculationMethod, Operation, OperationStatus, OperationType, Settings } from '../types/models';
import { DAY_BASES, OPERATION_TYPES } from '../constants';
import { DISCOUNT_METHODS } from '../domain/calculations/methods';
import { PageHeader } from '../components/ui/PageHeader';
import { Field, Select, Textarea } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { ClientSelector } from '../components/ClientSelector';
import { CurrencyInput } from '../components/inputs/CurrencyInput';
import { PercentInput } from '../components/inputs/PercentInput';
import { DateInput } from '../components/inputs/DateInput';
import { ReceivableTable } from '../components/ReceivableTable';
import { OperationSummary } from '../components/OperationSummary';
import { formatPercent, nowISO, todayISO } from '../utils/format';

interface FormState {
  clientId: string | null;
  operationDate: string;
  operationType: OperationType;
  status: OperationStatus;
  monthlyRate: number | null;
  dayBase: number;
  calculationMethod: CalculationMethod;
  fixedFeeCents: number | null;
  percentageFee: number | null;
  otherExpensesCents: number | null;
  iofEnabled: boolean;
  notes: string;
  receivables: ReceivableDraft[];
}

function emptyForm(settings: Settings): FormState {
  return {
    clientId: null,
    operationDate: todayISO(),
    operationType: 'duplicata',
    status: 'simulacao',
    monthlyRate: settings.defaultRate,
    dayBase: settings.defaultDayBase,
    calculationMethod: settings.defaultCalculationMethod,
    fixedFeeCents: settings.defaultFixedFeeCents || null,
    percentageFee: settings.defaultPercentageFee || null,
    otherExpensesCents: null,
    // Factoring paga IOF na maioria das operações: já vem marcado.
    iofEnabled: settings.isFactoring,
    notes: '',
    receivables: [],
  };
}

export function OperationFormPage() {
  const { id } = useParams<{ id: string }>();
  const settings = useLiveQuery(() => getSettings(), []);
  const [form, setForm] = useState<FormState | null>(null);
  const [existingId, setExistingId] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Inicializa o formulário (novo com padrões das configurações, ou edição)
  useEffect(() => {
    if (!settings || form) return;
    let cancelled = false;
    (async () => {
      if (id) {
        const data = await getOperationWithReceivables(id);
        if (!data || cancelled) return;
        const { operation, receivables } = data;
        setExistingId(operation.id);
        setForm({
          clientId: operation.clientId,
          operationDate: operation.operationDate,
          operationType: operation.operationType,
          status: operation.status,
          monthlyRate: operation.monthlyRate,
          dayBase: operation.dayBase,
          calculationMethod: operation.calculationMethod,
          fixedFeeCents: operation.fixedFeeCents || null,
          percentageFee: operation.percentageFee || null,
          otherExpensesCents: operation.otherExpensesCents || null,
          iofEnabled: operation.iofEnabled ?? false,
          notes: operation.notes ?? '',
          receivables: receivables.map((r) => ({
            id: r.id,
            documentNumber: r.documentNumber,
            nominalAmountCents: r.nominalAmountCents,
            dueDate: r.dueDate,
            expensesCents: r.expensesCents,
            notes: r.notes,
          })),
        });
      } else {
        setForm(emptyForm(settings));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [settings, id, form]);

  const result = useMemo(() => {
    if (!form) return null;
    return calculateOperation({
      operationDate: form.operationDate,
      monthlyRate: form.monthlyRate ?? 0,
      dayBase: form.dayBase,
      method: form.calculationMethod,
      fixedFeeCents: form.fixedFeeCents ?? 0,
      percentageFee: form.percentageFee ?? 0,
      otherExpensesCents: form.otherExpensesCents ?? 0,
      iofEnabled: form.iofEnabled,
      iofDailyRate: settings?.iofDailyRate ?? 0,
      iofAdditionalRate: settings?.iofAdditionalRate ?? 0,
      receivables: form.receivables,
    });
  }, [form, settings]);

  function toDraft(f: FormState): OperationDraft {
    return {
      clientId: f.clientId,
      operationDate: f.operationDate,
      operationType: f.operationType,
      status: f.status,
      monthlyRate: f.monthlyRate ?? 0,
      dayBase: f.dayBase,
      calculationMethod: f.calculationMethod,
      fixedFeeCents: f.fixedFeeCents ?? 0,
      percentageFee: f.percentageFee ?? 0,
      otherExpensesCents: f.otherExpensesCents ?? 0,
      iofEnabled: f.iofEnabled,
      iofDailyRate: settings?.iofDailyRate ?? 0,
      iofAdditionalRate: settings?.iofAdditionalRate ?? 0,
      notes: f.notes || undefined,
      receivables: f.receivables,
    };
  }

  async function handleSave() {
    if (!form || saving) return;
    const withValue = form.receivables.filter((r) => r.nominalAmountCents > 0);
    if (withValue.length === 0) {
      toast('Adicione ao menos um título com valor.', 'info');
      return;
    }
    if (form.monthlyRate === null || form.monthlyRate < 0) {
      toast('Informe a taxa mensal.', 'info');
      return;
    }
    setSaving(true);
    try {
      const saved = await saveOperation({ ...toDraft(form), receivables: withValue }, existingId);
      toast(existingId ? 'Operação atualizada.' : `Operação ${saved.operationNumber} salva.`);
      navigate(`/operacoes/${saved.id}`);
    } catch (error) {
      console.error(error);
      toast('Não foi possível salvar a operação. Tente novamente.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handlePdf() {
    if (!form || !result || !settings) return;
    try {
      // Carregado sob demanda (o chunk fica precacheado pelo Service Worker)
      const { generateOperationPdf } = await import('../services/pdfService');
      const client = form.clientId ? ((await db.clients.get(form.clientId)) ?? null) : null;
      const now = nowISO();
      const operationNumber = existingId
        ? ((await db.operations.get(existingId))?.operationNumber ?? 'SIMULAÇÃO')
        : 'SIMULAÇÃO';
      const operation: Operation = {
        id: existingId ?? 'preview',
        operationNumber,
        clientId: form.clientId,
        operationDate: form.operationDate,
        operationType: form.operationType,
        status: form.status,
        monthlyRate: form.monthlyRate ?? 0,
        dayBase: form.dayBase,
        calculationMethod: form.calculationMethod,
        fixedFeeCents: form.fixedFeeCents ?? 0,
        percentageFee: form.percentageFee ?? 0,
        otherExpensesCents: form.otherExpensesCents ?? 0,
        iofEnabled: form.iofEnabled,
        iofDailyRate: settings.iofDailyRate,
        iofAdditionalRate: settings.iofAdditionalRate,
        iofPrincipalCents: result.iofPrincipalCents,
        iofAdditionalCents: result.iofAdditionalCents,
        iofAmountCents: result.iofAmountCents,
        nominalAmountCents: result.nominalAmountCents,
        discountAmountCents: result.discountAmountCents,
        totalFeesCents: result.feesAmountCents,
        totalExpensesCents: result.expensesAmountCents,
        netAmountCents: result.netAmountCents,
        averageTermDays: result.averageTermDays,
        effectiveMonthlyRate: result.effectiveMonthlyRate,
        effectiveAnnualRate: result.effectiveAnnualRate,
        notes: form.notes || undefined,
        createdAt: now,
        updatedAt: now,
      };
      generateOperationPdf(
        operation,
        result.receivables.map((r) => ({
          id: r.id,
          operationId: operation.id,
          documentNumber: r.documentNumber,
          nominalAmountCents: r.nominalAmountCents,
          dueDate: r.dueDate,
          days: r.days,
          rate: r.rate,
          discountAmountCents: r.discountAmountCents,
          expensesCents: r.expensesCents,
          netAmountCents: r.netAmountCents,
          notes: r.notes,
        })),
        client,
        settings,
      );
    } catch (error) {
      console.error(error);
      toast('Não foi possível gerar o arquivo. Tente novamente.', 'error');
    }
  }

  // Ctrl/Cmd + S salva
  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSave();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (!form || !result || !settings) {
    return <p className="py-20 text-center text-sm text-slate-400">Carregando…</p>;
  }

  const patch = (p: Partial<FormState>) => setForm((f) => (f ? { ...f, ...p } : f));

  return (
    <div>
      <PageHeader
        title={existingId ? 'Editar operação' : 'Nova operação'}
        subtitle="Os valores são recalculados automaticamente a cada alteração."
      />

      {/*
        Breakpoints alinhados à largura real: a sidebar (240px) e o Resumo
        (340px) reduzem muito o espaço do formulário. O Resumo só vai para
        o lado a partir de xl; abaixo disso ele fica embaixo, dando largura
        total ao formulário (essencial no iPad em paisagem, 1194px).
      */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          {/* Dados da operação */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 md:p-6">
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 wide:grid-cols-3">
              <Field label="Cliente">
                <ClientSelector value={form.clientId} onChange={(clientId) => patch({ clientId })} />
              </Field>
              <Field label="Data da operação">
                <DateInput value={form.operationDate} onChangeValue={(operationDate) => patch({ operationDate })} />
              </Field>
              <Field label="Tipo da operação">
                <Select
                  value={form.operationType}
                  onChange={(e) => patch({ operationType: e.target.value as OperationType })}
                >
                  {OPERATION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Taxa mensal">
                <PercentInput value={form.monthlyRate} onChangeValue={(monthlyRate) => patch({ monthlyRate })} />
              </Field>
              <Field label="Método de cálculo">
                <Select
                  value={form.calculationMethod}
                  onChange={(e) => patch({ calculationMethod: e.target.value as CalculationMethod })}
                >
                  {Object.values(DISCOUNT_METHODS).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.shortLabel}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Base de cálculo (dias)">
                <Select value={form.dayBase} onChange={(e) => patch({ dayBase: Number(e.target.value) })}>
                  {DAY_BASES.map((base) => (
                    <option key={base} value={base}>
                      {base} dias
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tarifa fixa">
                <CurrencyInput
                  valueCents={form.fixedFeeCents}
                  onChangeCents={(fixedFeeCents) => patch({ fixedFeeCents })}
                />
              </Field>
              <Field label="Tarifa percentual" hint="Sobre o valor nominal total.">
                <PercentInput value={form.percentageFee} onChangeValue={(percentageFee) => patch({ percentageFee })} />
              </Field>
              <Field label="Outras despesas" hint="Cartório, cobrança e afins. O IOF é calculado à parte.">
                <CurrencyInput
                  valueCents={form.otherExpensesCents}
                  onChangeCents={(otherExpensesCents) => patch({ otherExpensesCents })}
                />
              </Field>
            </div>
            {/* IOF: marcado por padrão quando a empresa é factoring */}
            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <input
                type="checkbox"
                checked={form.iofEnabled}
                onChange={(e) => patch({ iofEnabled: e.target.checked })}
                className="mt-0.5 size-5 shrink-0 accent-slate-900"
              />
              <span className="min-w-0">
                <span className="block font-medium text-slate-900">Incidir IOF</span>
                <span className="mt-0.5 block text-sm text-slate-500">
                  {formatPercent(settings.iofDailyRate, 4)} ao dia (limitado a 365 dias) +{' '}
                  {formatPercent(settings.iofAdditionalRate)} adicional, sobre o valor líquido entregue.
                  Alíquotas em Configurações.
                </span>
              </span>
            </label>

            <div className="mt-4">
              <Field label="Observações">
                <Textarea
                  value={form.notes}
                  onChange={(e) => patch({ notes: e.target.value })}
                  placeholder="Opcional"
                  rows={2}
                />
              </Field>
            </div>
          </section>

          {/* Títulos */}
          <section>
            <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-slate-400">Títulos</h2>
            <ReceivableTable
              rows={form.receivables}
              calcRows={result.receivables}
              operationDate={form.operationDate}
              onChange={(receivables) => patch({ receivables })}
            />
          </section>
        </div>

        {/* Resumo */}
        <aside className="xl:sticky xl:top-8 xl:self-start">
          <OperationSummary
            result={result}
            monthlyRate={form.monthlyRate ?? 0}
            decimalPlaces={settings.decimalPlaces}
          />
          <div className="mt-4 flex flex-col gap-3">
            <Button size="lg" onClick={handleSave} disabled={saving}>
              <Save className="size-5" />
              {saving ? 'Salvando…' : 'Salvar operação'}
            </Button>
            <Button variant="secondary" size="lg" onClick={handlePdf}>
              <FileDown className="size-5" />
              Gerar PDF
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
