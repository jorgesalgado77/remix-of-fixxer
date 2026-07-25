/**
 * FIXXER — Anti-Bypass Guard
 * ---------------------------------------------------------------
 * Detecta e mascara tentativas de compartilhar contatos externos
 * (telefone, e-mail, redes sociais, links) em mensagens do Chat
 * e em campos de Propostas. O envio de contatos direto é proibido
 * pelos Termos: toda comunicação deve ocorrer via chat oficial.
 */

const PHONE_RE =
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,3}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4}/g;
const EMAIL_RE = /[A-Z0-9._%+-]+\s*(?:@|\(at\)|\[at\])\s*[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL_RE = /\b((?:https?:\/\/|www\.)[^\s]+|[A-Z0-9-]+\.(?:com|com\.br|net|org|io|app|me|tv|xyz|dev)(?:\/[^\s]*)?)/gi;
const SOCIAL_RE =
  /\b(?:@[a-z0-9_.]{3,}|instagram|insta|facebook|fb\.com|t\.me|telegram|whats?app|wa\.me|tiktok|linkedin|youtube|yt\.be|snapchat|threads|x\.com|twitter)\b[^\s]*/gi;
const WORD_DIGIT_RE =
  /\b(?:zero|um|dois|tr[eê]s|quatro|cinco|seis|sete|oito|nove)(?:\s+(?:zero|um|dois|tr[eê]s|quatro|cinco|seis|sete|oito|nove)){6,}/gi;

const PATTERNS: RegExp[] = [PHONE_RE, EMAIL_RE, URL_RE, SOCIAL_RE, WORD_DIGIT_RE];

export interface GuardResult {
  clean: string;
  violated: boolean;
  matches: string[];
}

/** Sanitiza texto substituindo trechos sensíveis por asteriscos. */
export function sanitizeContactText(input: string): GuardResult {
  if (!input) return { clean: input, violated: false, matches: [] };
  let out = input;
  const matches: string[] = [];
  for (const re of PATTERNS) {
    out = out.replace(re, (m) => {
      matches.push(m);
      return "[CONTEÚDO BLOQUEADO: ************]";
    });
  }
  return { clean: out, violated: matches.length > 0, matches };
}

export const CONTACT_GUARD_WARNING =
  "⚠️ AVISO DE SEGURANÇA: O envio de contatos telefônicos, e-mails ou redes sociais é proibido pelos termos da plataforma. Utilize o chat oficial para sua segurança.";
