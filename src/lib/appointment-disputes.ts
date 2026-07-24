import { supabaseExternal } from "@/lib/supabaseExternal";

export type DisputeStatus = "open" | "under_review" | "approved" | "rejected" | "resolved";
export type DisputeAction = "refund_review" | "partial_refund" | "full_refund" | "reverse_release";

export type DisputeEvidence = {
  url: string;
  name?: string;
  type?: string;
  size?: number;
};

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

/** Envia arquivos ao bucket `media` (pasta disputes/<appointment_id>) e devolve URLs públicas. */
export async function uploadDisputeEvidences(
  appointmentId: string,
  files: File[],
): Promise<string[]> {
  if (!files.length) return [];
  const urls: string[] = [];
  for (const file of files) {
    if (file.size > 15 * 1024 * 1024) throw new Error(`"${file.name}" excede 15MB.`);
    const safe = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${file.name.replace(/[^\w.\-]+/g, "_")}`;
    const path = `disputes/${appointmentId}/${safe}`;
    const { error } = await supabaseExternal.storage.from("media").upload(path, file, {
      upsert: false, contentType: file.type || "application/octet-stream",
    });
    if (error) throw error;
    const { data: pub } = supabaseExternal.storage.from("media").getPublicUrl(path);
    urls.push(pub.publicUrl);
  }
  return urls;
}

async function notify(userId: string, payload: {
  type: string; title: string; body: string; url?: string; metadata?: Record<string, any>;
}) {
  try {
    await supabaseExternal.from("notifications").insert({
      user_id: userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      url: payload.url ?? null,
      metadata: payload.metadata ?? null,
    });
  } catch (e) {
    console.warn("[disputes] falha ao inserir notification (ignorado)", e);
  }
  try {
    const { sendPushToUser } = await import("./push-client");
    void sendPushToUser({
      userId,
      title: payload.title,
      body: payload.body,
      url: payload.url,
      tag: `dispute-${payload.metadata?.dispute_id ?? "x"}`,
    });
  } catch { /* ignore */ }
}

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

  // Notifica a contraparte (busca appointment)
  try {
    const { data: apt } = await supabaseExternal
      .from("appointments").select("proposer_id, invitee_id")
      .eq("id", payload.appointment_id).single();
    if (apt) {
      const other = auth.user.id === apt.proposer_id ? apt.invitee_id : apt.proposer_id;
      await notify(other, {
        type: "dispute_opened",
        title: "⚖️ Contestação aberta",
        body: "A contraparte abriu uma contestação neste compromisso.",
        url: `/agenda/${payload.appointment_id}`,
        metadata: { dispute_id: (data as any).id, appointment_id: payload.appointment_id },
      });
    }
  } catch { /* ignore */ }

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

/** ---------- Admin ---------- */

export type DisputeWithContext = AppointmentDispute & {
  appointment?: {
    id: string;
    proposer_id: string;
    invitee_id: string;
    scheduled_at: string;
    deposit_amount: number;
    status: string;
    location_address: string | null;
  } | null;
};

export async function listAllDisputes(filter?: { status?: DisputeStatus | "all" }): Promise<DisputeWithContext[]> {
  let q = supabaseExternal.from("appointment_disputes").select("*").order("created_at", { ascending: false });
  if (filter?.status && filter.status !== "all") q = q.eq("status", filter.status);
  const { data, error } = await q;
  if (error) throw error;
  const disputes = (data ?? []) as AppointmentDispute[];
  if (!disputes.length) return [];
  const aptIds = Array.from(new Set(disputes.map(d => d.appointment_id)));
  const { data: apts } = await supabaseExternal
    .from("appointments")
    .select("id, proposer_id, invitee_id, scheduled_at, deposit_amount, status, location_address")
    .in("id", aptIds);
  const map = new Map((apts ?? []).map((a: any) => [a.id, a]));
  return disputes.map(d => ({ ...d, appointment: map.get(d.appointment_id) ?? null }));
}

export async function resolveDispute(payload: {
  id: string;
  status: "approved" | "rejected" | "under_review" | "resolved";
  admin_notes: string;
  refund_amount?: number | null;
}): Promise<AppointmentDispute> {
  const { data: auth } = await supabaseExternal.auth.getUser();
  if (!auth.user) throw new Error("Não autenticado.");
  if (payload.admin_notes.trim().length < 5) throw new Error("Registre o parecer (mín. 5 caracteres).");

  const { data, error } = await supabaseExternal
    .from("appointment_disputes")
    .update({
      status: payload.status,
      admin_notes: payload.admin_notes.trim(),
      refund_amount: payload.refund_amount ?? null,
      resolved_at: payload.status === "under_review" ? null : new Date().toISOString(),
      resolved_by: auth.user.id,
    })
    .eq("id", payload.id)
    .select()
    .single();
  if (error) throw error;

  // Notifica autor (trigger no banco também insere; este push é redundância best-effort)
  try {
    const d = data as AppointmentDispute;
    await notify(d.opened_by, {
      type: "dispute_status",
      title: "⚖️ Parecer FIXXER emitido",
      body: `${DISPUTE_STATUS_LABEL[d.status].label}. ${payload.admin_notes.slice(0, 100)}`,
      url: `/agenda/${d.appointment_id}`,
      metadata: { dispute_id: d.id, status: d.status },
    });
  } catch { /* ignore */ }

  return data as AppointmentDispute;
}
