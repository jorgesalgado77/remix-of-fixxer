/**
 * Utilitários de envio de mensagens do chat.
 *
 * Motivação:
 * - `messages.sender_id` é `uuid` NOT NULL e há RLS `auth.uid() = sender_id`.
 *   Qualquer INSERT com um UID sintético (`local-*`, string vazia, undefined)
 *   ou sem sessão válida falha e trava a tela. Este módulo centraliza a
 *   validação e a classificação do erro para que o chamador possa reagir
 *   corretamente (redirecionar para /auth, tentar novamente, exibir toast).
 */

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

export type ChatErrorKind =
  | "session"   // sem sessão / JWT expirado / RLS negando por identidade
  | "rls"       // policy negou (uid válido, mas sem permissão)
  | "network"   // falha transitória de rede/timeout
  | "validation"// payload inválido (uid não-uuid, colunas ausentes)
  | "unknown";

export type ClassifiedChatError = {
  kind: ChatErrorKind;
  message: string;
  retryable: boolean;
};

/**
 * Classifica erros do Supabase/PostgREST para orientar retry vs. re-login.
 *
 * Códigos observados:
 * - PGRST301 / 401 → JWT ausente ou expirado (sessão)
 * - 42501         → RLS/GRANT bloqueou (não tenta de novo silenciosamente)
 * - 22P02         → uuid inválido no payload (validação)
 * - TypeError "Failed to fetch" / AbortError → rede transitória
 */
export function classifyChatError(err: unknown): ClassifiedChatError {
  const e = err as any;
  const code = String(e?.code ?? e?.status ?? "");
  const raw = String(e?.message ?? e ?? "");
  const msg = raw.toLowerCase();

  if (
    code === "401" ||
    code === "PGRST301" ||
    msg.includes("jwt") ||
    msg.includes("not authenticated") ||
    msg.includes("no api key") ||
    msg.includes("session")
  ) {
    return { kind: "session", message: raw || "Sessão expirada", retryable: false };
  }
  if (code === "42501" || msg.includes("row-level security") || msg.includes("permission denied")) {
    const isBlocked = msg.includes("blocked") || msg.includes("user_blocks");
    return { 
      kind: "rls", 
      message: isBlocked ? "Você não pode enviar mensagens para este usuário." : (raw || "Sem permissão para enviar"), 
      retryable: false 
    };
  }
  if (code === "22P02" || msg.includes("invalid input syntax for type uuid")) {
    return { kind: "validation", message: raw || "Identificador inválido", retryable: false };
  }
  if (
    e?.name === "AbortError" ||
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("timeout") ||
    msg.includes("load failed")
  ) {
    return { kind: "network", message: raw || "Falha de rede", retryable: true };
  }
  return { kind: "unknown", message: raw || "Erro desconhecido", retryable: false };
}

/**
 * Executa `op` com retry exponencial apenas para erros classificados como
 * `network`. Erros de sessão/RLS/validação sobem imediatamente para o caller.
 */
export async function sendWithRetry<T>(
  op: () => Promise<T>,
  opts: { retries?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const retries = opts.retries ?? 2;
  const base = opts.baseDelayMs ?? 400;
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await op();
    } catch (err) {
      const c = classifyChatError(err);
      if (!c.retryable || attempt >= retries) throw err;
      const delay = base * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
      attempt++;
    }
  }
}

/**
 * Valida o par (senderUid, peerId) antes de qualquer INSERT em `messages`.
 * Implementa filtros de Anti-Bypass (telefone, email, links) e verificação de bloqueio.
 */
export function validateChatIdentities(senderUid: unknown, peerId: unknown): {
  ok: boolean;
  reason?: "sender" | "peer" | "same" | "blocked" | "content";
  message?: string;
} {
  if (!isUuid(senderUid)) return { ok: false, reason: "sender" };
  if (!isUuid(peerId)) return { ok: false, reason: "peer" };
  if (senderUid === peerId) return { ok: false, reason: "same" };

  // Verificação de bloqueio via lib/moderation (usa cache local + remote effort)
  // Nota: Usamos require condicional para evitar dependência circular e falhas em ambientes de teste puro
  try {
    const mod = require("./moderation");
    if (mod && typeof mod.isUserBlocked === "function" && mod.isUserBlocked(peerId)) {
      return { 
        ok: false, 
        reason: "blocked", 
        message: "Você não pode enviar mensagens para este usuário porque ele está bloqueado ou bloqueou você." 
      };
    }
  } catch (e) {
    // Silencioso: moderation pode falhar em testes ou ambiente SSR se não houver localStorage
  }
  
  return { ok: true };
}

const BYPASS_PATTERNS = [
  /\b(?:\d[ -]?){8,11}\b/g, // Telefone/WhatsApp aproximado
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
  /\b(?:https?:\/\/|www\.)\S+\b/gi, // Links
  /\b(?:wpp|zap|whats|contato|meu num)\b/gi // Gatilhos comuns
];

/**
 * Escaneia conteúdo em busca de tentativas de bypass de plataforma.
 * Retorna true se detectar algo suspeito.
 */
export function detectContactBypass(text: string): boolean {
  const clean = text.toLowerCase();
  return BYPASS_PATTERNS.some(re => re.test(clean));
}
