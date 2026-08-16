import { useEffect, useRef, useState, useCallback } from "react";
import { WifiOff, Wifi, RefreshCcw, Loader2 } from "lucide-react";
import { getLatestFeedCacheAt, formatRelativeTime } from "@/lib/feed-cache";
import { supabaseExternal } from "@/lib/supabaseExternal";

/**
 * Banner global de modo offline — versão resiliente.
 *
 * Regras (evitam falsos positivos ao trocar de rota em celulares fracos):
 *  1. Só declara OFFLINE quando `navigator.onLine === false` E um ping real
 *     ao Supabase falhar. Micro-oscilações do navegador ao trocar de aba
 *     NÃO disparam o banner amarelo.
 *  2. Debounce de 4s entre o evento `offline` e a exibição do banner —
 *     dá tempo do navegador reassentar após uma navegação.
 *  3. Botão "Tentar" faz reconexão SILENCIOSA: revalida a sessão do
 *     Supabase (`getSession`) e faz um ping ao backend, sem `reload()`,
 *     preservando a rota atual, o histórico e o estado da aplicação.
 *  4. Se o usuário está de fato online, o banner fica escondido — não
 *     reaparece em transições de rota.
 */

const OFFLINE_DEBOUNCE_MS = 20000; // Aumentado para 20s. Só ativa se a internet cair de verdade por um tempo longo.
const PING_TIMEOUT_MS = 15000; // 15s para dar tempo em conexões muito ruins.

async function pingBackend(): Promise<boolean> {
  // getSession é local (não faz round-trip). Usamos uma leitura leve
  // ao Supabase Auth para confirmar conectividade real de rede.
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    const url = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
    if (!url) { clearTimeout(timer); return true; } // sem URL, não bloqueia
    const res = await fetch(`${url}/auth/v1/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || "" },
    });
    clearTimeout(timer);
    return res.ok || res.status === 401 || res.status === 404; // servidor respondeu
  } catch {
    return false;
  }
}

export function OfflineBanner() {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [justBack, setJustBack] = useState(false);
  const [lastAt, setLastAt] = useState<number | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [, tick] = useState(0);
  const debounceRef = useRef<number | null>(null);

  const clearDebounce = () => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  };

  const confirmAndSetOffline = useCallback(() => {
    // Se o navegador já diz que está online, não fazemos nada.
    if (typeof navigator !== "undefined" && navigator.onLine) {
      clearDebounce();
      setOnline(true);
      return;
    }

    clearDebounce();
    debounceRef.current = window.setTimeout(async () => {
      // Re-checa navigator.onLine após o debounce longo
      if (typeof navigator !== "undefined" && navigator.onLine) {
        setOnline(true);
        return;
      }

      // Se navigator diz offline, fazemos UM ping final para ter certeza absoluta
      const ok = await pingBackend();
      if (ok) {
        setOnline(true);
      } else {
        setOnline(false);
        setLastAt(getLatestFeedCacheAt());
      }
    }, OFFLINE_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const goOffline = async () => {
      // Ignora o evento se o navegador reportar offline mas o ping ainda funcionar
      // (Alguns navegadores disparam 'offline' erroneamente em transições de rede rápidas)
      const ok = await pingBackend();
      if (!ok) confirmAndSetOffline();
    };
    const goOnline = () => {
      clearDebounce();
      setOnline(true);
      setJustBack(true);
      window.setTimeout(() => setJustBack(false), 3500);
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    // Estado inicial: se o navegador diz offline, confirma com ping antes de assustar o usuário.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
        pingBackend().then(ok => {
            if (!ok) confirmAndSetOffline();
        });
    }
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      clearDebounce();
    };
  }, [confirmAndSetOffline]);

  // Relógio: atualiza o "há X min" a cada 30s enquanto offline.
  useEffect(() => {
    if (online) return;
    const id = window.setInterval(() => {
      setLastAt(getLatestFeedCacheAt());
      tick((n) => n + 1);
    }, 30_000);
    return () => window.clearInterval(id);
  }, [online]);

  const silentRetry = useCallback(async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      // Reconexão silenciosa: NÃO recarrega a página, preserva a rota.
      await supabaseExternal.auth.getSession().catch(() => null);
      const ok = await pingBackend();
      if (ok) {
        setOnline(true);
        setJustBack(true);
        window.setTimeout(() => setJustBack(false), 2500);
      } else {
        setLastAt(getLatestFeedCacheAt());
      }
    } finally {
      setRetrying(false);
    }
  }, [retrying]);

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
          onClick={silentRetry}
          disabled={retrying}
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/15 hover:bg-black/25 active:scale-95 transition text-[10px] uppercase tracking-widest font-black disabled:opacity-60"
        >
          {retrying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCcw className="w-3 h-3" />}
          {retrying ? "Tentando" : "Tentar"}
        </button>
      </div>
    </div>
  );
}
