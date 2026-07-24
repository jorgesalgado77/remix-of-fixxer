import { supabaseExternal } from "@/lib/supabaseExternal";

export type DisputeStatus = "open" | "under_review" | "approved" | "rejected" | "resolved";
export type DisputeAction = "refund_review" | "partial_refund" | "full_refund" | "reverse_release";

export type AppointmentDispute = {
  id: string;
  appointment_id: string;
  opened_by: string;
  reason: string;
  requested_action: DisputeAction;
  evidence_urls: string[] | null;
  status: DisputeStatus;
  admin_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  refund_amount: number | null;
  created_at: string;
  updated_at: string;
};

export const DISPUTE_STATUS_LABEL: Record<DisputeStatus, { label: string; color: string; icon: string }> = {
  open:          { label: "Aberta",           color: "#FF9F0A", icon: "🟠" },
  under_review:  { label: "Em Análise",       color: "#00E5FF", icon: "🔍" },
  approved:      { label: "Aprovada",         color: "#00FF87", icon: "✅" },
  rejected:      { label: "Rejeitada",        color: "#FF3B30", icon: "⛔" },
  resolved:      { label: "Resolvida",        color: "#8E8E93", icon: "🏁" },
};

export const DISPUTE_ACTION_LABEL: Record<DisputeAction, string> = {
  refund_review:   "Revisão do reembolso",
  partial_refund:  "Reembolso parcial",
  full_refund:     "Reembolso integral",
  reverse_release: "Estornar liberação para o prestador",
};

export async function openDispute(payload: {
  appointment_id: string;
  reason: string;
  requested_action: DisputeAction;
  evidence_urls?: string[];
}): Promise<AppointmentDispute> {
  const { data: auth } = await supabaseExternal.auth.getUser();
  if (!auth.user) throw new Error("Usuário não autenticado.");
  if (payload.reason.trim().length < 10) {
    throw new Error("Descreva o motivo com pelo menos 10 caracteres.");
  }
  const { data, error } = await supabaseExternal
    .from("appointment_disputes")
    .insert({
      appointment_id: payload.appointment_id,
      opened_by: auth.user.id,
      reason: payload.reason.trim(),
      requested_action: payload.requested_action,
      evidence_urls: payload.evidence_urls ?? [],
    })
    .select()
    .single();
  if (error) throw error;
  return data as AppointmentDispute;
}

export async function fetchDisputes(appointmentId: string): Promise<AppointmentDispute[]> {
  const { data, error } = await supabaseExternal
    .from("appointment_disputes")
    .select("*")
    .eq("appointment_id", appointmentId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as AppointmentDispute[];
}

export async function withdrawDispute(id: string): Promise<void> {
  const { error } = await supabaseExternal
    .from("appointment_disputes")
    .update({ status: "resolved", admin_notes: "Retirada pelo autor." })
    .eq("id", id);
  if (error) throw error;
}
