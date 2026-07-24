import { supabaseExternal } from "./supabaseExternal";

const REF_STORAGE_KEY = "fixxer_ref";
const REF_TTL_DAYS = 30;

interface RefPayload {
  code: string;
  savedAt: number;
}

/** Salva o código de indicação capturado da URL /r/:code */
export function captureReferralCode(code: string): void {
  if (typeof window === "undefined" || !code) return;
  const payload: RefPayload = { code: code.trim().toLowerCase(), savedAt: Date.now() };
  try {
    localStorage.setItem(REF_STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn("[FIXXER Affiliate]: falha ao salvar código de indicação", e);
  }
}

/** Lê o código salvo (respeita TTL de 30 dias) */
export function getStoredReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REF_STORAGE_KEY);
    if (!raw) return null;
    const payload: RefPayload = JSON.parse(raw);
    const ageDays = (Date.now() - payload.savedAt) / (1000 * 60 * 60 * 24);
    if (ageDays > REF_TTL_DAYS) {
      localStorage.removeItem(REF_STORAGE_KEY);
      return null;
    }
    return payload.code;
  } catch {
    return null;
  }
}

export function clearReferralCode(): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(REF_STORAGE_KEY); } catch {}
}

/**
 * Anexa o referral (chamado após signup bem-sucedido).
 * Idempotente: se já existe uma linha para o referred_user_id, não duplica.
 */
export async function attachReferralAfterSignup(userId: string): Promise<{ attached: boolean; error?: string }> {
  const code = getStoredReferralCode();
  if (!code) return { attached: false };

  try {
    // 1. Localiza o afiliado pelo código
    const { data: affiliate, error: affErr } = await supabaseExternal
      .from("affiliate_profiles")
      .select("user_id, active")
      .eq("code", code)
      .maybeSingle();

    if (affErr || !affiliate || !affiliate.active) {
      clearReferralCode();
      return { attached: false, error: "código de indicação inválido ou inativo" };
    }

    // Evita auto-indicação
    if (affiliate.user_id === userId) {
      clearReferralCode();
      return { attached: false, error: "auto-indicação bloqueada" };
    }

    // 2. Insere a referral (unique em referred_user_id evita duplicata)
    const { error: insErr } = await supabaseExternal
      .from("affiliate_referrals")
      .insert({
        affiliate_user_id: affiliate.user_id,
        referred_user_id: userId,
        source: "signup",
        code,
      });

    if (insErr && !insErr.message.includes("duplicate")) {
      return { attached: false, error: insErr.message };
    }

    clearReferralCode();
    return { attached: true };
  } catch (e: any) {
    return { attached: false, error: e?.message || "erro desconhecido" };
  }
}

/** Gera slug de código sugerido baseado no nome */
export function suggestAffiliateCode(fullName: string): string {
  return (fullName || "afiliado")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 12)
    .padEnd(6, "0") + Math.floor(Math.random() * 1000).toString().padStart(3, "0");
}

export function buildReferralUrl(code: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://fixxerhub.lovable.app";
  return `${origin}/r/${code}`;
}
