import { supabaseExternal } from "@/lib/supabaseExternal";

export const APPOINTMENT_TYPES = {
  visita_tecnica: { label: "Visita Técnica / Medição", icon: "📏" },
  execucao: { label: "Execução de Serviço", icon: "🔧" },
  atendimento: { label: "Atendimento / Consulta / Reserva", icon: "🗓️" },
  apresentacao: { label: "Apresentação de Projeto", icon: "📐" },
  entrega: { label: "Entrega de Materiais", icon: "📦" },
} as const;

export type AppointmentType = keyof typeof APPOINTMENT_TYPES;

export const APPOINTMENT_STATUS = {
  pending: { label: "Aguardando Confirmação", icon: "⏳", color: "#FF9F0A" },
  confirmed: { label: "Confirmado", icon: "✅", color: "#00FF87" },
  rescheduled: { label: "Reagendado", icon: "🔄", color: "#00E5FF" },
  checked_in: { label: "Em Andamento", icon: "📍", color: "#A855F7" },
  completed: { label: "Concluído", icon: "🏁", color: "#00FF87" },
  cancelled: { label: "Cancelado", icon: "❌", color: "#FF3B30" },
} as const;

export type AppointmentStatus = keyof typeof APPOINTMENT_STATUS;

export type Appointment = {
  id: string;
  order_id: string | null;
  chat_thread_id: string | null;
  proposer_id: string;
  invitee_id: string;
  type: AppointmentType;
  scheduled_at: string;
  duration_min: number;
  location_address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  status: AppointmentStatus;
  deposit_amount: number;
  checkin_at: string | null;
  checkout_at: string | null;
  checkin_lat: number | null;
  checkin_lng: number | null;
  checkin_photos: string[] | null;
  checkout_photos: string[] | null;
  cancel_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export async function createAppointment(payload: {
  invitee_id: string;
  type: AppointmentType;
  scheduled_at: string;
  duration_min?: number;
  location_address?: string;
  location_lat?: number;
  location_lng?: number;
  deposit_amount?: number;
  order_id?: string;
  chat_thread_id?: string;
  notes?: string;
}): Promise<Appointment> {
  const { data: userData } = await supabaseExternal.auth.getUser();
  if (!userData.user) throw new Error("Usuário não autenticado.");

  const { data, error } = await supabaseExternal
    .from("appointments")
    .insert({
      proposer_id: userData.user.id,
      invitee_id: payload.invitee_id,
      type: payload.type,
      scheduled_at: payload.scheduled_at,
      duration_min: payload.duration_min ?? 60,
      location_address: payload.location_address ?? null,
      location_lat: payload.location_lat ?? null,
      location_lng: payload.location_lng ?? null,
      deposit_amount: payload.deposit_amount ?? 0,
      order_id: payload.order_id ?? null,
      chat_thread_id: payload.chat_thread_id ?? null,
      notes: payload.notes ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;

  // Push ao convidado
  try {
    const { sendPushToUser } = await import("./push-client");
    void sendPushToUser({
      userId: payload.invitee_id,
      title: "📅 Novo agendamento proposto",
      body: `Você recebeu uma proposta de agendamento (${payload.type}).`,
      url: "/agenda",
      tag: `appt-new-${data.id}`,
    });
  } catch { /* ignore */ }

  return data as Appointment;
}

export async function acceptAppointment(id: string) {
  const { data: apt } = await supabaseExternal
    .from("appointments")
    .select("proposer_id")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabaseExternal
    .from("appointments")
    .update({ status: "confirmed" })
    .eq("id", id);
  if (error) throw error;
  if (apt?.proposer_id) {
    try {
      const { sendPushToUser } = await import("./push-client");
      void sendPushToUser({
        userId: apt.proposer_id,
        title: "✅ Agendamento confirmado",
        body: "Sua proposta de agendamento foi aceita.",
        url: "/agenda",
        tag: `appt-confirmed-${id}`,
      });
    } catch { /* ignore */ }
  }
}

export async function proposeReschedule(id: string, newDateISO: string) {
  const { data: apt } = await supabaseExternal
    .from("appointments")
    .select("proposer_id, invitee_id")
    .eq("id", id)
    .maybeSingle();

  const { data: userData } = await supabaseExternal.auth.getUser();
  const currentUid = userData.user?.id ?? null;

  const { error } = await supabaseExternal
    .from("appointments")
    .update({ scheduled_at: newDateISO, status: "rescheduled" })
    .eq("id", id);
  if (error) throw error;

  // Notifica a contraparte
  const target =
    apt && currentUid && apt.proposer_id === currentUid ? apt.invitee_id : apt?.proposer_id;
  if (target) {
    try {
      const { sendPushToUser } = await import("./push-client");
      const when = new Date(newDateISO).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      void sendPushToUser({
        userId: target,
        title: "🔄 Novo horário proposto",
        body: `Sugestão de reagendamento para ${when}.`,
        url: "/agenda",
        tag: `appt-reschedule-${id}`,
      });
    } catch { /* ignore */ }
  }
}

export async function cancelAppointment(
  id: string,
  reason?: string,
): Promise<{ cancelled: boolean; refunded: boolean; amount?: number; error?: string }> {
  const { data: apt } = await supabaseExternal
    .from("appointments")
    .select("proposer_id, invitee_id, deposit_amount, status")
    .eq("id", id)
    .maybeSingle();

  if (apt && ["completed", "cancelled"].includes(apt.status)) {
    return { cancelled: false, refunded: false, error: "Compromisso já finalizado." };
  }

  // Tenta RPC transacional (cancela + reembolsa custódia se aplicável)
  let refunded = false;
  let refundedAmount: number | undefined;
  try {
    const { data, error } = await supabaseExternal.rpc("cancel_appointment_and_refund_escrow", {
      _appointment_id: id,
      _reason: reason ?? null,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    refunded = !!row?.refunded;
    refundedAmount = row?.amount ? Number(row.amount) : undefined;
  } catch {
    // Fallback: apenas marca como cancelado
    const { error } = await supabaseExternal
      .from("appointments")
      .update({ status: "cancelled", cancel_reason: reason ?? null })
      .eq("id", id);
    if (error) throw error;
  }

  // Push à contraparte (best-effort)
  const { data: userData } = await supabaseExternal.auth.getUser();
  const currentUid = userData.user?.id ?? null;
  const target =
    apt && currentUid && apt.proposer_id === currentUid ? apt.invitee_id : apt?.proposer_id;
  if (target) {
    try {
      const { sendPushToUser } = await import("./push-client");
      void sendPushToUser({
        userId: target,
        title: "❌ Compromisso cancelado",
        body: refunded
          ? `Cancelado. Sinal reembolsado (R$ ${(refundedAmount ?? apt?.deposit_amount ?? 0).toFixed(2)}).`
          : reason
            ? `Motivo: ${reason}`
            : "O compromisso foi cancelado pela contraparte.",
        url: `/agenda/${id}`,
        tag: `appt-cancel-${id}`,
      });
    } catch { /* ignore */ }
  }

  return { cancelled: true, refunded, amount: refundedAmount };
}

/**
 * Substitui as fotos de check-in ou check-out de um compromisso.
 * O backend valida via RLS que o usuário atual é proposer/invitee.
 */
export async function updateAppointmentPhotos(
  id: string,
  mode: "checkin" | "checkout",
  photoUrls: string[],
): Promise<void> {
  const column = mode === "checkin" ? "checkin_photos" : "checkout_photos";
  const { error } = await supabaseExternal
    .from("appointments")
    .update({ [column]: photoUrls, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Remove uma única foto do array de check-in/check-out.
 * Não deleta o arquivo do storage (histórico é preservado).
 */
export async function removeAppointmentPhoto(
  id: string,
  mode: "checkin" | "checkout",
  photoUrl: string,
): Promise<string[]> {
  const column = mode === "checkin" ? "checkin_photos" : "checkout_photos";
  const { data: apt } = await supabaseExternal
    .from("appointments")
    .select(column)
    .eq("id", id)
    .maybeSingle();
  const current: string[] = (apt as any)?.[column] ?? [];
  const next = current.filter((u) => u !== photoUrl);
  await updateAppointmentPhotos(id, mode, next);
  return next;
}

export type AppointmentEvent = {
  id: string;
  appointment_id: string;
  actor_id: string | null;
  event_type: string;
  metadata: Record<string, any> | null;
  created_at: string;
};

/**
 * Busca histórico consolidado de eventos do compromisso.
 * Combina rows da tabela appointment_events + campos do próprio agendamento
 * como fallback (para ambientes onde a tabela ainda não existe).
 */
export async function fetchAppointmentEvents(id: string): Promise<AppointmentEvent[]> {
  const events: AppointmentEvent[] = [];
  try {
    const { data } = await supabaseExternal
      .from("appointment_events")
      .select("*")
      .eq("appointment_id", id)
      .order("created_at", { ascending: true });
    if (data) events.push(...(data as AppointmentEvent[]));
  } catch { /* ignore */ }
  return events;
}

export async function checkIn(id: string, photos: string[] = []): Promise<void> {
  const coords = await getCurrentCoords();
  
  // Usar a nova RPC segura
  const { data, error } = await supabaseExternal.rpc("safe_check_in", {
    _appointment_id: id,
    _lat: coords?.lat ?? null,
    _lng: coords?.lng ?? null,
    _photos: photos,
  });

  if (error) throw error;
  if (data && !data.ok) throw new Error(data.error || "Erro no check-in.");

  // Push à contraparte (best-effort)
  try {
    const { data: apt } = await supabaseExternal
      .from("appointments")
      .select("proposer_id, invitee_id")
      .eq("id", id)
      .maybeSingle();

    const { data: userData } = await supabaseExternal.auth.getUser();
    const currentUid = userData.user?.id ?? null;
    const target =
      apt && currentUid && apt.proposer_id === currentUid ? apt.invitee_id : apt?.proposer_id;
      
    if (target) {
      const { sendPushToUser } = await import("./push-client");
      void sendPushToUser({
        userId: target,
        title: "📍 Check-in realizado",
        body: coords ? "Prestador chegou ao local do serviço." : "Check-in registrado no compromisso.",
        url: "/agenda",
        tag: `appt-checkin-${id}`,
      });
    }
  } catch { /* ignore */ }
}

export async function checkOut(id: string, photos: string[] = []): Promise<void> {
  // Usar a nova RPC segura que já trata escrow
  const { data, error } = await supabaseExternal.rpc("safe_check_out", {
    _appointment_id: id,
    _photos: photos,
  });

  if (error) throw error;
  if (data && !data.ok) throw new Error(data.error || "Erro no check-out.");

  // Evento local (compat)
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("fixxer:escrow-release-request", {
        detail: { appointment_id: id, released: !!data.escrow_released },
      }),
    );
  }

  // Push à contraparte (best-effort)
  try {
    const { data: apt } = await supabaseExternal
      .from("appointments")
      .select("proposer_id")
      .eq("id", id)
      .maybeSingle();

    if (apt?.proposer_id) {
      const { sendPushToUser } = await import("./push-client");
      const body = data.escrow_released
        ? "Check-out registrado. Custódia liberada para o prestador."
        : "Check-out registrado. Nenhum sinal em custódia para liberar.";
      void sendPushToUser({
        userId: apt.proposer_id,
        title: "🏁 Serviço concluído",
        body,
        url: "/agenda",
        tag: `appt-completed-${id}`,
      });
    }
  } catch { /* ignore */ }
}

/**
 * Solicita ao backend a liberação da custódia vinculada ao compromisso.
 * A função RPC `public.release_escrow_for_appointment` valida:
 *   - o usuário atual é proposer ou invitee do agendamento
 *   - o agendamento está com status `completed`
 *   - existe um registro de escrow pendente
 * Falha silenciosa (retorna released=false) quando não há RPC/tabela — o UI segue.
 */
export async function releaseEscrowForAppointment(
  appointmentId: string,
): Promise<{ released: boolean; amount?: number; error?: string }> {
  try {
    const { data, error } = await supabaseExternal.rpc("release_escrow_for_appointment", {
      _appointment_id: appointmentId,
    });
    if (error) return { released: false, error: error.message };
    const row = Array.isArray(data) ? data[0] : data;
    return { released: !!row?.released, amount: row?.amount };
  } catch (e: any) {
    return { released: false, error: e?.message };
  }
}

export async function fetchMyAppointments(): Promise<Appointment[]> {
  const { data: userData } = await supabaseExternal.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabaseExternal
    .from("appointments")
    .select("*")
    .or(`proposer_id.eq.${userData.user.id},invitee_id.eq.${userData.user.id}`)
    .order("scheduled_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Appointment[];
}

export async function fetchAppointment(id: string): Promise<Appointment | null> {
  const { data, error } = await supabaseExternal
    .from("appointments")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Appointment) ?? null;
}

function getCurrentCoords(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

/** Abre rota no Google Maps / Waze (fallback web). */
export function openRoute(
  address: string | null,
  lat: number | null,
  lng: number | null,
) {
  let url = "";
  if (lat && lng) {
    url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  } else if (address) {
    url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  } else {
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
