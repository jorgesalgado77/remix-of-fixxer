import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { reportLovableError } from "@/lib/lovable-error-reporting";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Boundary global para capturar exceções de renderização de componentes
 * filhos (que o `errorComponent` do TanStack Router não intercepta).
 * Mantém a árvore restante viva e oferece recuperação sem hard-reload.
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[GlobalErrorBoundary]", error, info.componentStack);
    try {
      reportLovableError(error, { boundary: "global_error_boundary", componentStack: info.componentStack });
    } catch {
      /* noop */
    }
  }

  private handleReset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">
              Algo saiu do trilho
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Um componente encontrou uma falha inesperada. Sua sessão continua ativa —
              você pode tentar novamente sem sair da página.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={this.handleReset}
              className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-4 rounded-xl active:scale-[0.98] transition-all"
            >
              <RefreshCcw className="w-4 h-4" />
              Tentar novamente
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-widest"
            >
              Voltar ao início
            </button>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground/50 break-all max-h-48 overflow-auto text-left whitespace-pre-wrap">
            {this.state.error.message}
            {"\n"}
            {(this.state.error.stack || "").split("\n").slice(0, 8).join("\n")}
          </div>
        </div>
      </div>
    );
  }
}
