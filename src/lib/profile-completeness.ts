/**
 * Validação única de completude do perfil (store_profiles / profiles).
 *
 * Regra: cada categoria de usuário define os campos obrigatórios mínimos
 * para liberar as funções restritas (Criar Serviço, Avaliações, etc.).
 * Assim que a linha do perfil no banco (ou o cache local no mesmo formato)
 * tiver todos os campos preenchidos, `complete` fica `true` e a UI deve
 * liberar as funções sem exigir recarregar a página.
 *
 * IMPORTANTE: para o papel `lojista`, esta lista deve espelhar EXATAMENTE
 * a validação do submit do formulário em `LojistaPage.tsx` (linha ~2972),
 * senão o usuário salva "com sucesso" mas os botões continuam travados.
 * Campos aqui = Nome empresa, CNPJ (14), Responsável, E-mail, WhatsApp (>=10),
 * CEP (8), Endereço, Número, Cidade, Estado, Ramo de atividade.
 */

export type ProfileRole =
  | "lojista"
  | "prestador"
  | "fornecedor"
  | "cliente"
  | "casual"
  | "admin";

type RequiredField = {
  key: string;
  label: string;
  /** Validador opcional. Se ausente, usa `hasValue` (não-vazio). */
  validate?: (v: any) => boolean;
};

const onlyDigits = (v: any) => String(v ?? "").replace(/\D/g, "");
const isEmail = (v: any) =>
  typeof v === "string" && /^\S+@\S+\.\S+$/.test(v.trim());
const isCnpj = (v: any) => onlyDigits(v).length === 14;
const isCpfOrCnpj = (v: any) => {
  const d = onlyDigits(v).length;
  return d === 11 || d === 14;
};
const isCep = (v: any) => onlyDigits(v).length === 8;
const isPhoneBR = (v: any) => onlyDigits(v).length >= 10;

const COMMON_CONTACT: RequiredField[] = [
  { key: "responsible_name", label: "Nome do responsável" },
  { key: "email_contact", label: "E-mail de contato", validate: isEmail },
  { key: "whatsapp", label: "WhatsApp", validate: isPhoneBR },
  { key: "zipcode", label: "CEP", validate: isCep },
];

const ADDRESS_FIELDS: RequiredField[] = [
  { key: "address", label: "Endereço" },
  { key: "city", label: "Cidade" },
  { key: "state", label: "Estado" },
];

const REQUIRED_BY_ROLE: Record<ProfileRole, RequiredField[]> = {
  lojista: [
    { key: "company_name", label: "Nome da empresa" },
    { key: "cnpj", label: "CNPJ válido", validate: isCnpj },
    ...COMMON_CONTACT,
    ...ADDRESS_FIELDS,
    { key: "activity_branch", label: "Ramo de atividade" },
  ],
  prestador: [
    { key: "company_name", label: "Nome / Razão social" },
    { key: "cnpj", label: "CPF ou CNPJ", validate: isCpfOrCnpj },
    ...COMMON_CONTACT,
    { key: "activity_branch", label: "Especialidade" },
  ],
  fornecedor: [
    { key: "company_name", label: "Nome da empresa" },
    { key: "cnpj", label: "CNPJ válido", validate: isCnpj },
    ...COMMON_CONTACT,
    { key: "activity_branch", label: "Segmento de fornecimento" },
  ],
  cliente: [
    { key: "responsible_name", label: "Nome completo" },
    { key: "email_contact", label: "E-mail de contato", validate: isEmail },
    { key: "whatsapp", label: "WhatsApp", validate: isPhoneBR },
    { key: "zipcode", label: "CEP", validate: isCep },
  ],
  casual: [
    { key: "responsible_name", label: "Nome completo" },
    { key: "email_contact", label: "E-mail de contato", validate: isEmail },
    { key: "whatsapp", label: "WhatsApp", validate: isPhoneBR },
    { key: "zipcode", label: "CEP", validate: isCep },
  ],
  admin: [],
};

export interface ProfileCompletenessResult {
  complete: boolean;
  missing: string[];
  missingLabels: string[];
  role: ProfileRole;
}

function normalizeRole(role?: string | null): ProfileRole {
  const r = (role || "lojista").toLowerCase();
  if (r === "casual") return "cliente";
  if (["lojista", "prestador", "fornecedor", "cliente", "admin"].includes(r)) {
    return r as ProfileRole;
  }
  return "lojista";
}

function hasValue(v: any): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

/**
 * Avalia se o perfil de um usuário está completo para liberar as funções
 * restritas. Aceita a linha bruta de `store_profiles`/`profiles` do Supabase.
 */
export function evaluateProfileCompleteness(
  role: string | null | undefined,
  data: Record<string, any> | null | undefined,
): ProfileCompletenessResult {
  const normalizedRole = normalizeRole(role);
  const required = REQUIRED_BY_ROLE[normalizedRole] ?? [];

  if (!data) {
    return {
      complete: required.length === 0,
      missing: required.map((f) => f.key),
      missingLabels: required.map((f) => f.label),
      role: normalizedRole,
    };
  }

  const missingFields = required.filter((f) => {
    const value = data[f.key];
    if (!hasValue(value)) return true;
    if (f.validate && !f.validate(value)) return true;
    return false;
  });

  const result: ProfileCompletenessResult = {
    complete: missingFields.length === 0,
    missing: missingFields.map((f) => f.key),
    missingLabels: missingFields.map((f) => f.label),
    role: normalizedRole,
  };

  if (!result.complete) {
    console.info(
      `[profile-completeness] role="${normalizedRole}" incompleto. Campos faltando:`,
      result.missingLabels,
    );
  }

  return result;
}

/**
 * Mensagem única para toasts/fallbacks quando o perfil não está completo.
 */
export function describeMissing(result: ProfileCompletenessResult): string {
  if (result.complete) return "Perfil completo.";
  if (result.missingLabels.length === 0) return "Perfil incompleto.";
  return `Preencha para liberar: ${result.missingLabels.join(", ")}.`;
}
