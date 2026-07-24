import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Users, Search, Filter, Coins, ShieldOff, ShieldCheck, Star, Eye,
  MoreVertical, ArrowLeft, Crown, Award, Medal, Building2, X,
  UserCheck, UserX, Plus, Minus,
} from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { creditCoins, consumeCoins } from "@/lib/coins";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  component: AdminUsuariosPage,
});

type CategoryKey = "lojista" | "prestador" | "fornecedor" | "casual" | "outro";
type PlanKey = "free" | "basico" | "pro" | "premium";
type StatusKey = "ativo" | "bloqueado";

interface AdminUser {
  id: string;
  full_name: string | null;
  email: string | null;
  document: string | null;
  city: string | null;
  state: string | null;
  avatar_url: string | null;
  category: CategoryKey;
  plan: PlanKey;
  plan_cycle: "monthly" | "yearly" | null;
  balance: number;
  badge: "none" | "bronze" | "prata" | "ouro" | "cnpj";
  last_seen_at: string | null;
  status: StatusKey;
}

const CAT_META: Record<CategoryKey, { label: string; color: string; ring: string }> = {
  lojista:    { label: "🏪 Lojista",       color: "text-cyan-300 bg-cyan-500/10 border-cyan-400/40",     ring: "ring-cyan-400/40" },
  prestador:  { label: "🛠️ Prestador",     color: "text-orange-300 bg-orange-500/10 border-orange-400/40", ring: "ring-orange-400/40" },
  fornecedor: { label: "🚚 Fornecedor",    color: "text-violet-300 bg-violet-500/10 border-violet-400/40", ring: "ring-violet-400/40" },
  casual:     { label: "👤 Cliente Final", color: "text-emerald-300 bg-emerald-500/10 border-emerald-400/40", ring: "ring-emerald-400/40" },
  outro:      { label: "• Outro",          color: "text-gray-300 bg-white/5 border-white/10", ring: "ring-white/10" },
};

const PLAN_META: Record<PlanKey, { label: string; color: string }> = {
  free:    { label: "Free",    color: "text-gray-300 bg-white/5 border-white/10" },
  basico:  { label: "Básico",  color: "text-sky-300 bg-sky-500/10 border-sky-400/30" },
  pro:     { label: "Pró",     color: "text-emerald-300 bg-emerald-500/10 border-emerald-400/30" },
  premium: { label: "Premium", color: "text-amber-300 bg-amber-500/10 border-amber-400/40" },
};

