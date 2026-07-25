import { useEffect, useState } from "react";
import { WifiOff, Wifi, RefreshCcw } from "lucide-react";
import { getLatestFeedCacheAt, formatRelativeTime } from "@/lib/feed-cache";

/**
 * Banner global de modo offline.
 * — Escuta `online`/`offline` do navegador.
 * — Quando offline, exibe uma faixa fixa no topo permitindo o usuário
 *   continuar navegando pelos cards em cache com o rótulo
 *   "atualizado há X" (baseado no snapshot mais recente do feed-cache).
 * — Quando a conexão volta, mostra confirmação por poucos segundos e some.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [justBack, setJustBack] = useState(false);
  const [lastAt, setLastAt] = useState<number | null>(null);
  const [, tick] = useState(0);

  // listeners online/offline
  useEffect(() => {
    if (typeof window === "undefined") return;
    const goOffline = () => {
      setOnline(false);
      setLastAt(getLatestFeedCacheAt());
    };
    const goOnline = () => {
      setOnline(true);
      setJustBack(true);
      setTimeout(() => setJustBack(false), 3500);
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    if (!navigator.onLine) goOffline();
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  // relógio: re-renderiza a cada 30s para atualizar "há X min"
  useEffect(() => {
    if (online) return;
    const id = setInterval(() => {
      setLastAt(getLatestFeedCacheAt());
      tick((n) => n + 1);
    }, 30_000);
    return () => clearInterval(id);
  }, [online]);

  if (online && !justBack) return null;

  if (online && justBack) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-2 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 rounded-full bg-emerald-500/95 text-black text-[11px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2 backdrop-blur"
      >
        <Wifi className="w-3.5 h-3.5" />
        Conexão restaurada
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[9999] bg-amber-500/95 text-black text-[11px] font-bold shadow-lg backdrop-blur"
    >
      <div className="max-w-5xl mx-auto px-3 py-2 flex items-center gap-2">
        <WifiOff className="w-3.5 h-3.5 shrink-0" />
        <div className="flex-1 min-w-0 leading-tight">
          <span className="uppercase tracking-widest font-black">Modo offline</span>
          <span className="mx-2 opacity-60">·</span>
          <span className="opacity-90">
            {lastAt
              ? `você está navegando pelo cache — atualizado ${formatRelativeTime(lastAt)}`
              : "você está navegando pelo cache local disponível"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/15 hover:bg-black/25 active:scale-95 transition text-[10px] uppercase tracking-widest font-black"
        >
          <RefreshCcw className="w-3 h-3" />
          Tentar
        </button>
      </div>
    </div>
  );
}
