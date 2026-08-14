import { useState, type FormEvent, type ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { verifyPin } from '../utils/pin';
import { Button } from './ui/Button';
import { APP_NAME } from '../constants';

/**
 * Bloqueio local por PIN ("Exigir PIN ao abrir" nas Configurações).
 * Totalmente offline — nenhum login online é necessário.
 */
export function PinGate({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const required = settings.pinEnabled && settings.pinHash;
  if (!required || unlocked) return <>{children}</>;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (await verifyPin(pin, settings.pinHash!)) {
      setUnlocked(true);
    } else {
      setError(true);
      setPin('');
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#FAFAF9] px-6">
      <div className="w-full max-w-xs text-center">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-slate-900">
          <Lock className="size-6 text-emerald-400" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{APP_NAME}</h1>
        <p className="mt-1 text-sm text-slate-500">Digite seu PIN para continuar.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            maxLength={6}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, ''));
              setError(false);
            }}
            aria-label="PIN"
            className="h-14 w-full rounded-xl border border-slate-200 bg-white text-center text-2xl tracking-[0.5em] text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
          />
          {error && <p className="text-sm text-red-600">PIN incorreto. Tente novamente.</p>}
          <Button type="submit" size="lg" className="w-full" disabled={pin.length < 4}>
            Desbloquear
          </Button>
        </form>
      </div>
    </div>
  );
}
