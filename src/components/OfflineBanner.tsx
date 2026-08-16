import { useEffect, useRef, useState, useCallback } from "react";
import { WifiOff, Wifi, RefreshCcw, Loader2 } from "lucide-react";
import { getLatestFeedCacheAt, formatRelativeTime } from "@/lib/feed-cache";
import { supabaseExternal } from "@/lib/supabaseExternal";

/**
 * Banner global de modo offline — Versão "Silêncio Total".
 * 
 * Correções PROMPT 24.3:
 * 1. Oculta o banner em páginas de autenticação (/auth) e na home (/) por padrão.
 * 2. Aumenta o rigor da detecção: só mostra se navigator.onLine for false E o ping falhar 2 vezes seguidas.
 * 3. Se estiver em loop de login, o banner é forçado a ficar oculto para não interferir nos redirecionamentos.
 */

const PING_TIMEOUT_MS = 3000;
const MAX_PING_RETRIES = 2;

async function pingBackend(): Promise<boolean> {
  for (let i = 0; i < MAX_PING_RETRIES; i++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
      
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
      if (res.status >= 200 && res.status < 500) return true;
    } catch (e) {
      if (i === MAX_PING_RETRIES - 1) return false;
      // Pequeno intervalo entre retentativas
      await new Promise(r => setTimeout(r, 500));
    }
  }
  return false;
}

export function OfflineBanner() {
  const [online, setOnline] = useState<boolean>(true);
  const [justBack, setJustBack] = useState(false);
  const [lastAt, setLastAt] = useState<number | null>(null);
  const [retrying, setRetrying] = useState(false);
  const checkIntervalRef = useRef<number | null>(null);
  
  // Detecta se estamos na tela de login ou home (onde o loop costuma ocorrer)
  const isCriticalPath = typeof window !== 'undefined' && 
    (window.location.pathname.startsWith('/auth') || window.location.pathname === '/' || window.location.pathname === '');

  const verifyConnection = useCallback(async () => {
    const browserOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
    
    if (!browserOnline) {
      // Confirmar com ping triplo antes de assumir offline
      const ok = await pingBackend();
      if (!ok) {
        setOnline(false);
        setLastAt(getLatestFeedCacheAt());
      } else {
        setOnline(true);
      }
    } else {
      // Se browser diz online, mas estávamos offline, confirma restauração
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
      setTimeout(verifyConnection, 1500);
    };

    window.addEventListener("offline", handleStatusChange);
    window.addEventListener("online", handleStatusChange);
    
    checkIntervalRef.current = window.setInterval(verifyConnection, 45000); // Checagem passiva lenta
    verifyConnection();

    return () => {
      window.removeEventListener("offline", handleStatusChange);
      window.removeEventListener("online", handleStatusChange);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [verifyConnection]);

  const silentRetry = useCallback(async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      const ok = await pingBackend();
      if (ok) {
        setOnline(true);
        setJustBack(true);
        setTimeout(() => setJustBack(false), 2500);
      }
    } finally {
      setRetrying(false);
    }
  }, [retrying]);

  // REGRA MESTRA: Nunca mostrar o banner em páginas de auth ou se estiver carregando login
  if (isCriticalPath) return null;
  
  if (online && !justBack) return null;

  if (online && justBack) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-2 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2 rounded-full bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300"
      >
        <Wifi className="w-3 h-3" />
        Sinal Recuperado
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[10000] bg-amber-500 text-black text-[11px] font-bold shadow-2xl animate-in slide-in-from-top-full duration-500"
    >
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-3">
        <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
        <div className="flex-1 min-w-0 leading-tight">
          <span className="uppercase tracking-widest font-black">Conexão Instável</span>
          <span className="mx-2 opacity-40">|</span>
          <span className="opacity-90">Modo de contingência ativado</span>
        </div>
        <button
          type="button"
          onClick={silentRetry}
          disabled={retrying}
          className="shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black text-white hover:bg-black/80 active:scale-95 transition-all text-[10px] uppercase tracking-widest font-black"
        >
          {retrying ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCcw className="w-3 h-3" />}
          Reconectar
        </button>
      </div>
    </div>
  );
}