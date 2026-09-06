import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Última linha de defesa: qualquer exceção durante o render derrubaria a
 * árvore do React e deixaria a tela em branco — inaceitável para quem está
 * calculando na frente de um cliente. Aqui mostramos uma mensagem amigável
 * (nunca o stack trace) e uma saída para continuar trabalhando.
 *
 * Os dados no IndexedDB não são afetados: recarregar preserva tudo.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Fica no console para diagnóstico em desenvolvimento
    console.error('Erro não tratado na interface:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-app flex-col items-center justify-center bg-[#FAFAF9] px-6 py-16">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-red-50">
            <AlertCircle className="size-7 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Algo não funcionou como esperado
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Seus dados continuam salvos neste aparelho — nada foi perdido. Volte e tente novamente.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Tentar novamente
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#/';
                window.location.reload();
              }}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    );
  }
}
