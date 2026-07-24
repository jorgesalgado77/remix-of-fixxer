import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Navigation,
  ShieldCheck,
  Camera,
  Trash2,
  Loader2,
  X,
  CheckCircle2,
  RefreshCw,
  History,
  ImagePlus,
  FileDown,
  Gavel,
  AlertTriangle,
} from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import {
  fetchAppointment,
  fetchAppointmentEvents,
  acceptAppointment,
  cancelAppointment,
  checkIn,
  checkOut,
  removeAppointmentPhoto,
  updateAppointmentPhotos,
  openRoute,
  APPOINTMENT_TYPES,
  APPOINTMENT_STATUS,
  type Appointment,
  type AppointmentEvent,
} from "@/lib/appointments";
import {
  fetchDisputes,
  openDispute,
  withdrawDispute,
  uploadDisputeEvidences,
  DISPUTE_STATUS_LABEL,
  DISPUTE_ACTION_LABEL,
  type AppointmentDispute,
  type DisputeAction,
} from "@/lib/appointment-disputes";
import { generateAppointmentPdf, downloadPdf, summarizeRefund } from "@/lib/appointment-pdf";
import { CheckoutPhotosModal } from "@/components/CheckoutPhotosModal";
import { ComplaintButton } from "@/components/ComplaintButton";
import { useMediaUpload } from "@/hooks/use-media-upload";


