import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Persistência de estado de UI do Feed (busca, filtros, paginação, etc.)
 * em localStorage — sobrevive a reload, troca de feed e refresh.
 *
 * Chaves recomendadas: `fixxer_feed_<categoria>_<campo>` (ex.
 * `fixxer_feed_prestador_search`). Serialização JSON para suportar objetos.
 *
 * Segurança: só grava se `window` existir (SSR-safe) e engole erros de
 * quota — o estado sempre se comporta como um `useState` normal.
 */
export function usePersistedState<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initial;
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  });

  const firstRun = useRef(true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    // evita reescrever com o valor inicial idêntico no primeiro render
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // quota / modo privado — ignorar
    }
  }, [key, value]);

  const set = useCallback((v: T | ((prev: T) => T)) => setValue(v), []);
  return [value, set];
}

/** Leitura pontual sem hook (útil em `useState` inicializadores externos). */
export function readPersisted<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
