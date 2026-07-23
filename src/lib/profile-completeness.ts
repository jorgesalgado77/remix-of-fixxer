/**
 * Validação única de completude do perfil (store_profiles / profiles).
 *
 * Regra: cada categoria de usuário define os campos obrigatórios mínimos
 * para liberar as funções restritas (Criar Serviço, Avaliações, etc.).
 * Assim que a linha do perfil no banco (ou o cache local no mesmo formato)
 * tiver todos os campos preenchidos, `complete` fica `true` e a UI deve
 * liberar as funções sem exigir recarregar a página.
 *
 * A avaliação é role-agnóstica e serve para todos os dashboards.
 */

export type ProfileRole =
  | "lojista"
  | "prestador"
  | "fornecedor"
  | "cliente"
  | "casual"
  | "admin";

type RequiredField = { key: string; label: string };

const COMMON_CONTACT: RequiredField[] = [
  { key: "responsible_name", label: "Nome do responsável" },
  { key: "email_contact", label: "E-mail de contato" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "phone", label: "Telefone" },
  { key: "zipcode", label: "CEP" },
];

const REQUIRED_BY_ROLE: Record<ProfileRole, RequiredField[]> = {
  lojista: [
    { key: "company_name", label: "Nome da empresa" },
    { key: "cnpj", label: "CNPJ" },
    ...COMMON_CONTACT,
    { key: "activity_branch", label: "Ramo de atividade" },
    { key: "logo_url", label: "Logo da empresa" },
  ],
  prestador: [
    { key: "company_name", label: "Nome / Razão social" },
    { key: "cnpj", label: "CPF ou CNPJ" },
    ...COMMON_CONTACT,
    { key: "activity_branch", label: "Especialidade" },
    { key: "logo_url", label: "Foto de perfil" },
  ],
  fornecedor: [
    { key: "company_name", label: "Nome da empresa" },
    { key: "cnpj", label: "CNPJ" },
    ...COMMON_CONTACT,
    { key: "activity_branch", label: "Segmento de fornecimento" },
    { key: "logo_url", label: "Logo da empresa" },
  ],
  cliente: [
    { key: "responsible_name", label: "Nome completo" },
    { key: "email_contact", label: "E-mail de contato" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "zipcode", label: "CEP" },
  ],
  casual: [
    { key: "responsible_name", label: "Nome completo" },
    { key: "email_contact", label: "E-mail de contato" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "zipcode", label: "CEP" },
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

  const missingFields = required.filter((f) => !hasValue(data[f.key]));

  const result: ProfileCompletenessResult = {
    complete: missingFields.length === 0,
    missing: missingFields.map((f) => f.key),
    missingLabels: missingFields.map((f) => f.label),
    role: normalizedRole,
  };

  if (!result.complete) {
    // Log de debug amigável para investigar rapidamente qual campo bloqueia
    // a liberação das funções na dashboard.
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
