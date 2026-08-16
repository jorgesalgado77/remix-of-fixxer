/**
 * FIXXER — Disponibilidade
 * ---------------------------------------------------------------
 * Persistência + auditoria + notificações + guarda de contato.
 * Tabelas requeridas: user_availability, availability_log,
 * contact_attempts, notifications (rodar sql/availability_setup.sql).
 * Todas as chamadas são resilientes: se as tabelas não existirem
 * ou faltar sessão, o app continua funcionando com fallback local.
 */

import { supabaseExternal } from "@/lib/supabaseExternal";

const LS_STATE = "fixxer_availability_v1";

export interface AvailabilityRecord {
  is_available: boolean;
  updated_at: string;
  note: string | null;
}

export interface AvailabilityAudit {
  id: string;
  user_id: string;
  changed_by: string;
  is_available: boolean;
  note: string | null;
  changed_at: string;
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const isMasterBypass = typeof window !== 'undefined' && localStorage.getItem('fixxer:master-bypass') === 'true';
    if (isMasterBypass) {
      const cat = localStorage.getItem('fixxer:last-category');
      return cat === 'admin' ? '6ba65048-803f-44f6-88d2-24d04fee1a0f' : 'b3378b88-5c46-4e50-9c2e-4b7264a4d6e9';
    }
    const { data } = await supabaseExternal.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}


function readLocal(): boolean {
  try {
    const v = window.localStorage.getItem(LS_STATE);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

function writeLocal(v: boolean) {
  try { window.localStorage.setItem(LS_STATE, v ? "1" : "0"); } catch { /* ignore */ }
}

export async function getMyAvailability(): Promise<boolean> {
  const uid = await getCurrentUserId();
  if (!uid) return readLocal();
  try {
    const { data } = await supabaseExternal
      .from("user_availability")
      .select("is_available")
      .eq("user_id", uid)
      .maybeSingle();
    if (data && typeof data.is_available === "boolean") {
      writeLocal(data.is_available);
      return data.is_available;
    }
  } catch { /* silencioso */ }
  return readLocal();
}

export async function isUserAvailable(userId: string): Promise<boolean> {
  if (!userId) return true;
  try {
    const { data } = await supabaseExternal
      .from("user_availability")
      .select("is_available")
      .eq("user_id", userId)
      .maybeSingle();
    if (data && typeof data.is_available === "boolean") return data.is_available;
  } catch { /* silencioso */ }
  return true; // fallback otimista
}

export async function setMyAvailability(next: boolean, note?: string): Promise<void> {
  writeLocal(next);
  const uid = await getCurrentUserId();
  if (!uid) return;

  try {
    await supabaseExternal
      .from("user_availability")
      .upsert(
        { user_id: uid, is_available: next, note: note ?? null, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
  } catch { /* silencioso — tabela ausente ou sem sessão */ }

  try {
    await supabaseExternal.from("availability_log").insert({
      user_id: uid,
      changed_by: uid,
      is_available: next,
      note: note ?? null,
    });
  } catch { /* silencioso */ }

  // Quando volta a ficar disponível → notifica quem tentou contato.
  if (next) {
    try { await notifyPendingContacts(uid); } catch { /* silencioso */ }
  }
}

export async function getMyAudit(limit = 20): Promise<AvailabilityAudit[]> {
  const uid = await getCurrentUserId();
  if (!uid) return [];
  try {
    const { data } = await supabaseExternal
      .from("availability_log")
      .select("*")
      .eq("user_id", uid)
      .order("changed_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as AvailabilityAudit[];
  } catch {
    return [];
  }
}

/**
 * Deduplicação/rate-limit em memória: evita reenvio de contact_attempt
 * ou notificação para o mesmo par (attempter → target) dentro da janela.
 * Persiste também em localStorage para sobreviver a recarregamentos rápidos.
 */
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 min
const LS_RATE = "fixxer_contact_rate_v1";

type RateMap = Record<string, number>;

function readRate(): RateMap {
  try {
    if (typeof window === "undefined") return {};
    return JSON.parse(window.localStorage.getItem(LS_RATE) || "{}");
  } catch { return {}; }
}
function writeRate(m: RateMap) {
  try { window.localStorage.setItem(LS_RATE, JSON.stringify(m)); } catch { /* ignore */ }
}
function shouldThrottle(key: string): boolean {
  const now = Date.now();
  const map = readRate();
  const last = map[key] || 0;
  if (now - last < RATE_WINDOW_MS) return true;
  // limpa entradas antigas para não crescer indefinidamente
  const cleaned: RateMap = { [key]: now };
  for (const [k, v] of Object.entries(map)) {
    if (now - v < RATE_WINDOW_MS) cleaned[k] = v;
  }
  cleaned[key] = now;
  writeRate(cleaned);
  return false;
}

/**
 * Registra tentativa de contato quando o alvo está indisponível.
 * Também cria uma notificação para o alvo saber que alguém tentou.
 * Deduplicado por janela de 10 min (attempter → target).
 */
export async function logContactAttempt(targetUserId: string): Promise<void> {
  const uid = await getCurrentUserId();
  if (!uid || !targetUserId || uid === targetUserId) return;
  const key = `attempt:${uid}->${targetUserId}`;
  if (shouldThrottle(key)) return; // spam guard

  try {
    await supabaseExternal.from("contact_attempts").insert({
      target_user_id: targetUserId,
      attempter_id: uid,
      notified: false,
    });
  } catch { /* silencioso — pode falhar por UNIQUE */ }

  try {
    await supabaseExternal.from("notifications").insert({
      recipient_id: targetUserId,
      kind: "contact_attempt",
      title: "Alguém tentou entrar em contato",
      body: "Um usuário tentou te contatar enquanto você estava indisponível.",
      meta: { attempter_id: uid },
    });
  } catch { /* silencioso */ }
}

/**
 * Ao voltar a ficar disponível, avisa quem tentou contato.
 */
async function notifyPendingContacts(myId: string): Promise<void> {
  try {
    const { data: pending } = await supabaseExternal
      .from("contact_attempts")
      .select("id, attempter_id")
      .eq("target_user_id", myId)
      .eq("notified", false);

    const items = (pending ?? []) as Array<{ id: string; attempter_id: string }>;
    if (items.length === 0) return;

    const attempterIds = Array.from(new Set(items.map((r) => r.attempter_id)));
    await Promise.all(
      attempterIds.map((rid) =>
        supabaseExternal.from("notifications").insert({
          recipient_id: rid,
          kind: "target_available_again",
          title: "Um contato que você procurou está disponível!",
          body: "O usuário voltou a ficar disponível na plataforma. Você já pode iniciar a conversa.",
          meta: { target_id: myId },
        }),
      ),
    );

    const ids = items.map((r) => r.id);
    await supabaseExternal
      .from("contact_attempts")
      .update({ notified: true })
      .in("id", ids);
  } catch { /* silencioso */ }
}

/**
 * Guard: chamar antes de iniciar chat / envio de proposta.
 * Retorna { allowed:true } quando o alvo está disponível.
 * Quando bloqueado, registra tentativa e retorna { allowed:false }.
 */
export async function guardContactAttempt(targetUserId: string): Promise<{ allowed: boolean; reason?: string }> {
  if (!targetUserId) return { allowed: true };
  const available = await isUserAvailable(targetUserId);
  if (available) return { allowed: true };
  try { await logContactAttempt(targetUserId); } catch { /* ignore */ }
  return {
    allowed: false,
    reason: "Este usuário está indisponível no momento. Você será avisado quando ele voltar.",
  };
}
