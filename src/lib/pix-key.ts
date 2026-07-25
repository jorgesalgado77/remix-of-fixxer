// Helpers para chave PIX: detecção automática, validação, máscara de exibição
// e formatação (CPF/CNPJ/telefone). Usado no editor de perfil e no perfil público.

export type PixKeyType = "cpf" | "cnpj" | "email" | "phone" | "random";

export const PIX_KEY_TYPE_LABELS: Record<PixKeyType, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "E-mail",
  phone: "Telefone",
  random: "Aleatória (EVP)",
};

const onlyDigits = (v: string) => (v || "").replace(/\D+/g, "");

/** Tenta detectar o tipo da chave a partir do conteúdo. Retorna null se não puder inferir. */
export function detectPixKeyType(raw: string): PixKeyType | null {
  const v = (raw || "").trim();
  if (!v) return null;
  // Chave aleatória (EVP) — UUID v4 estilo Banco Central
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) return "random";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "email";
  const d = onlyDigits(v);
  if (v.startsWith("+") || /^\+?55/.test(v)) {
    if (d.length >= 12 && d.length <= 13) return "phone";
  }
  if (d.length === 11 && v.length === d.length) return "cpf";
  if (d.length === 14) return "cnpj";
  if (d.length === 11) return "cpf"; // sem máscara
  if (d.length === 10 || d.length === 11) return "phone";
  return null;
}

/** Valida a chave para o tipo informado. Retorna erro amigável ou null se OK. */
export function validatePixKey(type: PixKeyType, raw: string): string | null {
  const v = (raw || "").trim();
  if (!v) return "Informe a chave PIX.";
  const d = onlyDigits(v);
  switch (type) {
    case "cpf":
      return d.length === 11 ? null : "CPF inválido (11 dígitos).";
    case "cnpj":
      return d.length === 14 ? null : "CNPJ inválido (14 dígitos).";
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "E-mail inválido.";
    case "phone":
      return d.length >= 10 && d.length <= 13 ? null : "Telefone inválido.";
    case "random":
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
        ? null
        : "Chave aleatória inválida (formato UUID).";
    default:
      return "Tipo desconhecido.";
  }
}

/** Formata a chave para exibição (aplica máscaras padrão brasileiras). */
export function formatPixKey(type: PixKeyType, raw: string): string {
  const v = (raw || "").trim();
  const d = onlyDigits(v);
  switch (type) {
    case "cpf":
      if (d.length !== 11) return v;
      return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
    case "cnpj":
      if (d.length !== 14) return v;
      return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
    case "phone":
      if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
      if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
      if (d.length === 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
      if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
      return v;
    default:
      return v;
  }
}

/** Máscara parcial para exibição pública. Mantém apenas parte visível da chave. */
export function maskPixKeyForDisplay(type: PixKeyType, raw: string): string {
  const v = (raw || "").trim();
  if (!v) return "";
  const formatted = formatPixKey(type, v);
  switch (type) {
    case "cpf": {
      const d = onlyDigits(v);
      if (d.length !== 11) return v.replace(/.(?=.{3})/g, "•");
      return `•••.${d.slice(3, 6)}.•••-${d.slice(9)}`;
    }
    case "cnpj": {
      const d = onlyDigits(v);
      if (d.length !== 14) return v.replace(/.(?=.{4})/g, "•");
      return `••.${d.slice(2, 5)}.•••/••••-${d.slice(12)}`;
    }
    case "email": {
      const [user, domain] = v.split("@");
      if (!domain) return v;
      const u = user.length <= 2 ? user[0] + "•" : user.slice(0, 2) + "•".repeat(Math.max(3, user.length - 2));
      return `${u}@${domain}`;
    }
    case "phone": {
      const d = onlyDigits(v);
      if (d.length < 4) return "•".repeat(d.length);
      const last = d.slice(-4);
      return formatted.replace(new RegExp(`\\d(?=.*${last})`, "g"), "•");
    }
    case "random": {
      const parts = v.split("-");
      if (parts.length === 5) return `${parts[0].slice(0, 4)}••••-••••-••••-••••-••••••••${parts[4].slice(-4)}`;
      return v.replace(/.(?=.{4})/g, "•");
    }
    default:
      return v;
  }
}
