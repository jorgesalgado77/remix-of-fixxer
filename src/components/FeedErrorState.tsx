import { useEffect, useRef, useState } from "react";
import { AlertTriangle, RefreshCcw, WifiOff, Clock, CloudOff } from "lucide-react";
import { describeFeedError, type FeedErrorKind } from "@/lib/feed-cache";

/**
 * Estado de erro amigável para o Feed.
 * — Detecta automaticamente o tipo (offline / timeout / rede / desconhecido)
 *   a partir de `error` ou `message`.
 * — Aciona `onRetry` sozinho com backoff exponencial (2, 4, 8, 16, 30s…),
 *   até 5 tentativas. O usuário pode disparar manualmente a qualquer momento
 *   ou pausar/retomar o auto-retry.
 */

type Props = {
  onRetry: () => void | Promise<void>;
  accent?: string;
  /** Instância do erro (preferido) OU mensagem crua. */
  error?: unknown;
  message?: string;
  busy?: boolean;
  /** Desliga o auto-retry por backoff. */
  autoRetry?: boolean;
};

const LABELS: Record<FeedErrorKind, { title: string; Icon: typeof AlertTriangle }> = {
  offline: { title: "Sem conexão", Icon: WifiOff },
  timeout: { title: "Tempo esgotado", Icon: Clock },
  network: { title: "Falha de rede", Icon: CloudOff },
  unknown: { title: "Erro ao atualizar", Icon: AlertTriangle },
};

const MAX_ATTEMPTS = 5;
const nextDelay = (attempt: number) => Math.min(30, Math.pow(2, attempt)); // 2,4,8,16,30

export function FeedErrorState({
  onRetry,
  accent = "#00FF87",
  error,
  message,
  busy = false,
  autoRetry = true,
}: Props) {
  const described = error !== undefined ? describeFeedError(error) : null;
  const kind: FeedErrorKind = described?.kind ?? "unknown";
  const finalMessage = message ?? described?.message ?? "Verifique sua conexão e tente novamente.";
  const { title, Icon } = LABELS[kind];

  const [attempt, setAttempt] = useState(1);
  const [countdown, setCountdown] = useState<number>(() => nextDelay(1));
  const [paused, setPaused] = useState(false);
  const firedRef = useRef(false);

  // reseta o contador se a mensagem/tipo mudar (novo erro)
  useEffect(() => {
    firedRef.current = false;
    setAttempt(1);
    setCountdown(nextDelay(1));
  }, [finalMessage, kind]);

  useEffect(() => {
    if (!autoRetry || paused || busy) return;
    if (attempt > MAX_ATTEMPTS) return;
    if (countdown <= 0) {
      if (firedRef.current) return;
      firedRef.current = true;
      void Promise.resolve(onRetry()).finally(() => {
        firedRef.current = false;
        setAttempt((a) => {
          const next = a + 1;
          setCountdown(nextDelay(next));
          return next;
        });
      });
      return;
    }
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown, autoRetry, paused, busy, attempt, onRetry]);

  const handleManualRetry = () => {
    firedRef.current = false;
    setCountdown(0);
    void onRetry();
  };

  const capped = attempt > MAX_ATTEMPTS;

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
        <Icon className="w-7 h-7" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-black uppercase tracking-tight text-white">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{finalMessage}</p>
        {autoRetry && !capped && !busy && (
          <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: accent }}>
            {paused
              ? `Auto-retry pausado · tentativa ${attempt}/${MAX_ATTEMPTS}`
              : countdown > 0
                ? `Nova tentativa em ${countdown}s · ${attempt}/${MAX_ATTEMPTS}`
                : `Tentando novamente…`}
          </p>
        )}
        {capped && (
          <p className="text-[10px] uppercase tracking-widest font-bold text-red-400">
            Auto-retry esgotado — tente manualmente
          </p>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 flex-wrap">
        <button
          onClick={handleManualRetry}
          disabled={busy}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] text-black transition-all active:scale-95 disabled:opacity-60"
          style={{ background: accent, boxShadow: `0 0 20px ${accent}55` }}
        >
          <RefreshCcw className={busy ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
          {busy ? "Tentando..." : "Tentar agora"}
        </button>
        {autoRetry && !capped && (
          <button
            onClick={() => setPaused((p) => !p)}
            className="inline-flex items-center gap-2 px-3 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] text-white/80 border border-white/10 hover:bg-white/5 active:scale-95"
          >
            {paused ? "Retomar" : "Pausar auto-retry"}
          </button>
        )}
      </div>
    </div>
  );
}
