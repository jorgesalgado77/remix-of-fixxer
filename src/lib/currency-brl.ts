/**
 * Utilitários centralizados para máscara e validação de valores em Reais (BRL).
 * Todos os formulários que aceitam R$ devem usar estas funções para garantir
 * consistência de máscara, cursor, paste e integridade numérica no envio.
 */

/** Formata um número/string como "R$ 1.234,56" (usa toLocaleString pt-BR). */
export const formatBRL = (v: string | number): string => {
  const n = typeof v === "number" ? v : Number(v);
  if (v === "" || v === null || v === undefined || Number.isNaN(n)) return "R$ 0,00";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

/**
 * Aplica máscara BRL retornando apenas o corpo "12.345,67" (sem prefixo R$).
 * Ignora qualquer não-dígito — funciona com colagem/edit/delete/setas.
 */
export const maskCurrencyBRL = (raw: string): string => {
  const digits = (raw || "").replace(/\D/g, "").slice(0, 14);
  if (!digits) return "";
  const n = Number(digits) / 100;
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/** Converte string mascarada BRL para número (float). */
export const parseCurrencyBRL = (masked: string): number => {
  if (!masked) return 0;
  const digits = masked.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits) / 100;
};

/**
 * Verifica integridade entre string mascarada e o número gerado.
 * Retorna mensagem de erro ou null.
 */
export const assertCurrencyIntegrity = (
  label: string,
  masked: string,
  opts: { required?: boolean; min?: number; max?: number } = {},
): string | null => {
  const { required = false, min = 0, max = 9_999_999_999.99 } = opts;
  if (!masked || !masked.trim()) {
    return required ? `${label}: informe um valor.` : null;
  }
  const n = parseCurrencyBRL(masked);
  if (!Number.isFinite(n)) return `${label}: valor numérico inválido.`;
  if (n < min) return `${label}: valor deve ser ≥ ${formatBRL(min)}.`;
  if (n > max) return `${label}: valor acima do limite permitido.`;
  const back = maskCurrencyBRL(masked);
  if (back !== masked) {
    return `${label}: formato monetário inconsistente.`;
  }
  return null;
};

/**
 * Handler onKeyDown reutilizável: bloqueia caracteres que quebrariam a máscara,
 * mas mantém setas, backspace, delete, tab, home/end, ctrl+a/c/v/x, shift+select.
 */
export const currencyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  const allowedControl = [
    "Backspace",
    "Delete",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
    "Tab",
    "Enter",
    "Escape",
  ];
  if (allowedControl.includes(e.key)) return;
  if (e.ctrlKey || e.metaKey) return; // ctrl/cmd + a/c/v/x
  // Só aceita dígitos — a máscara injeta as pontuações
  if (!/^\d$/.test(e.key)) e.preventDefault();
};

/** Seleciona todo o conteúdo no focus para facilitar edição. */
export const currencyFocusSelect = (e: React.FocusEvent<HTMLInputElement>) => {
  requestAnimationFrame(() => {
    try {
      e.target.select();
    } catch {
      /* noop */
    }
  });
};

/**
 * Handler onPaste: extrai dígitos do conteúdo colado e reaplica a máscara.
 * Garante que colar "R$ 1.234,56" ou "1234.56" resulte em "1.234,56".
 */
export const currencyPaste =
  (setter: (v: string) => void) =>
  (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData?.getData("text") ?? "";
    setter(maskCurrencyBRL(text));
  };