export default function AppointmentDetailPage() {
  const { id } = useParams({ from: "/_authenticated/agenda/$id" });
  const navigate = useNavigate();
  const [apt, setApt] = useState<Appointment | null>(null);
  const [events, setEvents] = useState<AppointmentEvent[]>([]);
  const [disputes, setDisputes] = useState<AppointmentDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [photoModal, setPhotoModal] = useState<{ mode: "checkin" | "checkout" } | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const { uploadFileDetailed } = useMediaUpload();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const a = await fetchAppointment(id);
      setApt(a);
      if (a) {
        const [ev, ds] = await Promise.all([
          fetchAppointmentEvents(id),
          fetchDisputes(id),
        ]);
        setEvents(ev);
        setDisputes(ds);
      }
    } catch (e: any) {
      toast.error("Falha ao carregar compromisso", { description: e?.message });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    supabaseExternal.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    load();
  }, [load]);

  // Realtime — compromisso, eventos e disputas
  useEffect(() => {
    const ch = supabaseExternal
      .channel(`appt-detail:${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments", filter: `id=eq.${id}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointment_events", filter: `appointment_id=eq.${id}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointment_disputes", filter: `appointment_id=eq.${id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabaseExternal.removeChannel(ch);
    };
  }, [id, load]);

  const refundSummary = useMemo(
    () => (apt ? summarizeRefund(apt, events) : null),
    [apt, events],
  );

  const handleDownloadPdf = async () => {
    if (!apt) return;
    await withBusy("pdf", async () => {
      const blob = await generateAppointmentPdf(apt, events, disputes);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadPdf(blob, `fixxer-compromisso-${apt.id.slice(0, 8)}-${stamp}.pdf`);
      toast.success("📄 PDF gerado com sucesso!");
    });
  };


  const timeline = useMemo(() => {
    if (!apt) return [] as { at: string; icon: string; title: string; sub?: string; color: string }[];
    const items: { at: string; icon: string; title: string; sub?: string; color: string }[] = [];
    items.push({
      at: apt.created_at,
      icon: "📅",
      title: "Compromisso proposto",
      sub: APPOINTMENT_TYPES[apt.type]?.label,
      color: "#00E5FF",
    });
    if (apt.status === "confirmed" || apt.checkin_at || apt.checkout_at || apt.status === "completed") {
      items.push({
        at: apt.updated_at,
        icon: "✅",
        title: "Confirmado",
        color: "#00FF87",
      });
    }
    if (apt.checkin_at) {
      items.push({
        at: apt.checkin_at,
        icon: "📍",
        title: "Check-in realizado",
        sub: apt.checkin_lat && apt.checkin_lng ? `Local: ${apt.checkin_lat.toFixed(4)}, ${apt.checkin_lng.toFixed(4)}` : undefined,
        color: "#A855F7",
      });
    }
    if (apt.checkout_at) {
      items.push({
        at: apt.checkout_at,
        icon: "🏁",
        title: "Check-out concluído",
        sub: (apt.checkout_photos?.length ?? 0) > 0 ? `${apt.checkout_photos!.length} foto(s) de comprovação` : undefined,
        color: "#FFD600",
      });
    }
    if (apt.status === "cancelled") {
      items.push({
        at: apt.updated_at,
        icon: "❌",
        title: "Cancelado",
        sub: (apt as any).cancel_reason ?? undefined,
        color: "#FF3B30",
      });
    }
    // Merge com eventos do backend
    for (const e of events) {
      items.push({
        at: e.created_at,
        icon: "•",
        title: humanizeEvent(e.event_type),
        sub: e.metadata ? JSON.stringify(e.metadata) : undefined,
        color: "#8E8E93",
      });
    }
    return items.sort((a, b) => a.at.localeCompare(b.at));
  }, [apt, events]);

  const withBusy = async (key: string, fn: () => Promise<void>) => {
    try { setBusy(key); await fn(); } catch (e: any) {
      toast.error("Ação falhou", { description: e?.message });
    } finally { setBusy(null); }
  };

  const confirmCancel = async () => {
    if (!apt) return;
    await withBusy("cancel", async () => {
      const r = await cancelAppointment(apt.id, cancelReason.trim() || undefined);
      if (r.refunded) toast.success(`Cancelado. Sinal reembolsado (R$ ${r.amount?.toFixed(2) ?? "0,00"}).`);
      else toast("Compromisso cancelado.");
      setCancelOpen(false);
      setCancelReason("");
      load();
    });
  };

  const handleRemovePhoto = async (mode: "checkin" | "checkout", url: string) => {
    if (!apt) return;
    if (!confirm("Remover esta foto do histórico?")) return;
    await withBusy(`rm-${url}`, async () => {
      const next = await removeAppointmentPhoto(apt.id, mode, url);
      toast.success("Foto removida.");
      setApt((prev) => prev ? { ...prev, [`${mode}_photos`]: next } as Appointment : prev);
    });
  };

  const handleReplacePhoto = async (mode: "checkin" | "checkout", oldUrl: string, file: File) => {
    if (!apt) return;
    if (!file.type.startsWith("image/")) { toast.error("Apenas imagens."); return; }
    if (file.size > 12 * 1024 * 1024) { toast.error("Arquivo acima de 12MB."); return; }
    await withBusy(`rep-${oldUrl}`, async () => {
      const res = await uploadFileDetailed(file, {
        bucket: "media",
        folder: `appointments/${apt.id}/${mode}`,
        retries: 2,
        generateThumb: true,
      });
      if (!res?.url) throw new Error("Falha no upload");
      const current: string[] = ((apt as any)[`${mode}_photos`] ?? []) as string[];
      const next = current.map((u) => (u === oldUrl ? res.url : u));
      await updateAppointmentPhotos(apt.id, mode, next);
      toast.success("Foto substituída.");
      setApt((prev) => prev ? { ...prev, [`${mode}_photos`]: next } as Appointment : prev);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    );
  }

  if (!apt) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-white p-6 flex flex-col items-center justify-center gap-4">
        <p className="text-white/60">Compromisso não encontrado.</p>
        <Link to="/agenda" className="px-4 py-2 rounded-xl bg-white/10 text-xs font-black uppercase">Voltar</Link>
      </div>
    );
  }

  const s = APPOINTMENT_STATUS[apt.status];
  const t = APPOINTMENT_TYPES[apt.type];
  const dt = new Date(apt.scheduled_at);
  const isInvitee = userId === apt.invitee_id;
  const canAccept = isInvitee && (apt.status === "pending" || apt.status === "rescheduled");
  const canCheckIn = apt.status === "confirmed";
  const canCheckOut = apt.status === "checked_in";
  const canCancel = ["pending", "confirmed", "rescheduled"].includes(apt.status);
  const canManagePhotos = ["checked_in", "completed"].includes(apt.status) || (apt.checkin_photos?.length ?? 0) > 0 || (apt.checkout_photos?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white pb-32" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0A0A0B]/95 backdrop-blur-md border-b border-white/10 p-4">
        <div className="max-w-3xl mx-auto grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <button
            onClick={() => navigate({ to: "/agenda" })}
            className="w-10 h-10 shrink-0 bg-[#1A1A1B] border border-white/10 rounded-xl flex items-center justify-center text-white/70"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-black uppercase tracking-tight truncate flex items-center gap-2">
              <span>{t.icon}</span>
              {t.label}
            </h1>
            <p className="text-[10px] text-white/50">Compromisso #{apt.id.slice(0, 8)}</p>
          </div>
          <span
            className="shrink-0 text-[9px] font-black px-2 py-1 rounded-full whitespace-nowrap"
            style={{ backgroundColor: `${s.color}22`, color: s.color, border: `1px solid ${s.color}55` }}
          >
            {s.icon} {s.label}
          </span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Detalhes principais */}
        <section className="rounded-2xl border border-white/10 bg-[#111112] p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <Info icon={<CalendarIcon className="w-3 h-3" />} label="Data" value={dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })} />
            <Info icon={<Clock className="w-3 h-3" />} label="Horário" value={`${dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · ${apt.duration_min} min`} />
          </div>
          {apt.location_address && (
            <div className="flex items-start gap-2 text-[12px] text-white/80">
              <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-white/50" />
              <span className="flex-1">{apt.location_address}</span>
              <button
                onClick={() => openRoute(apt.location_address, apt.location_lat, apt.location_lng)}
                className="text-[10px] font-black uppercase text-[#00E5FF] flex items-center gap-1"
              >
                <Navigation className="w-3 h-3" /> Rota
              </button>
            </div>
          )}
          {apt.deposit_amount > 0 && refundSummary && (
            <RefundStatusCard summary={refundSummary} status={apt.status} />
          )}
          {apt.notes && (
            <p className="text-[12px] text-white/70 italic border-l-2 border-white/10 pl-3">{apt.notes}</p>
          )}
        </section>

        {/* Ações */}
        <section className="flex flex-wrap gap-2">
          {canAccept && (
            <ActionBtn onClick={() => withBusy("accept", async () => { await acceptAppointment(apt.id); toast.success("Confirmado!"); load(); })} busy={busy === "accept"} icon={<CheckCircle2 className="w-3 h-3" />} label="Aceitar" bg="#00FF87" />
          )}
          {canCheckIn && (
            <ActionBtn onClick={() => setPhotoModal({ mode: "checkin" })} busy={false} icon={<MapPin className="w-3 h-3" />} label="Check-in" bg="#A855F7" />
          )}
          {canCheckOut && (
            <ActionBtn onClick={() => setPhotoModal({ mode: "checkout" })} busy={false} icon={<Camera className="w-3 h-3" />} label="Check-out" bg="#FFD600" />
          )}
          {canCancel && (
            <ActionBtn onClick={() => setCancelOpen(true)} busy={false} icon={<X className="w-3 h-3" />} label="Cancelar" bg="#FF3B30" />
          )}
          {apt.deposit_amount > 0 && (
            <ActionBtn onClick={() => setDisputeOpen(true)} busy={false} icon={<Gavel className="w-3 h-3" />} label="Contestar" bg="#FFB020" />
          )}
          <ActionBtn onClick={handleDownloadPdf} busy={busy === "pdf"} icon={<FileDown className="w-3 h-3" />} label="Baixar PDF" bg="#00E5FF" />
        </section>


        {/* Fotos check-in */}
        {canManagePhotos && (
          <PhotoManager
            title="📍 Fotos de Check-in"
            photos={apt.checkin_photos ?? []}
            onRemove={(u) => handleRemovePhoto("checkin", u)}
            onReplace={(u, file) => handleReplacePhoto("checkin", u, file)}
            busy={busy}
            accent="#A855F7"
          />
        )}
        {canManagePhotos && (
          <PhotoManager
            title="🏁 Fotos de Check-out"
            photos={apt.checkout_photos ?? []}
            onRemove={(u) => handleRemovePhoto("checkout", u)}
            onReplace={(u, file) => handleReplacePhoto("checkout", u, file)}
            busy={busy}
            accent="#FFD600"
          />
        )}

        {/* Timeline */}
        <section className="rounded-2xl border border-white/10 bg-[#111112] p-4">
          <h2 className="text-xs font-black uppercase tracking-tight flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-white/60" /> Histórico de eventos
          </h2>
          <div className="space-y-3">
            {timeline.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm"
                  style={{ backgroundColor: `${item.color}22`, border: `1px solid ${item.color}44` }}
                >
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0 pb-3 border-b border-white/5">
                  <p className="text-[12px] font-bold">{item.title}</p>
                  {item.sub && <p className="text-[10px] text-white/50 mt-0.5 break-words">{item.sub}</p>}
                  <p className="text-[9px] uppercase text-white/40 tracking-widest mt-1">
                    {new Date(item.at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Contestações / Recursos */}
        <DisputesSection
          disputes={disputes}
          userId={userId}
          onWithdraw={async (id) => {
            await withBusy(`with-${id}`, async () => {
              await withdrawDispute(id);
              toast.success("Contestação retirada.");
              load();
            });
          }}
          onOpenNew={() => setDisputeOpen(true)}
        />
      </div>


      {/* Modal de cancelamento */}
      {cancelOpen && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setCancelOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm bg-[#0A0A0B] border border-white/10 rounded-t-3xl sm:rounded-3xl p-4 space-y-4"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
          >
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                <X className="w-4 h-4 text-[#FF3B30]" />
                Cancelar compromisso
              </h3>
              <p className="text-[10px] text-white/50 mt-1">
                {apt.deposit_amount > 0
                  ? `O sinal em custódia (R$ ${apt.deposit_amount.toFixed(2).replace(".", ",")}) será reembolsado automaticamente.`
                  : "Confirme o cancelamento para notificar a contraparte."}
              </p>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-white/60">Motivo (opcional)</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                maxLength={280}
                placeholder="Ex.: Cliente pediu para remarcar, imprevisto na obra…"
                className="w-full mt-1 bg-[#1A1A1B] border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCancelOpen(false)}
                className="flex-1 py-2.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/70"
              >
                Voltar
              </button>
              <button
                onClick={confirmCancel}
                disabled={busy === "cancel"}
                className="flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ backgroundColor: "#FF3B30", color: "#fff" }}
              >
                {busy === "cancel" ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                Confirmar cancelamento
              </button>
            </div>
          </div>
        </div>
      )}

      {photoModal && (
        <CheckoutPhotosModal
          open={!!photoModal}
          onClose={() => setPhotoModal(null)}
          appointmentId={apt.id}
          serviceTitle={t.label}
          mode={photoModal.mode}
          minPhotos={photoModal.mode === "checkout" ? 1 : 0}
          onConfirm={async (urls) => {
            if (photoModal.mode === "checkin") {
              await checkIn(apt.id, urls);
              toast.success("📍 Check-in registrado!");
            } else {
              await checkOut(apt.id, urls);
              toast.success("🏁 Check-out concluído. Custódia liberada.");
            }
            load();
          }}
        />
      )}

      {disputeOpen && (
        <DisputeModal
          appointmentId={apt.id}
          hasEscrow={apt.deposit_amount > 0}
          onClose={() => setDisputeOpen(false)}
          onCreated={() => {
            setDisputeOpen(false);
            toast.success("⚖️ Contestação registrada. A FIXXER revisará em breve.");
            load();
          }}
        />
      )}
    </div>
  );
}

// ---------- Sub-componentes ----------

function RefundStatusCard({
  summary,
  status,
}: {
  summary: ReturnType<typeof summarizeRefund>;
  status: Appointment["status"];
}) {
  const brl = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;
  const held = Math.max(0, summary.net);
  const state: "refunded" | "released" | "held" | "none" =
    summary.deposit <= 0 ? "none" :
    summary.refunded > 0 ? "refunded" :
    summary.released > 0 ? "released" :
    held > 0 ? "held" : "none";
  const color =
    state === "refunded" ? "#00FF87" :
    state === "released" ? "#00E5FF" :
    state === "held" ? "#FFD600" : "#8E8E93";
  const label =
    state === "refunded" ? "Reembolsado ao cliente" :
    state === "released" ? "Liberado ao prestador" :
    state === "held" ? "Sinal retido em custódia" : "Sem custódia ativa";
  return (
    <div
      className="p-3 rounded-xl border space-y-2"
      style={{ backgroundColor: `${color}15`, borderColor: `${color}55` }}
    >
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4" style={{ color }} />
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>
            Custódia FIXXER — {label}
          </p>
          <p className="text-sm font-bold">{brl(summary.deposit)}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <div className="p-1.5 rounded bg-black/30">
          <p className="text-white/50 uppercase">Retido</p>
          <p className="font-bold text-white">{brl(held)}</p>
        </div>
        <div className="p-1.5 rounded bg-black/30">
          <p className="text-white/50 uppercase">Liberado</p>
          <p className="font-bold" style={{ color: "#00E5FF" }}>{brl(summary.released)}</p>
        </div>
        <div className="p-1.5 rounded bg-black/30">
          <p className="text-white/50 uppercase">Reembolso</p>
          <p className="font-bold" style={{ color: "#00FF87" }}>{brl(summary.refunded)}</p>
        </div>
      </div>
      {status === "cancelled" && summary.refunded > 0 && (
        <p className="text-[10px] text-white/60 italic">
          Cancelamento processado — reembolso creditado automaticamente.
        </p>
      )}
    </div>
  );
}


function DisputesSection({
  disputes,
  userId,
  onWithdraw,
  onOpenNew,
  appointmentId,
  onReload,
}: {
  disputes: AppointmentDispute[];
  userId: string | null;
  onWithdraw: (id: string) => void | Promise<void>;
  onOpenNew: () => void;
  appointmentId: string;
  onReload: () => void;
}) {
  return (
    <section className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-white/60 flex items-center gap-2">
          <Gavel className="w-3 h-3" /> Contestações e Recursos
        </h2>
        <div className="flex items-center gap-2">
          <ComplaintButton appointmentId={appointmentId} onOpened={onReload} />
          <button
            onClick={onOpenNew}
            className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: "#FFB020", color: "#000" }}
          >
            + Nova
          </button>
        </div>
      </div>
      {disputes.length === 0 ? (
        <p className="text-[11px] text-white/40 italic">Nenhuma contestação aberta.</p>
      ) : (
        <ul className="space-y-2">
          {disputes.map((d) => {
            const isMine = d.opened_by === userId;
            const canWithdraw = isMine && d.status === "open";
            const meta = DISPUTE_STATUS_LABEL[d.status];
            const statusColor = meta?.color ?? "#8E8E93";
            return (
              <li key={d.id} className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded"
                    style={{ backgroundColor: `${statusColor}25`, color: statusColor }}
                  >
                    {meta?.icon} {meta?.label ?? d.status}
                  </span>
                  <span className="text-[9px] text-white/40">
                    {new Date(d.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-[11px] font-bold text-white">
                  Solicita: {DISPUTE_ACTION_LABEL[d.requested_action] ?? d.requested_action}
                </p>
                {d.reason && <p className="text-[11px] text-white/70 leading-snug">{d.reason}</p>}
                {d.admin_notes && (
                  <p className="text-[10px] text-white/60 italic border-l-2 border-white/20 pl-2 mt-1">
                    Parecer FIXXER: {d.admin_notes}
                  </p>
                )}
                {canWithdraw && (
                  <button
                    onClick={() => onWithdraw(d.id)}
                    className="text-[10px] uppercase font-black text-white/60 hover:text-white flex items-center gap-1 mt-1"
                  >
                    <Trash2 className="w-3 h-3" /> Retirar contestação
                  </button>
                )}
              </li>
            );

          })}
        </ul>
      )}
    </section>
  );
}

function DisputeModal({
  appointmentId,
  hasEscrow,
  onClose,
  onCreated,
}: {
  appointmentId: string;
  hasEscrow: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [action, setAction] = useState<DisputeAction>(hasEscrow ? "full_refund" : "refund_review");
  const [reason, setReason] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const options: { value: DisputeAction; label: string; hint: string }[] = [
    { value: "full_refund",     label: "Reembolso integral",       hint: "Devolver 100% do sinal ao cliente." },
    { value: "partial_refund",  label: "Reembolso parcial",        hint: "Dividir custódia entre as partes." },
    { value: "reverse_release", label: "Estornar liberação",       hint: "Reverter valor já liberado ao prestador." },
    { value: "refund_review",   label: "Revisão do reembolso",     hint: "Solicitar mediação FIXXER sem definição prévia." },
  ];

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list).filter(f => f.size <= 15 * 1024 * 1024);
    setFiles(prev => [...prev, ...arr].slice(0, 8));
  };

  const submit = async () => {
    if (reason.trim().length < 10) {
      toast.error("Descreva o motivo com pelo menos 10 caracteres.");
      return;
    }
    try {
      setSaving(true);
      let evidence_urls: string[] = [];
      if (files.length) {
        toast("Enviando evidências...");
        evidence_urls = await uploadDisputeEvidences(appointmentId, files);
      }
      await openDispute({ appointment_id: appointmentId, requested_action: action, reason: reason.trim(), evidence_urls });
      onCreated();
    } catch (e: any) {
      toast.error("Falha ao abrir contestação", { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-[#0A0A0B] border border-white/10 rounded-t-3xl sm:rounded-3xl p-4 space-y-4 max-h-[90vh] overflow-y-auto"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
      >
        <div>
          <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#FFB020]" />
            Abrir contestação
          </h3>
          <p className="text-[10px] text-white/50 mt-1">
            A equipe FIXXER analisará em até 48h úteis. Descreva o ocorrido de forma objetiva.
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-white/60">O que você solicita?</label>
          <div className="grid grid-cols-1 gap-1.5">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAction(opt.value)}
                className={`text-left p-2.5 rounded-lg border transition ${
                  action === opt.value
                    ? "bg-[#FFB020]/20 border-[#FFB020] text-white"
                    : "bg-white/5 border-white/10 text-white/70"
                }`}
              >
                <p className="text-[11px] font-black uppercase">{opt.label}</p>
                <p className="text-[10px] text-white/50 mt-0.5">{opt.hint}</p>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black uppercase text-white/60">Motivo detalhado</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            maxLength={800}
            placeholder="Descreva o que aconteceu, prazos, evidências…"
            className="w-full mt-1 bg-[#1A1A1B] border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none"
          />
          <p className="text-[9px] text-white/40 text-right mt-0.5">{reason.length}/800</p>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-white/60">Evidências (imagens/PDF, até 8 · 15MB cada)</label>
          <label className="mt-1 flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-white/20 bg-white/5 text-[11px] text-white/70 cursor-pointer">
            <ImagePlus className="w-4 h-4" /> Adicionar arquivos
            <input type="file" hidden multiple accept="image/*,application/pdf" onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = ""; }} />
          </label>
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between text-[10px] text-white/70 bg-black/40 rounded px-2 py-1">
                  <span className="truncate flex-1">{f.name}</span>
                  <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="text-white/40 hover:text-[#FF3B30] ml-2">
                    <X className="w-3 h-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/70">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ backgroundColor: "#FFB020", color: "#000" }}
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Gavel className="w-3 h-3" />}
            Registrar contestação
          </button>
        </div>
      </div>
    </div>
  );
}


function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase text-white/40 tracking-widest flex items-center gap-1 mb-1">{icon} {label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}

function ActionBtn({ onClick, busy, icon, label, bg }: { onClick: () => void; busy: boolean; icon: React.ReactNode; label: string; bg: string }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="flex-1 min-w-[110px] py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 disabled:opacity-40"
      style={{ backgroundColor: bg, color: bg === "#FF3B30" ? "#fff" : "#000" }}
    >
      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : icon}
      {label}
    </button>
  );
}

function PhotoManager({
  title, photos, onRemove, onReplace, busy, accent,
}: {
  title: string;
  photos: string[];
  onRemove: (url: string) => void;
  onReplace: (url: string, file: File) => void;
  busy: string | null;
  accent: string;
}) {
  if (!photos.length) return null;
  return (
    <section className="rounded-2xl border border-white/10 bg-[#111112] p-4 space-y-3">
      <h2 className="text-xs font-black uppercase tracking-tight" style={{ color: accent }}>{title}</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map((url, i) => (
          <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-black/40 group">
            <img src={url} alt={`foto ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-x-0 bottom-0 flex gap-1 p-1 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
              <label
                className="flex-1 h-7 rounded-md bg-white/10 border border-white/20 flex items-center justify-center text-white cursor-pointer"
                title="Substituir"
              >
                {busy === `rep-${url}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onReplace(url, f);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              <button
                onClick={() => onRemove(url)}
                disabled={busy === `rm-${url}`}
                className="flex-1 h-7 rounded-md bg-[#FF3B30]/80 flex items-center justify-center text-white disabled:opacity-40"
                title="Remover"
              >
                {busy === `rm-${url}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-white/40">
        Passe o cursor sobre a foto para substituir ou remover. As alterações refletem em tempo real no histórico.
      </p>
    </section>
  );
}

function humanizeEvent(type: string): string {
  const map: Record<string, string> = {
    created: "Compromisso criado",
    accepted: "Compromisso aceito",
    rescheduled: "Reagendamento proposto",
    checked_in: "Check-in realizado",
    checked_out: "Check-out concluído",
    cancelled: "Compromisso cancelado",
    escrow_released: "💰 Custódia liberada",
    escrow_refunded: "↩️ Custódia reembolsada",
    photos_updated: "Fotos atualizadas",
  };
  return map[type] ?? type;
}
