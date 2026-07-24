/**
 * FIXXER · Status do Perfil (pendente / ativo / bloqueado)
 * --------------------------------------------------------
 * Regras:
 *  - Um perfil é ATIVO quando todos os campos obrigatórios estão preenchidos.
 *  - Caso contrário, é PENDENTE (não pode publicar anúncios / abrir solicitações).
 *  - O status "bloqueado" é definido apenas pelo Admin Master e não é sobrescrito
 *    automaticamente por este módulo.
 *
 * Persistência: coluna `profiles.status` no Supabase externo.
 */
import { supabaseExternal } from "@/lib/supabaseExternal";
import { toast } from "sonner";

export type ProfileStatus = "ativo" | "pendente" | "bloqueado";

export interface ProfileLike {
  id?: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  document_number?: string | null;
  city?: string | null;
  state?: string | null;
  business_category?: string | null;
  status?: ProfileStatus | string | null;
  user_type?: string | null;
}

export interface ProfileValidation {
  complete: boolean;
  missing: string[];       // rótulos amigáveis
  missingKeys: string[];   // chaves técnicas
  status: ProfileStatus;
}

const REQUIRED_FIELDS: Array<{ key: keyof ProfileLike; label: string }> = [
  { key: "full_name",         label: "Nome completo" },
  { key: "email",             label: "E-mail" },
  { key: "phone",             label: "Telefone / WhatsApp" },
  { key: "document_number",   label: "CPF ou CNPJ" },
  { key: "city",              label: "Cidade" },
  { key: "state",             label: "UF" },
  { key: "business_category", label: "Categoria de atuação" },
];

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/** Calcula validação sem tocar no banco. */
export function validateProfile(profile: ProfileLike | null | undefined): ProfileValidation {
  if (!profile) {
    return {
      complete: false,
      missing: REQUIRED_FIELDS.map(f => f.label),
      missingKeys: REQUIRED_FIELDS.map(f => String(f.key)),
      status: "pendente",
    };
  }
  const missing: string[] = [];
  const missingKeys: string[] = [];
  for (const f of REQUIRED_FIELDS) {
    if (isEmpty(profile[f.key])) {
      missing.push(f.label);
      missingKeys.push(String(f.key));
    }
  }
  const complete = missing.length === 0;
  // preserva 'bloqueado' se já estiver setado pelo admin
  const status: ProfileStatus =
    profile.status === "bloqueado" ? "bloqueado" : (complete ? "ativo" : "pendente");
  return { complete, missing, missingKeys, status };
}

/**
 * Sincroniza o status persistido em `profiles` com a validação.
 * Não sobrescreve 'bloqueado'. Retorna a validação calculada.
 */
export async function syncProfileStatus(
  userId: string,
  profile: ProfileLike,
): Promise<ProfileValidation> {
  const v = validateProfile(profile);
  const current = profile.status ?? null;

  if (current === "bloqueado") return { ...v, status: "bloqueado" };
  if (current === v.status) return v;

  try {
    await supabaseExternal
      .from("profiles")
      .update({ status: v.status, updated_at: new Date().toISOString() })
      .eq("id", userId);
  } catch (e) {
    console.warn("[profile-status] falha ao sincronizar status", e);
  }
  return v;
}

/**
 * Guarda para ações sensíveis (publicar anúncio, abrir solicitação, chat B2B, etc.).
 * Se o perfil não estiver completo, mostra toast e retorna false.
 */
export function assertProfileActive(
  profile: ProfileLike | null | undefined,
  actionLabel = "Esta ação",
): boolean {
  const v = validateProfile(profile);
  if (profile?.status === "bloqueado") {
    toast.error("Conta bloqueada", {
      description: "Seu acesso está suspenso. Fale com o suporte.",
    });
    return false;
  }
  if (!v.complete) {
    toast.warning(`${actionLabel} exige perfil completo`, {
      description: `Faltando: ${v.missing.join(", ")}`,
      action: {
        label: "Completar",
        onClick: () => { window.location.href = "/profile"; },
      },
    });
    return false;
  }
  return true;
}
