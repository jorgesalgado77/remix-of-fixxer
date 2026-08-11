import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft, Coins, Star, ShieldOff, ShieldCheck, MessageSquare,
  ClipboardList, ImageIcon, User as UserIcon, Loader2, TrendingUp, TrendingDown,
} from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { toast } from "sonner";

import { requireAdmin, useAdminFocusRevalidation } from "@/lib/admin-guard";

export const Route = createFileRoute("/_authenticated/admin/usuarios/$id")({
  beforeLoad: requireAdmin,
  component: AuditoriaUsuarioPage,
});

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  document: string | null;
  city: string | null;
  state: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  category: string | null;
  plan: string | null;
  plan_cycle: string | null;
  badge: string | null;
  status: string | null;
  bio: string | null;
  created_at: string | null;
  last_seen_at: string | null;
  photo_sections: any;
  specialties: any;
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function AuditoriaUsuarioPage() {
  const { id } = Route.useParams();
  // beforeLoad (requireAdmin) já valida acesso; hook revalida em focus.
  useAdminFocusRevalidation();
  const authOk = true;
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [balance, setBalance] = useState(0);
  const [txs, setTxs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);

  useEffect(() => {
    if (!authOk) return;
    void load();
    // Realtime saldo do alvo
    const ch = supabaseExternal
      .channel(`admin:audit:${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_coins", filter: `user_id=eq.${id}` }, (p: any) => {
        setBalance(Number(p?.new?.balance ?? 0));
      })
      .subscribe();
    return () => { try { supabaseExternal.removeChannel(ch); } catch {} };
  }, [authOk, id]);


  async function load() {
    setLoading(true);
    try {
      const [{ data: p }, { data: coins }, { data: t }, { data: os }, { data: rv }, { data: ch }] = await Promise.all([
        supabaseExternal.from("profiles").select("*").eq("id", id).maybeSingle(),
        supabaseExternal.from("user_coins").select("balance").eq("user_id", id).maybeSingle(),
        supabaseExternal.from("coin_transactions").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(30),
        supabaseExternal.from("service_orders").select("id, title, status, price, created_at").or(`owner_id.eq.${id},invitee_id.eq.${id},provider_id.eq.${id}`).order("created_at", { ascending: false }).limit(20),
        supabaseExternal.from("reviews").select("id, rating, comment, created_at").eq("reviewed_user_id", id).order("created_at", { ascending: false }).limit(20),
        supabaseExternal.from("messages").select("id, content, created_at").eq("sender_id", id).order("created_at", { ascending: false }).limit(15),
      ] as any);
      setProfile(p as any ?? null);
      setBalance(Number(coins?.balance ?? 0));
      setTxs(t ?? []);
      setOrders(os ?? []);
      setReviews(rv ?? []);
      setChats(ch ?? []);
    } catch (e: any) {
      toast.error("Falha ao carregar auditoria", { description: e?.message });
    } finally { setLoading(false); }
  }

  async function toggleBlock() {
    if (!profile) return;
    const next = profile.status === "bloqueado" ? "ativo" : "bloqueado";
    if (!confirm(`Confirmar ${next.toUpperCase()} para ${profile.full_name || profile.email}?`)) return;
    try {
      const { error } = await supabaseExternal.from("profiles").update({ status: next }).eq("id", profile.id);
      if (error) throw error;
      toast.success(next === "bloqueado" ? "Usuário bloqueado — sessão será encerrada em tempo real" : "Usuário desbloqueado");
      setProfile({ ...profile, status: next });
    } catch (e: any) { toast.error(e?.message); }
  }

  if (!authOk) return null;
  if (loading) return (
    <div className="min-h-[100dvh] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
    </div>
  );
  if (!profile) return (
    <div className="p-8 text-center text-gray-400">Perfil não encontrado.</div>
  );

  const photoSections = profile.photo_sections ?? {};
  const allPhotos: string[] = [];
  try {
    const s: any = photoSections;
    ["showroom", "montagens", "portfolio"].forEach((k) => {
      const arr = s?.[k]?.photos ?? [];
      arr.forEach((ph: any) => ph?.url && allPhotos.push(ph.url));
    });
    (s?.custom ?? []).forEach((sec: any) => (sec?.photos ?? []).forEach((ph: any) => ph?.url && allPhotos.push(ph.url)));
  } catch {}

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto pb-24 min-h-[100dvh]">
      <div className="flex items-center gap-3">
        <Link to={"/admin/usuarios" as any} className="p-2 rounded-xl bg-white/5 border border-white/10 text-white">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-[10px] font-black uppercase tracking-widest">
          <UserIcon className="w-3 h-3" /> Auditoria de Usuário
        </div>
      </div>

      {/* Header do perfil com banner */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-[#0F0F10]">
        <div className="h-32 md:h-44 bg-gradient-to-br from-emerald-500/30 to-cyan-500/20"
          style={profile.banner_url ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        />
        <div className="p-4 md:p-6 flex items-end gap-4 -mt-10 md:-mt-14">
          <div className="w-20 h-20 md:w-28 md:h-28 rounded-3xl border-4 border-[#0F0F10] bg-white/5 overflow-hidden shrink-0">
            {profile.avatar_url
              ? <img src={profile.avatar_url} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-white text-2xl font-black">{(profile.full_name || "?").slice(0,1)}</div>}
          </div>
          <div className="flex-1 min-w-0 pt-2">
            <h1 className="text-white font-black text-lg md:text-2xl truncate">{profile.full_name || "Sem nome"}</h1>
            <p className="text-gray-400 text-xs md:text-sm truncate">{profile.email} · {profile.document || "—"}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge label={(profile.category || "outro").toUpperCase()} />
              <Badge label={`Plano ${(profile.plan || "free").toUpperCase()}${profile.plan_cycle ? " · "+profile.plan_cycle : ""}`} />
              <Badge label={`${balance.toLocaleString("pt-BR")} 🪙`} tone="amber" />
              {profile.status === "bloqueado" && <Badge label="SUSPENSO" tone="red" />}
            </div>
          </div>
          <button
            onClick={toggleBlock}
            className={"px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border flex items-center gap-1 shrink-0 " +
              (profile.status === "bloqueado"
                ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-200"
                : "bg-red-500/20 border-red-400/40 text-red-200")}
          >
            {profile.status === "bloqueado" ? <><ShieldCheck className="w-3 h-3" /> Desbloquear</> : <><ShieldOff className="w-3 h-3" /> Bloquear</>}
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Cadastrado em" value={fmt(profile.created_at)} />
        <Metric label="Último acesso" value={fmt(profile.last_seen_at)} />
        <Metric label="O.S. envolvidas" value={String(orders.length)} />
        <Metric label="Avaliações recebidas" value={String(reviews.length)} />
      </div>

      {/* Galeria */}
      <Section icon={<ImageIcon className="w-3 h-3" />} title={`Galeria de mídia (${allPhotos.length})`}>
        {allPhotos.length === 0 ? <Empty text="Sem fotos cadastradas." /> : (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {allPhotos.slice(0, 24).map((u, i) => (
              <a key={i} href={u} target="_blank" rel="noreferrer" className="aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:opacity-80">
                <img src={u} className="w-full h-full object-cover" loading="lazy" />
              </a>
            ))}
          </div>
        )}
      </Section>

      {/* Extrato de moedas */}
      <Section icon={<Coins className="w-3 h-3 text-amber-300" />} title="Últimas 30 transações de moedas">
        {txs.length === 0 ? <Empty text="Sem transações registradas." /> : (
          <ul className="space-y-1.5">
            {txs.map((t) => (
              <li key={t.id} className="flex items-center justify-between text-xs bg-black/40 border border-white/10 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  {t.type === "credit" ? <TrendingUp className="w-3 h-3 text-emerald-300" /> : <TrendingDown className="w-3 h-3 text-red-300" />}
                  <span className="text-white truncate">{t.description || t.source}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={"font-black tabular-nums " + (t.type === "credit" ? "text-emerald-300" : "text-red-300")}>
                    {t.type === "credit" ? "+" : "−"}{t.amount}
                  </span>
                  <span className="text-gray-500">{fmt(t.created_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Ordens de Serviço */}
      <Section icon={<ClipboardList className="w-3 h-3" />} title={`Ordens de Serviço (${orders.length})`}>
        {orders.length === 0 ? <Empty text="Nenhuma O.S. envolvida." /> : (
          <ul className="divide-y divide-white/5">
            {orders.map((o) => (
              <li key={o.id} className="py-2 flex items-center justify-between text-xs gap-2">
                <span className="text-white truncate">{o.title || o.id}</span>
                <span className="text-gray-500 shrink-0">{o.status || "—"} · {fmt(o.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Avaliações */}
      <Section icon={<Star className="w-3 h-3 text-amber-300" />} title={`Avaliações recebidas (${reviews.length})`}>
        {reviews.length === 0 ? <Empty text="Sem avaliações ainda." /> : (
          <ul className="space-y-2">
            {reviews.map((r) => (
              <li key={r.id} className="bg-black/40 border border-white/10 rounded-xl p-2.5">
                <div className="flex items-center gap-1 text-amber-300 text-xs font-black">
                  {"★".repeat(Number(r.rating || 0))}
                  <span className="text-gray-500 font-normal ml-2">{fmt(r.created_at)}</span>
                </div>
                <p className="text-white text-xs mt-1">{r.comment || "Sem comentário"}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Chats */}
      <Section icon={<MessageSquare className="w-3 h-3 text-cyan-300" />} title={`Últimas mensagens enviadas (${chats.length})`}>
        {chats.length === 0 ? <Empty text="Nenhum registro de chat." /> : (
          <ul className="space-y-1.5">
            {chats.map((c) => (
              <li key={c.id} className="text-xs bg-black/40 border border-white/10 rounded-xl px-3 py-2">
                <div className="text-gray-500 text-[10px]">{fmt(c.created_at)} · sala {String(c.chat_room_id).slice(0,8)}</div>
                <div className="text-white truncate">{c.content}</div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone?: "amber" | "red" }) {
  const cls = tone === "amber"
    ? "text-amber-300 bg-amber-500/10 border-amber-400/40"
    : tone === "red"
      ? "text-red-300 bg-red-500/10 border-red-400/40"
      : "text-white/80 bg-white/5 border-white/10";
  return <span className={"px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-widest " + cls}>{label}</span>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#1A1A1B]/70 p-3">
      <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">{label}</div>
      <div className="text-white text-sm md:text-base font-black mt-1 truncate">{value}</div>
    </div>
  );
}
function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#1A1A1B]/70 p-4 space-y-3">
      <h2 className="text-[11px] font-black uppercase tracking-widest text-white/70 flex items-center gap-2">{icon} {title}</h2>
      {children}
    </section>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="text-[11px] text-gray-500 italic">{text}</p>;
}
