import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DatabaseBackup, FlaskConical } from 'lucide-react';
import { getSettings, saveSettings } from '../services/settingsService';
import { loadDemoData, clearAllData } from '../db/seed';
import { DAY_BASES } from '../constants';
import type { Settings } from '../types/models';
import { DISCOUNT_METHODS } from '../domain/calculations/methods';
import { PageHeader } from '../components/ui/PageHeader';
import { Field, Select, TextInput } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { CurrencyInput } from '../components/inputs/CurrencyInput';
import { PercentInput } from '../components/inputs/PercentInput';
import { hashPin, isValidPin } from '../utils/pin';

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [pin, setPin] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    getSettings().then(setSettings).catch(console.error);
  }, []);

  if (!settings) return <p className="py-20 text-center text-sm text-slate-400">Carregando…</p>;

  const patch = (p: Partial<Settings>) => setSettings((s) => (s ? { ...s, ...p } : s));

  async function handleSave() {
    if (!settings) return;
    try {
      let pinPatch: Partial<Settings> = {};
      if (settings.pinEnabled) {
        if (pin) {
          if (!isValidPin(pin)) {
            toast('O PIN deve ter de 4 a 6 dígitos numéricos.', 'info');
            return;
          }
          pinPatch = { pinHash: await hashPin(pin) };
        } else if (!settings.pinHash) {
          toast('Defina um PIN de 4 a 6 dígitos para ativar o bloqueio.', 'info');
          return;
        }
      } else {
        pinPatch = { pinHash: null };
      }
      await saveSettings({ ...settings, ...pinPatch });
      setPin('');
      toast('Configurações salvas.');
    } catch (error) {
      console.error(error);
      toast('Não foi possível salvar as configurações.', 'error');
    }
  }

  async function handleDemoData() {
    try {
      await loadDemoData();
      toast('Dados de demonstração carregados.');
    } catch (error) {
      console.error(error);
      toast(error instanceof Error ? error.message : 'Não foi possível carregar a demonstração.', 'error');
    }
  }

  async function handleClearData() {
    try {
      await clearAllData();
      toast('Todos os dados foram apagados.');
    } catch (error) {
      console.error(error);
      toast('Não foi possível apagar os dados.', 'error');
    } finally {
      setConfirmClear(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Configurações" subtitle="Padrões usados ao criar novas operações." />

      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6">
          <h2 className="mb-4 text-[12px] font-semibold uppercase tracking-widest text-slate-400">Empresa</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nome da empresa" hint="Aparece no cabeçalho do PDF.">
              <TextInput
                value={settings.companyName}
                onChange={(e) => patch({ companyName: e.target.value })}
                placeholder="Opcional"
              />
            </Field>
            <Field label="CNPJ">
              <TextInput
                value={settings.companyDocument}
                onChange={(e) => patch({ companyDocument: e.target.value })}
                placeholder="Opcional"
                inputMode="numeric"
              />
            </Field>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={settings.isFactoring}
              onChange={(e) => patch({ isFactoring: e.target.checked })}
              className="mt-0.5 size-5 shrink-0 accent-slate-900"
            />
            <span className="min-w-0">
              <span className="block font-medium text-slate-900">Empresa é factoring</span>
              <span className="mt-0.5 block text-sm text-slate-500">
                Novas operações já vêm com o IOF marcado. Continua sendo possível desmarcar caso a
                caso.
              </span>
            </span>
          </label>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-6">
          <h2 className="mb-1 text-[12px] font-semibold uppercase tracking-widest text-slate-400">
            IOF
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            O IOF incide sobre o valor líquido entregue ao cedente: alíquota diária pelo prazo de
            cada título (limitada a 365 dias) mais o adicional fixo.{' '}
            <strong className="font-medium text-slate-700">
              As alíquotas mudam por decreto — confira as vigentes antes de usar.
            </strong>
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Alíquota diária" hint="Ex.: 0,0082% ao dia.">
              <PercentInput
                value={settings.iofDailyRate}
                digits={4}
                onChangeValue={(v) => patch({ iofDailyRate: v ?? 0 })}
              />
            </Field>
            <Field label="Alíquota adicional" hint="Cobrada uma vez, independe do prazo.">
              <PercentInput
                value={settings.iofAdditionalRate}
                onChangeValue={(v) => patch({ iofAdditionalRate: v ?? 0 })}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-6">
          <h2 className="mb-4 text-[12px] font-semibold uppercase tracking-widest text-slate-400">
            Padrões de cálculo
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Taxa mensal padrão">
              <PercentInput
                value={settings.defaultRate}
                onChangeValue={(v) => patch({ defaultRate: v ?? 0 })}
              />
            </Field>
            <Field label="Base de dias padrão">
              <Select
                value={settings.defaultDayBase}
                onChange={(e) => patch({ defaultDayBase: Number(e.target.value) })}
              >
                {DAY_BASES.map((base) => (
                  <option key={base} value={base}>
                    {base} dias
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tarifa fixa padrão">
              <CurrencyInput
                valueCents={settings.defaultFixedFeeCents || null}
                onChangeCents={(v) => patch({ defaultFixedFeeCents: v ?? 0 })}
              />
            </Field>
            <Field label="Tarifa percentual padrão">
              <PercentInput
                value={settings.defaultPercentageFee || null}
                onChangeValue={(v) => patch({ defaultPercentageFee: v ?? 0 })}
              />
            </Field>
            <Field label="Método de cálculo padrão">
              <Select
                value={settings.defaultCalculationMethod}
                onChange={(e) =>
                  patch({ defaultCalculationMethod: e.target.value as Settings['defaultCalculationMethod'] })
                }
              >
                {Object.values(DISCOUNT_METHODS).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.shortLabel}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Compensação padrão (D + x)" hint="Dias após o vencimento até o dinheiro entrar.">
              <TextInput
                type="number"
                min={0}
                max={180}
                step={1}
                inputMode="numeric"
                value={String(settings.defaultCompensationDays)}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  patch({ defaultCompensationDays: Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0 });
                }}
                className="tabular text-right"
              />
            </Field>
            <Field label="Casas decimais das taxas">
              <Select
                value={settings.decimalPlaces}
                onChange={(e) => patch({ decimalPlaces: Number(e.target.value) })}
              >
                {[2, 3, 4].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-6">
          <h2 className="mb-4 text-[12px] font-semibold uppercase tracking-widest text-slate-400">Segurança</h2>
          <label className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-slate-900">Exigir PIN ao abrir</p>
              <p className="mt-0.5 text-sm text-slate-500">
                Bloqueio local com PIN numérico de 4 a 6 dígitos. Funciona offline.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.pinEnabled}
              onChange={(e) => patch({ pinEnabled: e.target.checked })}
              className="size-6 accent-slate-900"
            />
          </label>
          {settings.pinEnabled && (
            <div className="mt-4 max-w-48">
              <Field label={settings.pinHash ? 'Novo PIN (deixe vazio para manter)' : 'PIN'}>
                <TextInput
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                />
              </Field>
            </div>
          )}
        </section>

        <div className="flex justify-end">
          <Button size="lg" onClick={handleSave}>
            Salvar configurações
          </Button>
        </div>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-6">
          <h2 className="mb-1 text-[12px] font-semibold uppercase tracking-widest text-slate-400">Backup</h2>
          <p className="text-sm text-slate-500">
            Exporte e restaure todos os dados do aparelho na página de backup.
          </p>
          <Link to="/backup" className="mt-3 inline-block">
            <Button variant="secondary">
              <DatabaseBackup className="size-4" />
              Ir para Backup
            </Button>
          </Link>
        </section>

        {import.meta.env.DEV && (
          <section className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-6">
            <h2 className="mb-1 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-widest text-amber-600">
              <FlaskConical className="size-4" />
              Ambiente de desenvolvimento
            </h2>
            <p className="text-sm text-slate-600">
              Dados de exemplo para testar a aplicação. Não disponível em produção.
            </p>
            <div className="mt-3 flex gap-3">
              <Button variant="secondary" onClick={handleDemoData}>
                Carregar dados de demonstração
              </Button>
              <Button variant="secondary" onClick={() => setConfirmClear(true)} className="text-red-600">
                Apagar todos os dados
              </Button>
            </div>
          </section>
        )}
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Apagar todos os dados"
        description="Clientes, operações, títulos e configurações serão apagados permanentemente deste aparelho."
        confirmLabel="Apagar tudo"
        danger
        onConfirm={handleClearData}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}
