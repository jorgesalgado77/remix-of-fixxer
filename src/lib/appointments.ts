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
  checkout_photos: string[] | null;
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
  return data as Appointment;
}

export async function acceptAppointment(id: string) {
  const { error } = await supabaseExternal
    .from("appointments")
    .update({ status: "confirmed" })
    .eq("id", id);
  if (error) throw error;
}

export async function proposeReschedule(id: string, newDateISO: string) {
  const { error } = await supabaseExternal
    .from("appointments")
    .update({ scheduled_at: newDateISO, status: "rescheduled" })
    .eq("id", id);
  if (error) throw error;
}

export async function cancelAppointment(id: string) {
  const { error } = await supabaseExternal
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error) throw error;
}

export async function checkIn(id: string): Promise<void> {
  const coords = await getCurrentCoords();
  const { error } = await supabaseExternal
    .from("appointments")
    .update({
      status: "checked_in",
      checkin_at: new Date().toISOString(),
      checkin_lat: coords?.lat ?? null,
      checkin_lng: coords?.lng ?? null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function checkOut(id: string, photos: string[] = []): Promise<void> {
  const { error } = await supabaseExternal
    .from("appointments")
    .update({
      status: "completed",
      checkout_at: new Date().toISOString(),
      checkout_photos: photos,
    })
    .eq("id", id);
  if (error) throw error;

  // Dispara evento global para solicitar liberação de custódia (escrow)
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("fixxer:escrow-release-request", {
        detail: { appointment_id: id },
      }),
    );
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
