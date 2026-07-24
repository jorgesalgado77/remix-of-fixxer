import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Gavel, Loader2, Filter, ShieldCheck, CheckCircle2, XCircle, Eye, ExternalLink } from "lucide-react";
import {
  listAllDisputes,
  resolveDispute,
  DISPUTE_STATUS_LABEL,
  DISPUTE_ACTION_LABEL,
  type DisputeStatus,
  type DisputeWithContext,
} from "@/lib/appointment-disputes";
import { supabaseExternal } from "@/lib/supabaseExternal";

export const Route = createFileRoute("/_authenticated/admin/disputas")({
  component: AdminDisputesPage,
});

function AdminDisputesPage() {
  const navigate = useNavigate();
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<DisputeWithContext[]>([]);
  const [status, setStatus] = useState<DisputeStatus | "all">("open");
  const [selected, setSelected] = useState<DisputeWithContext | null>(null);

  useEffect(() => {
    const email = (localStorage.getItem("fixxer_user_email") || "").trim().toLowerCase();
    const role = (localStorage.getItem("fixxer_user_role") || "").toLowerCase();
    if (email !== "jorgericardosalgado@gmail.com" && role !== "admin") {
      navigate({ to: "/dashboard" as any });
      return;
    }
    setOk(true);
  }, [navigate]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await listAllDisputes({ status });
      setItems(rows);
    } catch (e: any) {
      toast.error("Falha ao carregar disputas", { description: e?.message });
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { if (ok) load(); }, [ok, load]);

  // Realtime
  useEffect(() => {
    if (!ok) return;
    const ch = supabaseExternal
      .channel("admin-disputes")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointment_disputes" }, () => load())
      .subscribe();
    return () => { supabaseExternal.removeChannel(ch); };
  }, [ok, load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length, open: 0, under_review: 0, approved: 0, rejected: 0, resolved: 0 };
    for (const i of items) c[i.status] = (c[i.status] ?? 0) + 1;
    return c;
  }, [items]);

  if (!ok) return null;

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white pb-32" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <header className="sticky top-0 z-30 bg-[#0A0A0B]/95 backdrop-blur-md border-b border-white/10 p-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link to="/admin" className="w-10 h-10 shrink-0 bg-[#1A1A1B] border border-white/10 rounded-xl flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#00FF87]" /> Revisão de Contestações
            </h1>
            <p className="text-[10px] text-white/50">Aprovar, recusar ou solicitar análise adicional das disputas de reembolso.</p>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {/* Filtros */}
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-3 h-3 text-white/50" />
          {(["all","open","under_review","approved","rejected","resolved"] as const).map((k) => {
            const active = status === k;
            const meta = k === "all" ? { label: "Todas", color: "#8E8E93", icon: "•" } : DISPUTE_STATUS_LABEL[k];
            return (
              <button
                key={k}
                onClick={() => setStatus(k)}
                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition ${
                  active ? "text-white" : "text-white/60 border-white/10 bg-white/5"
                }`}
                style={active ? { backgroundColor: `${meta.color}30`, borderColor: meta.color, color: meta.color } : undefined}
              >
                {meta.icon} {meta.label} {counts[k] ? `(${counts[k]})` : ""}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-white/50 text-xs">Nenhuma contestação neste filtro.</div>
        ) : (
          <ul className="space-y-2">
            {items.map((d) => {
              const meta = DISPUTE_STATUS_LABEL[d.status];
              return (
                <li key={d.id} className="p-4 rounded-2xl bg-[#111112] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded"
                      style={{ backgroundColor: `${meta.color}25`, color: meta.color }}>
                      {meta.icon} {meta.label}
                    </span>
                    <span className="text-[10px] text-white/40">
                      {new Date(d.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <p className="text-[12px] font-bold">
                    {DISPUTE_ACTION_LABEL[d.requested_action]}
                    {d.appointment && (
                      <span className="text-white/50 font-normal">
                        {" "}· Custódia R$ {Number(d.appointment.deposit_amount ?? 0).toFixed(2).replace(".", ",")}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-white/70 line-clamp-2">{d.reason}</p>
                  {(d.evidence_urls?.length ?? 0) > 0 && (
                    <p className="text-[10px] text-[#00E5FF]">📎 {d.evidence_urls!.length} evidência(s) anexada(s)</p>
                  )}
                  {d.admin_notes && (
                    <p className="text-[10px] text-white/60 italic border-l-2 border-white/20 pl-2">
                      Parecer: {d.admin_notes}
                    </p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setSelected(d)}
                      className="text-[10px] font-black uppercase px-3 py-1.5 rounded-lg bg-[#00E5FF] text-black flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> Revisar
                    </button>
                    {d.appointment_id && (
                      <Link
                        to={"/agenda/$id" as any}
                        params={{ id: d.appointment_id } as any}
                        className="text-[10px] font-black uppercase px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Compromisso
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selected && (
        <ResolveModal dispute={selected} onClose={() => setSelected(null)} onDone={() => { setSelected(null); load(); }} />
      )}
    </div>
  );
}

function ResolveModal({ dispute, onClose, onDone }: {
  dispute: DisputeWithContext;
  onClose: () => void;
  onDone: () => void;
}) {
  const [status, setStatus] = useState<"approved" | "rejected" | "under_review" | "resolved">("approved");
  const [notes, setNotes] = useState(dispute.admin_notes ?? "");
  const [refund, setRefund] = useState<string>(
    dispute.refund_amount != null ? String(dispute.refund_amount) : String(dispute.appointment?.deposit_amount ?? 0),
  );
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    try {
      setSaving(true);
      await resolveDispute({
        id: dispute.id,
        status,
        admin_notes: notes,
        refund_amount: status === "approved" ? Number(refund.replace(",", ".")) || 0 : null,
      });
      toast.success("Parecer registrado.");
      onDone();
    } catch (e: any) {
      toast.error("Falha ao registrar parecer", { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-[#0A0A0B] border border-white/10 rounded-t-3xl sm:rounded-3xl p-4 space-y-4 max-h-[92vh] overflow-y-auto"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
      >
        <h3 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
          <Gavel className="w-4 h-4 text-[#FFB020]" /> Revisar contestação
        </h3>
        <div className="text-[11px] text-white/70 space-y-1">
          <p><strong>Solicitação:</strong> {DISPUTE_ACTION_LABEL[dispute.requested_action]}</p>
          <p><strong>Motivo:</strong> {dispute.reason}</p>
          {(dispute.evidence_urls?.length ?? 0) > 0 && (
            <div>
              <p className="text-[10px] uppercase text-white/50 font-black mt-2">Evidências</p>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {dispute.evidence_urls!.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-white/10 bg-black/40 aspect-square">
                    {/\.(png|jpe?g|webp|gif|avif)$/i.test(u)
                      ? <img src={u} alt="evidência" className="w-full h-full object-cover" />
                      : <div className="flex items-center justify-center w-full h-full text-[10px] text-white/70 p-1 text-center break-all">{u.split("/").pop()}</div>}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-white/60">Decisão</label>
          <div className="grid grid-cols-2 gap-1.5">
            {([
              { v: "approved", l: "✅ Aprovar", c: "#00FF87" },
              { v: "rejected", l: "⛔ Rejeitar", c: "#FF3B30" },
              { v: "under_review", l: "🔍 Em análise", c: "#00E5FF" },
              { v: "resolved", l: "🏁 Resolvida", c: "#8E8E93" },
            ] as const).map((o) => (
              <button key={o.v} onClick={() => setStatus(o.v)}
                className="text-[11px] font-black uppercase px-3 py-2 rounded-lg border transition"
                style={status === o.v
                  ? { backgroundColor: `${o.c}30`, borderColor: o.c, color: o.c }
                  : { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
                {o.l}
              </button>
            ))}
          </div>
        </div>

        {status === "approved" && (
          <div>
            <label className="text-[10px] font-black uppercase text-white/60">Valor de reembolso (R$)</label>
            <input value={refund} onChange={(e) => setRefund(e.target.value)}
              className="w-full mt-1 bg-[#1A1A1B] border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
        )}

        <div>
          <label className="text-[10px] font-black uppercase text-white/60">Parecer (obrigatório)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} maxLength={800}
            placeholder="Descreva a decisão, evidências consideradas e próximos passos."
            className="w-full mt-1 bg-[#1A1A1B] border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none" />
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/70">
            Cancelar
          </button>
          <button onClick={submit} disabled={saving}
            className="flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ backgroundColor: status === "rejected" ? "#FF3B30" : "#00FF87", color: status === "rejected" ? "#fff" : "#000" }}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : status === "rejected" ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
            Registrar parecer
          </button>
        </div>
      </div>
    </div>
  );
}
