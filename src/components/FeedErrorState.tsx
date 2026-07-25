import { AlertTriangle, RefreshCcw } from "lucide-react";

/**
 * Estado de erro amigável para o Feed.
 * Exibido quando o carregamento inicial (ou o pull-to-refresh) falha.
 */
export function FeedErrorState({
  onRetry,
  accent = "#00FF87",
  message,
  busy = false,
}: {
  onRetry: () => void | Promise<void>;
  accent?: string;
  message?: string;
  busy?: boolean;
}) {
  return (
    <div
      role="alert"
      className="rounded-3xl border-2 bg-[#1A1A1B] p-6 text-center space-y-4"
      style={{ borderColor: `${accent}55` }}
    >
      <div
        className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: `${accent}15`, color: accent }}
      >
        <AlertTriangle className="w-7 h-7" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-black uppercase tracking-tight text-white">
          Não conseguimos atualizar o feed
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {message ??
            "Verifique sua conexão e toque em tentar novamente. Seus dados salvos continuam disponíveis."}
        </p>
      </div>
      <button
        onClick={() => void onRetry()}
        disabled={busy}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] text-black transition-all active:scale-95 disabled:opacity-60"
        style={{ background: accent, boxShadow: `0 0 20px ${accent}55` }}
      >
        <RefreshCcw className={busy ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
        {busy ? "Tentando..." : "Tentar novamente"}
      </button>
    </div>
  );
}
