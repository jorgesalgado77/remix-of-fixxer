import { supabaseExternal } from "./supabaseExternal";

export type NotifChannel = "push" | "inapp";

export type NotifEventKey =
  | "appointment_new"
  | "appointment_accepted"
  | "appointment_rescheduled"
  | "appointment_cancelled"
  | "appointment_checkin"
  | "appointment_checkout"
  | "escrow_released"
  | "escrow_refunded"
  | "proposal_new"
  | "proposal_accepted"
  | "chat_message"
  | "new_demand";

export const NOTIF_EVENTS: { key: NotifEventKey; label: string; description: string; icon: string }[] = [
  { key: "appointment_new", label: "Novo agendamento proposto", description: "Alguém propôs um compromisso com você.", icon: "📅" },
  { key: "appointment_accepted", label: "Agendamento aceito", description: "Sua proposta de agendamento foi aceita.", icon: "✅" },
  { key: "appointment_rescheduled", label: "Reagendamento sugerido", description: "Novo horário proposto para um compromisso.", icon: "🔄" },
  { key: "appointment_cancelled", label: "Compromisso cancelado", description: "Um compromisso foi cancelado.", icon: "❌" },
  { key: "appointment_checkin", label: "Check-in realizado", description: "Prestador chegou ao local.", icon: "📍" },
  { key: "appointment_checkout", label: "Check-out concluído", description: "Serviço finalizado.", icon: "🏁" },
  { key: "escrow_released", label: "Custódia liberada", description: "Pagamento liberado para o prestador.", icon: "💰" },
  { key: "escrow_refunded", label: "Custódia reembolsada", description: "Sinal devolvido após cancelamento.", icon: "↩️" },
  { key: "proposal_new", label: "Nova proposta em O.S.", description: "Você recebeu uma proposta para seu serviço.", icon: "📝" },
  { key: "proposal_accepted", label: "Proposta aceita", description: "Sua proposta foi aceita pelo lojista.", icon: "🎉" },
  { key: "chat_message", label: "Mensagens no chat", description: "Novas mensagens enviadas a você.", icon: "💬" },
  { key: "new_demand", label: "Novas demandas na região", description: "Serviços publicados dentro do seu raio.", icon: "🌐" },
];

export type NotifPrefs = Record<NotifEventKey, { push: boolean; inapp: boolean }>;

export function defaultPrefs(): NotifPrefs {
  const out = {} as NotifPrefs;
  for (const e of NOTIF_EVENTS) out[e.key] = { push: true, inapp: true };
  return out;
}

const LS_KEY = "fixxer:notif-prefs";

export async function loadPrefs(userId?: string | null): Promise<NotifPrefs> {
  // 1) Cache local
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<NotifPrefs>;
      return { ...defaultPrefs(), ...parsed };
    }
  } catch { /* ignore */ }

  // 2) Servidor
  if (userId) {
    try {
      const { data } = await supabaseExternal
        .from("notification_preferences")
        .select("preferences")
        .eq("user_id", userId)
        .maybeSingle();
      if (data?.preferences) {
        const merged = { ...defaultPrefs(), ...(data.preferences as NotifPrefs) };
        try { localStorage.setItem(LS_KEY, JSON.stringify(merged)); } catch {}
        return merged;
      }
    } catch { /* tabela pode não existir */ }
  }
  return defaultPrefs();
}

export async function savePrefs(userId: string, prefs: NotifPrefs): Promise<{ ok: boolean; error?: string }> {
  try { localStorage.setItem(LS_KEY, JSON.stringify(prefs)); } catch {}
  try {
    const { error } = await supabaseExternal
      .from("notification_preferences")
      .upsert({ user_id: userId, preferences: prefs, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message };
  }
}

/** Verifica se um canal está ativo para o evento (usa cache local). */
export function isChannelEnabled(eventKey: NotifEventKey, channel: NotifChannel): boolean {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return true;
    const prefs = JSON.parse(raw) as NotifPrefs;
    return prefs?.[eventKey]?.[channel] ?? true;
  } catch { return true; }
}
