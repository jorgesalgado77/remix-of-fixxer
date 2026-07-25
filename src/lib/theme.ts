/**
 * Fixxer — Theme controller
 * Modo Escuro (padrão) e Modo Claro com contraste correto.
 * Persiste em localStorage e sincroniza via CustomEvent "fixxer:theme".
 */

export type ThemeMode = "dark" | "light";

const STORAGE_KEY = "fixxer_theme";
const EVENT = "fixxer:theme";

export function getTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("light", mode === "light");
  root.classList.toggle("dark", mode !== "light");
  root.style.colorScheme = mode === "light" ? "light" : "dark";
}

export function setTheme(mode: ThemeMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
  applyTheme(mode);
  try {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { mode } }));
  } catch {
    /* ignore */
  }
}

/** Chame uma vez no bootstrap do app. Idempotente. */
export function initTheme() {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (w.__fixxerThemeInit) return;
  w.__fixxerThemeInit = true;
  applyTheme(getTheme());
}

/** Assina mudanças de tema (retorna unsubscribe). */
export function subscribeTheme(cb: (mode: ThemeMode) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail as { mode?: ThemeMode } | undefined;
    cb(detail?.mode ?? getTheme());
  };
  window.addEventListener(EVENT, handler as EventListener);
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb(getTheme());
  };
  window.addEventListener("storage", storageHandler);
  return () => {
    window.removeEventListener(EVENT, handler as EventListener);
    window.removeEventListener("storage", storageHandler);
  };
}
