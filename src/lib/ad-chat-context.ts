/**
 * FIXXER — Contexto de anúncio para abertura do chat.
 * ---------------------------------------------------
 * Quando um usuário clica em "SOLICITAR ORÇAMENTO"/"FALAR NO CHAT" num
 * card do Feed, empacotamos o resumo do anúncio + mídia principal em
 * sessionStorage sob a chave do peerId. A rota /chat/$peerId lê e
 * consome (one-shot) esse contexto, pré-preenchendo o composer com
 * uma "referência de card" formatada em texto para acompanhar a 1ª
 * mensagem — assim o criador recebe imediatamente o contexto de qual
 * anúncio o interessado está falando, mesmo antes de qualquer envio.
 *
 * Não usamos localStorage: contexto é intencionalmente efêmero (só
 * vale para a próxima abertura da conversa).
 */

export interface AdChatContext {
  adId: string;
  title: string;
  category?: string;
  cover?: string | null;   // URL de imagem principal, se houver
  priceLabel?: string | null;
  urgency?: string | null;
  cta?: "orcamento" | "chat";
  createdAt: string;
}

const KEY_PREFIX = "fixxer:ad-chat-ctx:";

function safeSession(): Storage | null {
  if (typeof window === "undefined") return null;
  try { return window.sessionStorage; } catch { return null; }
}

export function setAdChatContext(peerId: string, ctx: Omit<AdChatContext, "createdAt">): void {
  const ss = safeSession();
  if (!ss || !peerId) return;
  try {
    ss.setItem(KEY_PREFIX + peerId, JSON.stringify({ ...ctx, createdAt: new Date().toISOString() }));
  } catch { /* ignore quota */ }
}

/** Consome o contexto uma única vez (remove após leitura). */
export function consumeAdChatContext(peerId: string): AdChatContext | null {
  const ss = safeSession();
  if (!ss || !peerId) return null;
  try {
    const raw = ss.getItem(KEY_PREFIX + peerId);
    if (!raw) return null;
    ss.removeItem(KEY_PREFIX + peerId);
    return JSON.parse(raw) as AdChatContext;
  } catch { return null; }
}

/** Formata o contexto como mensagem inicial pronta para o composer. */
export function formatAdContextAsMessage(ctx: AdChatContext): string {
  const lines: string[] = [];
  const header = ctx.cta === "chat" ? "💬 Falando sobre o anúncio:" : "💬 Solicitando orçamento sobre:";
  lines.push(header);
  lines.push(`📢 ${ctx.title}`);
  if (ctx.priceLabel) lines.push(`💰 ${ctx.priceLabel}`);
  if (ctx.urgency) lines.push(`⚡ Urgência: ${ctx.urgency}`);
  if (ctx.cover) lines.push(`🖼️ ${ctx.cover}`);
  lines.push("");
  lines.push("Olá! Tenho interesse — poderia me dar mais detalhes?");
  return lines.join("\n");
}
