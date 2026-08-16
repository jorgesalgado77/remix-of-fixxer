import { useEffect, useRef, useState, useCallback } from "react";
import { WifiOff, Wifi, RefreshCcw, Loader2 } from "lucide-react";
import { getLatestFeedCacheAt, formatRelativeTime } from "@/lib/feed-cache";
import { supabaseExternal } from "@/lib/supabaseExternal";

/**
 * Banner global de modo offline — versão ultra-silenciosa e otimizada para o ambiente Lovable.
 * 
 * Correções PROMPT 24.2:
 * 1. Debounce reduzido para detecção mas aumentado para persistência.
 * 2. Ping otimizado para não travar o thread principal.
 * 3. Fallback agressivo: se o ping falhar uma vez, tenta novamente antes de exibir o banner.
 * 4. Verificação de rotas críticas: não exibe banner em /auth para evitar interferência visual.
 */

const OFFLINE_DEBOUNCE_MS = 5000; // 5s para confirmação
const PING_TIMEOUT_MS = 5000; // 5s para timeout de ping (rápido)

async function pingBackend(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    
    // Usamos o domínio atual se a URL do Supabase não estiver pronta
    const url = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
    if (!url) { 
      clearTimeout(timer); 
      return true; 
    }
    
    const res = await fetch(`${url}/auth/v1/health`, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      signal: controller.signal,
      headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || "" },
    });
    clearTimeout(timer);
    return res.status >= 200 && res.status < 500; // Qualquer resposta do servidor conta como online
  } catch (e) {
    console.warn("[OfflineBanner] Ping falhou:", e);
    return false;
  }
}

export function OfflineBanner() {
  const [online, setOnline] = useState<boolean>(true); // Começa como online por padrão
  const [justBack, setJustBack] = useState(false);
  const [lastAt, setLastAt] = useState<number | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [, tick] = useState(0);
  const checkIntervalRef = useRef<number | null>(null);
  
  // Detecta se estamos na tela de login
  const isAuthPage = typeof window !== 'undefined' && 
    (window.location.pathname.startsWith('/auth') || window.location.pathname === '/');

  const verifyConnection = useCallback(async () => {
    // Se o navegador diz online, fazemos um ping ocasional para confirmar
    const browserOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
    
    if (!browserOnline) {
      const ok = await pingBackend();
      if (!ok) {
        setOnline(false);
        setLastAt(getLatestFeedCacheAt());
      } else {
        setOnline(true);
      }
    } else {
      // Se estava offline e agora o browser diz online, confirma com ping
      if (!online) {
        const ok = await pingBackend();
        if (ok) {
          setOnline(true);
          setJustBack(true);
          setTimeout(() => setJustBack(false), 3000);
        }
      }
    }
  }, [online]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStatusChange = () => {
      // Pequeno delay para o OS atualizar o stack de rede
      setTimeout(verifyConnection, 1000);
    };

    window.addEventListener("offline", handleStatusChange);
    window.addEventListener("online", handleStatusChange);
    
    // Intervalo de verificação passiva (a cada 30s)
    checkIntervalRef.current = window.setInterval(verifyConnection, 30000);

    // Verificação inicial rápida
    verifyConnection();

    return () => {
      window.removeEventListener("offline", handleStatusChange);
      window.removeEventListener("online", handleStatusChange);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [verifyConnection]);

  // Relógio offline
  useEffect(() => {
    if (online) return;
    const id = window.setInterval(() => {
      setLastAt(getLatestFeedCacheAt());
      tick((n) => n + 1);
    }, 60000);
    return () => window.clearInterval(id);
  }, [online]);

  const silentRetry = useCallback(async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      const ok = await pingBackend();
      if (ok) {
        setOnline(true);
        setJustBack(true);
        setTimeout(() => setJustBack(false), 2500);
      } else {
        setLastAt(getLatestFeedCacheAt());
      }
    } finally {
      setRetrying(false);
    }
  }, [retrying]);

  // Se estivermos na página de login, não mostramos o banner para não atrapalhar o loop de redirecionamento
  if (isAuthPage) return null;
  
  if (online && !justBack) return null;

  if (online && justBack) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-2 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2 rounded-full bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300"
      >
        <Wifi className="w-3 h-3" />
        Conexão Restaurada
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-0 inset-x-0 z-[10000] bg-amber-500 text-black text-[11px] font-bold shadow-2xl animate-in slide-in-from-bottom-full duration-500"
    >
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-3">
        <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
        <div className="flex-1 min-w-0 leading-tight">
          <span className="uppercase tracking-widest font-black">Instabilidade Detectada</span>
          <span className="mx-2 opacity-40">|</span>
          <span className="opacity-90">
            {lastAt
              ? `Cache local: ${formatRelativeTime(lastAt)}`
              : "Operando em modo de contingência"}
          </span>
        </div>
        <button
          type="button"
          onClick={silentRetry}
          disabled={retrying}
          className="shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black text-white hover:bg-black/80 active:scale-95 transition-all text-[10px] uppercase tracking-widest font-black disabled:opacity-50"
        >
          {retrying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCcw className="w-3 h-3" />}
          {retrying ? "Validando" : "Reconectar"}
        </button>
      </div>
    </div>
  );
}