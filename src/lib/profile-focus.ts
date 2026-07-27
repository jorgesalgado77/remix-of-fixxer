/**
 * Utilitário para localizar, rolar e realçar um campo do formulário /profile
 * a partir de uma chave lógica (ex.: "whatsapp", "cnpj", "address").
 *
 * Usado quando o card amarelo do painel envia `?focus=<chave>` na URL:
 * o /profile chama `focusProfileField` até encontrar o elemento com
 * `[data-profile-field="<chave>"]` (o campo pode montar depois do loading).
 *
 * Testável em jsdom: recebe `root` opcional (default `document`).
 */

export type FocusFieldResult =
  | { ok: true; element: HTMLElement }
  | { ok: false; reason: "not-found" | "invalid-key" };

const HIGHLIGHT_CLASSES = ["ring-2", "ring-amber-400/70", "rounded-2xl"];

export function findProfileField(
  key: string | null | undefined,
  root: Document | HTMLElement = typeof document !== "undefined" ? document : (null as any),
): HTMLElement | null {
  if (!key || typeof key !== "string") return null;
  if (!root) return null;
  // Escapa aspas para evitar seletores inválidos.
  const safe = key.replace(/["\\]/g, "");
  try {
    return root.querySelector(`[data-profile-field="${safe}"]`) as HTMLElement | null;
  } catch {
    return null;
  }
}

/**
 * Tenta focar um campo. Retorna resultado imediato (sem retry).
 * O caller aplica a política de retry (montagem tardia após loading).
 */
export function focusProfileField(
  key: string | null | undefined,
  opts: { root?: Document | HTMLElement; highlightMs?: number } = {},
): FocusFieldResult {
  if (!key || typeof key !== "string" || key.trim() === "") {
    return { ok: false, reason: "invalid-key" };
  }
  const el = findProfileField(key, opts.root ?? document);
  if (!el) return { ok: false, reason: "not-found" };

  try {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch {
    // jsdom não implementa scrollIntoView em todos os elementos — ignore.
  }
  const input = el.querySelector("input,textarea,select") as HTMLElement | null;
  input?.focus?.();

  el.classList.add(...HIGHLIGHT_CLASSES);
  const ms = opts.highlightMs ?? 2400;
  if (typeof window !== "undefined") {
    window.setTimeout(() => el.classList.remove(...HIGHLIGHT_CLASSES), ms);
  }
  return { ok: true, element: el };
}

/**
 * Executa `focusProfileField` com retry exponencial curto, para o caso
 * do campo montar depois do primeiro tick (carregamento do /profile).
 * Retorna Promise que resolve com o resultado final.
 */
export function focusProfileFieldWithRetry(
  key: string | null | undefined,
  opts: {
    root?: Document | HTMLElement;
    highlightMs?: number;
    tries?: number;
    delayMs?: number;
  } = {},
): Promise<FocusFieldResult> {
  const tries = Math.max(1, opts.tries ?? 15);
  const delay = Math.max(20, opts.delayMs ?? 200);
  return new Promise((resolve) => {
    let attempt = 0;
    const run = () => {
      const result = focusProfileField(key, { root: opts.root, highlightMs: opts.highlightMs });
      if (result.ok || result.reason === "invalid-key") return resolve(result);
      attempt += 1;
      if (attempt >= tries) return resolve(result);
      if (typeof window !== "undefined") window.setTimeout(run, delay);
      else resolve(result);
    };
    run();
  });
}