function fmtLastSeen(iso: string | null): string {
  if (!iso) return "Nunca";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Agora";
  if (min < 60) return `Há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hoje às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  const days = Math.floor(h / 24);
  if (days === 1) return "Ontem";
  if (days < 7) return `Há ${days} dias`;
  return d.toLocaleDateString("pt-BR");
}

function useDebounced<T>(value: T, delay = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function AdminUsuariosPage() {
  const navigate = useNavigate();
  const [authOk, setAuthOk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const qDeb = useDebounced(q, 250);
  const [catFilter, setCatFilter] = useState<CategoryKey | "todos">("todos");
  const [planFilter, setPlanFilter] = useState<PlanKey | "todos">("todos");
  const [statusFilter, setStatusFilter] = useState<StatusKey | "todos">("todos");

  const [coinModalUser, setCoinModalUser] = useState<AdminUser | null>(null);
  const [planModalUser, setPlanModalUser] = useState<AdminUser | null>(null);
  const [viewUser, setViewUser] = useState<AdminUser | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // Gate admin
  useEffect(() => {
    const email = typeof window !== "undefined" ? localStorage.getItem("fixxer_user_email") || "" : "";
    const role  = typeof window !== "undefined" ? localStorage.getItem("fixxer_user_role")  || "" : "";
    if (email.trim() !== "jorgericardosalgado@gmail.com" && role.toLowerCase() !== "admin") {
      navigate({ to: "/dashboard" as any });
      return;
    }
    setAuthOk(true);
  }, [navigate]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error } = await supabaseExternal
        .from("profiles")
        .select("id, full_name, email, document, city, state, avatar_url, category, plan, plan_cycle, badge, last_seen_at, status")
        .order("last_seen_at", { ascending: false, nullsFirst: false })
        .limit(500);
      if (error) throw error;

      const ids = (profiles ?? []).map((p: any) => p.id);
      let balMap = new Map<string, number>();
      if (ids.length > 0) {
        const { data: coins } = await supabaseExternal
          .from("user_coins")
          .select("user_id, balance")
          .in("user_id", ids);
        (coins ?? []).forEach((c: any) => balMap.set(c.user_id, Number(c.balance) || 0));
      }

      const mapped: AdminUser[] = (profiles ?? []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name ?? null,
        email: p.email ?? null,
        document: p.document ?? null,
        city: p.city ?? null,
        state: p.state ?? null,
        avatar_url: p.avatar_url ?? null,
        category: (p.category as CategoryKey) ?? "outro",
        plan: (p.plan as PlanKey) ?? "free",
        plan_cycle: (p.plan_cycle as any) ?? null,
        balance: balMap.get(p.id) ?? 0,
        badge: (p.badge as any) ?? "none",
        last_seen_at: p.last_seen_at ?? null,
        status: (p.status as StatusKey) ?? "ativo",
      }));
      setUsers(mapped);
    } catch (e: any) {
      console.warn("[admin/usuarios] load", e);
      toast.error("Falha ao carregar usuários. Verifique a tabela profiles.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (authOk) loadUsers(); }, [authOk]);

  // Realtime saldo
  useEffect(() => {
    if (!authOk) return;
    const ch = supabaseExternal
      .channel("admin:user_coins")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_coins" }, (payload: any) => {
        const uid = payload?.new?.user_id ?? payload?.old?.user_id;
        const bal = Number(payload?.new?.balance ?? 0);
        if (!uid) return;
        setUsers((cur) => cur.map((u) => u.id === uid ? { ...u, balance: bal } : u));
      })
      .subscribe();
    return () => { try { supabaseExternal.removeChannel(ch); } catch {} };
  }, [authOk]);

  const filtered = useMemo(() => {
    const term = qDeb.trim().toLowerCase();
    return users.filter((u) => {
      if (catFilter !== "todos" && u.category !== catFilter) return false;
      if (planFilter !== "todos" && u.plan !== planFilter) return false;
      if (statusFilter !== "todos" && u.status !== statusFilter) return false;
      if (!term) return true;
      const hay = [u.full_name, u.email, u.document, u.city].map((x) => (x ?? "").toLowerCase()).join(" ");
      return hay.includes(term);
    });
  }, [users, qDeb, catFilter, planFilter, statusFilter]);

  const metrics = useMemo(() => {
    const total = users.length;
    const bloqueados = users.filter((u) => u.status === "bloqueado").length;
    const ativosMes = users.filter((u) => {
      if (!u.last_seen_at) return false;
      return Date.now() - new Date(u.last_seen_at).getTime() < 30 * 86400_000;
    }).length;
    const moedas = users.reduce((s, u) => s + (u.balance || 0), 0);
    return { total, ativosMes, moedas, bloqueados };
  }, [users]);

  if (!authOk) return null;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24 min-h-[100dvh]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to={"/admin" as any} className="p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-[10px] font-black uppercase tracking-widest">
              <Users className="w-3 h-3" /> Gestão de Usuários
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase italic mt-1">
              Central de <span className="text-emerald-400">Usuários</span>
            </h1>
          </div>
        </div>
        <button
          onClick={loadUsers}
          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-black uppercase tracking-widest text-white hover:bg-white/10"
        >
          Recarregar
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric icon={<Users className="w-4 h-4 text-emerald-300" />} label="Total" value={metrics.total.toLocaleString("pt-BR")} />
        <Metric icon={<UserCheck className="w-4 h-4 text-sky-300" />}  label="Ativos (30d)" value={metrics.ativosMes.toLocaleString("pt-BR")} />
        <Metric icon={<Coins className="w-4 h-4 text-amber-300" />}   label="Moedas em circulação" value={metrics.moedas.toLocaleString("pt-BR")} />
        <Metric icon={<UserX className="w-4 h-4 text-red-300" />}     label="Bloqueados" value={metrics.bloqueados.toLocaleString("pt-BR")} />
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-white/10 bg-[#1A1A1B]/70 p-3 md:p-4 space-y-3">
        <div className="flex items-center gap-2 p-2 rounded-xl bg-black/40 border border-white/10">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, e-mail, CPF/CNPJ ou cidade..."
            className="bg-transparent outline-none text-sm text-white w-full"
          />
          {q && (
            <button onClick={() => setQ("")} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Pills label="Categoria" value={catFilter} onChange={(v) => setCatFilter(v as any)}
            options={[
              { v: "todos", l: "Todos" },
              { v: "lojista", l: "🏪 Lojista" },
              { v: "prestador", l: "🛠️ Prestador" },
              { v: "fornecedor", l: "🚚 Fornecedor" },
              { v: "casual", l: "👤 Cliente" },
            ]}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Pills label="Plano" value={planFilter} onChange={(v) => setPlanFilter(v as any)}
            options={[
              { v: "todos", l: "Todos" },
              { v: "free", l: "Free" },
              { v: "basico", l: "Básico" },
              { v: "pro", l: "Pró" },
              { v: "premium", l: "Premium" },
            ]}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Pills label="Status" value={statusFilter} onChange={(v) => setStatusFilter(v as any)}
            options={[
              { v: "todos", l: "Todos" },
              { v: "ativo", l: "Ativos" },
              { v: "bloqueado", l: "Bloqueados" },
            ]}
          />
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          <Filter className="w-3 h-3 inline mr-1" /> {filtered.length} de {users.length} usuários
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">
          Nenhum usuário encontrado com os filtros atuais.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <UserCard
              key={u.id}
              u={u}
              menuOpen={menuOpen === u.id}
              onToggleMenu={() => setMenuOpen(menuOpen === u.id ? null : u.id)}
              onView={() => { setViewUser(u); setMenuOpen(null); }}
              onCoins={() => { setCoinModalUser(u); setMenuOpen(null); }}
              onPlan={() => { setPlanModalUser(u); setMenuOpen(null); }}
              onToggleBlock={() => { void toggleBlock(u, setUsers); setMenuOpen(null); }}
            />
          ))}
        </div>
      )}

      {coinModalUser && (
        <CoinAdjustModal user={coinModalUser} onClose={() => setCoinModalUser(null)} onApplied={(delta) => {
          setUsers((cur) => cur.map((x) => x.id === coinModalUser.id ? { ...x, balance: Math.max(0, x.balance + delta) } : x));
        }} />
      )}
      {planModalUser && (
        <PlanChangeModal user={planModalUser} onClose={() => setPlanModalUser(null)} onApplied={(plan, cycle) => {
          setUsers((cur) => cur.map((x) => x.id === planModalUser.id ? { ...x, plan, plan_cycle: cycle } : x));
        }} />
      )}
      {viewUser && <ViewProfileModal user={viewUser} onClose={() => setViewUser(null)} />}
    </div>
  );
}

/* ------------ Actions ------------ */

async function toggleBlock(u: AdminUser, setUsers: React.Dispatch<React.SetStateAction<AdminUser[]>>) {
  const next: StatusKey = u.status === "bloqueado" ? "ativo" : "bloqueado";
  if (!confirm(`Confirmar ${next === "bloqueado" ? "BLOQUEIO" : "DESBLOQUEIO"} de ${u.full_name || u.email || u.id}?`)) return;
  setUsers((cur) => cur.map((x) => x.id === u.id ? { ...x, status: next } : x));
  try {
    const { error } = await supabaseExternal.from("profiles").update({ status: next }).eq("id", u.id);
    if (error) throw error;
    toast.success(next === "bloqueado" ? "Usuário bloqueado" : "Usuário desbloqueado");
  } catch (e: any) {
    toast.error(e?.message || "Falha ao atualizar status");
    setUsers((cur) => cur.map((x) => x.id === u.id ? { ...x, status: u.status } : x));
  }
}

/* ------------ Subcomponents ------------ */

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#1A1A1B]/70 p-3">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
        {icon} {label}
      </div>
      <div className="text-xl md:text-2xl font-black text-white mt-1 tabular-nums">{value}</div>
    </div>
  );
}

function Pills<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void;
  options: Array<{ v: T; l: string }>;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{label}:</span>
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={
            "px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest border transition-all " +
            (value === o.v
              ? "bg-emerald-400/20 border-emerald-400/60 text-emerald-200"
              : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10")
          }
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function BadgeIcon({ badge }: { badge: AdminUser["badge"] }) {
  if (badge === "ouro") return <Crown className="w-3.5 h-3.5 text-amber-300" />;
  if (badge === "prata") return <Award className="w-3.5 h-3.5 text-slate-300" />;
  if (badge === "bronze") return <Medal className="w-3.5 h-3.5 text-orange-400" />;
  if (badge === "cnpj") return <Building2 className="w-3.5 h-3.5 text-emerald-300" />;
  return <Star className="w-3.5 h-3.5 text-gray-500" />;
}

function UserCard({
  u, menuOpen, onToggleMenu, onView, onCoins, onPlan, onToggleBlock,
}: {
  u: AdminUser; menuOpen: boolean;
  onToggleMenu: () => void; onView: () => void; onCoins: () => void; onPlan: () => void; onToggleBlock: () => void;
}) {
  const cat = CAT_META[u.category] ?? CAT_META.outro;
  const plan = PLAN_META[u.plan] ?? PLAN_META.free;
  return (
    <div className={"relative rounded-2xl border bg-[#1A1A1B]/80 p-3 md:p-4 border-white/10 " + (u.status === "bloqueado" ? "opacity-70" : "")}>
      <div className="flex items-start gap-3">
        <div className={"w-12 h-12 rounded-2xl bg-white/5 border border-white/10 overflow-hidden shrink-0 ring-2 " + cat.ring}>
          {u.avatar_url
            ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-white/60 text-lg font-black">{(u.full_name || u.email || "?").slice(0, 1).toUpperCase()}</div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-sm md:text-base font-black text-white truncate">{u.full_name || "Sem nome"}</div>
            <span className={"px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest " + cat.color}>{cat.label}</span>
            <span className={"px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest " + plan.color}>
              {plan.label}{u.plan_cycle ? ` · ${u.plan_cycle === "yearly" ? "Anual" : "Mensal"}` : ""}
            </span>
            {u.status === "bloqueado" && (
              <span className="px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest text-red-300 bg-red-500/10 border-red-400/40">
                Suspenso
              </span>
            )}
          </div>
          <div className="text-[11px] text-gray-400 truncate mt-0.5">{u.email || "—"} {u.document ? `· ${u.document}` : ""}</div>
          <div className="text-[11px] text-gray-500 truncate">{u.city && u.state ? `${u.city}/${u.state}` : (u.city || u.state || "—")}</div>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-300 tabular-nums">
              <Coins className="w-3.5 h-3.5" /> {u.balance.toLocaleString("pt-BR")} moedas
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
              <BadgeIcon badge={u.badge} /> {u.badge === "none" ? "Sem selo" : u.badge.toUpperCase()}
            </span>
            <span className="text-[11px] text-gray-500">· {fmtLastSeen(u.last_seen_at)}</span>
          </div>
        </div>
        <div className="relative">
          <button onClick={onToggleMenu} className="p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10">
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#111] border border-white/10 shadow-2xl z-20 overflow-hidden">
              <MenuItem icon={<Eye className="w-4 h-4" />} label="Ver perfil completo" onClick={onView} />
              <MenuItem icon={<Coins className="w-4 h-4 text-amber-300" />} label="Adicionar / remover moedas" onClick={onCoins} />
              <MenuItem icon={<Star className="w-4 h-4 text-emerald-300" />} label="Alterar plano / cortesia" onClick={onPlan} />
              <MenuItem
                icon={u.status === "bloqueado" ? <ShieldCheck className="w-4 h-4 text-emerald-300" /> : <ShieldOff className="w-4 h-4 text-red-300" />}
                label={u.status === "bloqueado" ? "Desbloquear acesso" : "Bloquear acesso"}
                onClick={onToggleBlock}
                danger={u.status !== "bloqueado"}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={"w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs font-bold text-white hover:bg-white/5 " + (danger ? "text-red-300" : "")}
    >
      {icon}{label}
    </button>
  );
}

/* ------------ Modals ------------ */

function CoinAdjustModal({ user, onClose, onApplied }: { user: AdminUser; onClose: () => void; onApplied: (delta: number) => void }) {
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState<string>("Bônus administrativo");
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    if (!amount || amount === 0) { toast.error("Informe uma quantidade diferente de zero"); return; }
    if (!reason.trim()) { toast.error("Informe um motivo"); return; }
    setBusy(true);
    try {
      if (amount > 0) {
        await creditCoins(user.id, amount, `Crédito Administrativo — ${reason}`, "admin_adjust", "admin");
      } else {
        await consumeCoins(user.id, Math.abs(amount), `Débito Administrativo — ${reason}`, "admin_adjust", "admin");
      }
      onApplied(amount);
      toast.success(amount > 0 ? `+${amount} moedas creditadas` : `${amount} moedas debitadas`);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao ajustar saldo");
    } finally { setBusy(false); }
  };

  return (
    <ModalShell title="Ajuste de Moedas" onClose={onClose}>
      <div className="text-xs text-gray-400">Usuário: <span className="text-white font-bold">{user.full_name || user.email}</span></div>
      <div className="text-xs text-gray-400">Saldo atual: <span className="text-amber-300 font-black tabular-nums">{user.balance.toLocaleString("pt-BR")} 🪙</span></div>
      <div className="flex items-center gap-2 mt-3">
        <button onClick={() => setAmount((a) => a - 10)} className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300"><Minus className="w-4 h-4" /></button>
        <input
          type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)}
          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-center text-white font-black text-lg tabular-nums"
          placeholder="0"
        />
        <button onClick={() => setAmount((a) => a + 10)} className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"><Plus className="w-4 h-4" /></button>
      </div>
      <p className="text-[10px] text-gray-500 mt-1">Valores negativos debitam moedas.</p>
      <textarea
        value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
        className="w-full mt-3 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
        placeholder="Motivo / Justificativa"
      />
      <button
        onClick={apply} disabled={busy}
        className="w-full mt-3 py-3 rounded-xl bg-emerald-400 text-black font-black uppercase tracking-widest text-xs disabled:opacity-60"
      >
        {busy ? "Aplicando..." : "Confirmar injeção de moedas"}
      </button>
    </ModalShell>
  );
}

function PlanChangeModal({ user, onClose, onApplied }: { user: AdminUser; onClose: () => void; onApplied: (plan: PlanKey, cycle: "monthly" | "yearly") => void }) {
  const [plan, setPlan] = useState<PlanKey>(user.plan);
  const [cycle, setCycle] = useState<"monthly" | "yearly">(user.plan_cycle ?? "monthly");
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    setBusy(true);
    try {
      const { error } = await supabaseExternal.from("profiles").update({ plan, plan_cycle: cycle }).eq("id", user.id);
      if (error) throw error;
      onApplied(plan, cycle);
      toast.success(`Plano atualizado para ${PLAN_META[plan].label} (${cycle === "yearly" ? "Anual" : "Mensal"})`);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao alterar plano");
    } finally { setBusy(false); }
  };

  return (
    <ModalShell title="Alterar plano / Cortesia" onClose={onClose}>
      <div className="text-xs text-gray-400 mb-3">Usuário: <span className="text-white font-bold">{user.full_name || user.email}</span></div>
      <div className="grid grid-cols-2 gap-2">
        {(["free", "basico", "pro", "premium"] as PlanKey[]).map((p) => (
          <button key={p} onClick={() => setPlan(p)}
            className={"px-3 py-3 rounded-xl border text-xs font-black uppercase tracking-widest " +
              (plan === p ? "bg-emerald-400/20 border-emerald-400/60 text-emerald-200" : "bg-white/5 border-white/10 text-gray-300")}>
            {PLAN_META[p].label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {(["monthly", "yearly"] as const).map((c) => (
          <button key={c} onClick={() => setCycle(c)}
            className={"px-3 py-2 rounded-xl border text-xs font-black uppercase tracking-widest " +
              (cycle === c ? "bg-emerald-400/20 border-emerald-400/60 text-emerald-200" : "bg-white/5 border-white/10 text-gray-300")}>
            {c === "yearly" ? "Anual" : "Mensal"}
          </button>
        ))}
      </div>
      <button onClick={apply} disabled={busy}
        className="w-full mt-4 py-3 rounded-xl bg-emerald-400 text-black font-black uppercase tracking-widest text-xs disabled:opacity-60">
        {busy ? "Salvando..." : "Aplicar plano"}
      </button>
    </ModalShell>
  );
}

function ViewProfileModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  return (
    <ModalShell title="Perfil completo (auditoria)" onClose={onClose} wide>
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : null}
        </div>
        <div>
          <div className="text-white font-black text-lg">{user.full_name || "Sem nome"}</div>
          <div className="text-gray-400 text-xs">{user.email}</div>
          <div className="text-gray-500 text-xs">{user.document || "—"}</div>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2 mt-4 text-xs">
        <Info k="Categoria" v={CAT_META[user.category]?.label ?? "—"} />
        <Info k="Plano" v={`${PLAN_META[user.plan].label}${user.plan_cycle ? ` · ${user.plan_cycle === "yearly" ? "Anual" : "Mensal"}` : ""}`} />
        <Info k="Saldo" v={`${user.balance.toLocaleString("pt-BR")} 🪙`} />
        <Info k="Selo" v={user.badge.toUpperCase()} />
        <Info k="Cidade/UF" v={user.city && user.state ? `${user.city}/${user.state}` : "—"} />
        <Info k="Status" v={user.status === "bloqueado" ? "SUSPENSO" : "ATIVO"} />
        <Info k="Último acesso" v={fmtLastSeen(user.last_seen_at)} />
        <Info k="User ID" v={user.id} />
      </dl>
      <div className="mt-4 flex gap-2 flex-wrap">
        <a href={`/prestador/${user.id}`} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-black uppercase tracking-widest">Ver perfil público</a>
      </div>
    </ModalShell>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-black/40 border border-white/10 p-2">
      <div className="text-[9px] uppercase tracking-widest text-gray-500 font-black">{k}</div>
      <div className="text-white text-sm break-words">{v}</div>
    </div>
  );
}

function ModalShell({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
      <div className={"w-full md:rounded-3xl bg-[#0F0F10] border border-white/10 max-h-[100dvh] md:max-h-[90dvh] overflow-y-auto scrollbar-none " + (wide ? "md:max-w-2xl" : "md:max-w-md")}>
        <div className="sticky top-0 bg-[#0F0F10]/95 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <h3 className="text-white font-black uppercase tracking-widest text-xs">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5 border border-white/10 text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
