import { useMemo, useState } from "react";
import { Check, Star, Plus, X, Search, Briefcase, Sparkles, Coins } from "lucide-react";
import { ACTIVITY_MATRIX } from "@/lib/activity-branches";
import { ActivityBranchPicker } from "@/components/ActivityBranchPicker";
import { useJobRoles } from "@/hooks/use-job-roles";
import { toast } from "sonner";
import { consumeCoins, getCachedBalance, getCurrentUserId } from "@/lib/coins";
import type { PlanId } from "@/lib/monetization";

type Props = {
  profile: any;
  setProfile: (p: any) => void;
  accent?: string;
  planId?: PlanId;
};

const MAX_ROLES = 10;
const EXTRA_COST = 15;

function quotaFor(plan: PlanId): number {
  if (plan === "premium") return 5;
  if (plan === "pro" || plan === "basico") return 3;
  return 1;
}

function parseCsv(v?: string | null): string[] {
  return String(v ?? "")
    .split("||")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toCsv(arr: string[]): string {
  return arr.filter(Boolean).join("||");
}

export function PreferredServicePicker({ profile, setProfile, accent = "hsl(var(--primary))", planId = "free" }: Props) {
  const macroLabel: string | undefined = profile?.activity_branch;

  const macro = useMemo(() => {
    if (!macroLabel) return null;
    return ACTIVITY_MATRIX.find((m) => m.label === macroLabel) || null;
  }, [macroLabel]);

  const branches = useMemo(() => {
    if (!macro) return [] as string[];
    return macro.branches
      .map((b) => b.label)
      .filter((l) => !l.toLowerCase().startsWith("📝"));
  }, [macro]);

  const preferredService: string = profile?.preferred_service || "";
  const roles: string[] = parseCsv(profile?.job_roles);
  const quota = quotaFor(planId);
  const overQuota = Math.max(0, roles.length - quota);

  const { roles: sharedRoles, addRole } = useJobRoles(preferredService);
  const [newRole, setNewRole] = useState("");
  const [query, setQuery] = useState("");
  const [charging, setCharging] = useState(false);

  const setPreferredService = (label: string) => {
    setProfile({
      ...profile,
      preferred_service: label,
      // ao trocar de serviço preferencial, limpamos os cargos anteriores
      job_roles: "",
    });
  };

  const chargeExtraIfNeeded = async (nextLen: number): Promise<boolean> => {
    if (nextLen <= quota) return true;
    const uid = getCurrentUserId();
    if (!uid) { toast.error("Faça login para desbloquear cargos extras."); return false; }
    const balance = getCachedBalance();
    if (balance < EXTRA_COST) {
      toast.error(`Saldo insuficiente. Cada cargo extra custa ${EXTRA_COST} moedas.`);
      return false;
    }
    const ok = window.confirm(`Seu plano permite ${quota} cargo(s). Deseja gastar ${EXTRA_COST} moedas por este cargo extra?`);
    if (!ok) return false;
    setCharging(true);
    try {
      const res = await consumeCoins(uid, EXTRA_COST, "Cargo extra no perfil", "action_consume", {
        operation: "extra_job_role",
      });
      if (!res.ok) { toast.error("Não foi possível debitar as moedas."); return false; }
      toast.success(`-${EXTRA_COST} moedas • Cargo extra desbloqueado.`);
      return true;
    } finally {
      setCharging(false);
    }
  };

  const toggleRole = async (name: string) => {
    const has = roles.includes(name);
    let next: string[];
    if (has) {
      next = roles.filter((r) => r !== name);
    } else {
      if (roles.length >= MAX_ROLES) {
        toast.warning(`Limite máximo de ${MAX_ROLES} cargos.`);
        return;
      }
      const paid = await chargeExtraIfNeeded(roles.length + 1);
      if (!paid) return;
      next = [...roles, name];
    }
    setProfile({ ...profile, job_roles: toCsv(next) });
  };

  const setAsPreferential = (name: string) => {
    if (!roles.includes(name)) return;
    const next = [name, ...roles.filter((r) => r !== name)];
    setProfile({ ...profile, job_roles: toCsv(next) });
  };

  const handleAddRole = async () => {
    const v = newRole.trim();
    if (!v) return;
    if (roles.length >= MAX_ROLES) {
      toast.warning(`Limite máximo de ${MAX_ROLES} cargos.`);
      return;
    }
    if (!roles.includes(v)) {
      const paid = await chargeExtraIfNeeded(roles.length + 1);
      if (!paid) return;
    }
    await addRole(v);
    if (!roles.includes(v)) {
      setProfile({ ...profile, job_roles: toCsv([...roles, v]) });
    }
    setNewRole("");
    toast.success(`Cargo "${v}" adicionado.`);
  };

  const filteredShared = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = sharedRoles.filter((r) => !q || r.toLowerCase().includes(q));
    return list;
  }, [sharedRoles, query]);

  return (
    <div className="space-y-6">
      {/* PICKER DA MACRO-CATEGORIA */}
      <ActivityBranchPicker
        value={profile?.activity_branch}
        onChange={(next) => setProfile({ ...profile, activity_branch: next, preferred_service: "", job_roles: "" })}
        accent={accent}
      />

      {/* SUBCATEGORIAS DO MACRO -> SERVIÇO PREFERENCIAL */}
      {macro && branches.length > 0 && (
        <div className="pt-6 border-t border-white/5 space-y-3">
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4" style={{ color: accent }} />
            <div className="min-w-0">
              <h4 className="text-sm font-black uppercase tracking-tight text-white">Serviço Preferencial</h4>
              <p className="text-[11px] text-white/50 mt-1 break-words">
                Escolha a subcategoria da sua categoria principal <b>{macro.label}</b> que melhor representa seu serviço.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {branches.map((b) => {
              const active = preferredService === b;
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => setPreferredService(b)}
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-bold transition-all active:scale-95"
                  style={{
                    borderColor: active ? accent : "rgba(255,255,255,0.12)",
                    background: active ? `${accent}22` : "rgba(255,255,255,0.03)",
                    color: active ? "#fff" : "rgba(255,255,255,0.85)",
                  }}
                  aria-pressed={active}
                >
                  {active && <Check className="w-3 h-3" style={{ color: accent }} />}
                  {b}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* CARGOS — apenas após escolher o serviço preferencial */}
      {preferredService && (
        <div className="pt-6 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-3">
            <Briefcase className="w-4 h-4" style={{ color: accent }} />
            <div className="min-w-0">
              <h4 className="text-sm font-black uppercase tracking-tight text-white">
                Cargos em <span style={{ color: accent }}>{preferredService}</span>
              </h4>
              <p className="text-[11px] text-white/50 mt-1 break-words">
                Plano <b>{planId.toUpperCase()}</b> inclui <b>{quota}</b> cargo(s). Extras custam{" "}
                <b className="text-amber-300">{EXTRA_COST} 🪙</b> cada (até {MAX_ROLES} no total).
                O <b>1º da lista</b> é o preferencial (destacado).
              </p>
            </div>
          </div>

          {overQuota > 0 && (
            <div className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 inline-flex items-center gap-2">
              <Coins className="w-3 h-3" /> {overQuota} cargo(s) extra • {overQuota * EXTRA_COST} 🪙 debitadas
            </div>
          )}

          {/* Cargos já selecionados (ordem = preferencial primeiro) */}
          {roles.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">
                Meus Cargos ({roles.length}/{MAX_ROLES})
              </p>
              <div className="flex flex-wrap gap-2">
                {roles.map((r, idx) => {
                  const isPref = idx === 0;
                  return (
                    <div
                      key={r}
                      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold"
                      style={{
                        borderColor: isPref ? accent : "rgba(255,255,255,0.18)",
                        background: isPref ? `${accent}33` : "rgba(255,255,255,0.05)",
                        boxShadow: isPref ? `0 0 0 1px ${accent}55` : undefined,
                      }}
                    >
                      {isPref ? (
                        <Star className="w-3 h-3 fill-current" style={{ color: accent }} aria-label="Cargo preferencial" />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAsPreferential(r)}
                          className="opacity-60 hover:opacity-100"
                          title="Definir como preferencial"
                          aria-label={`Definir ${r} como preferencial`}
                        >
                          <Star className="w-3 h-3" />
                        </button>
                      )}
                      <span>{r}</span>
                      <button
                        type="button"
                        onClick={() => toggleRole(r)}
                        className="opacity-60 hover:opacity-100 hover:text-red-400"
                        aria-label={`Remover ${r}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Busca + adicionar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" aria-hidden />
              <input
                type="text"
                value={newRole || query}
                onChange={(e) => { setQuery(e.target.value); setNewRole(e.target.value); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddRole(); } }}
                placeholder="Buscar ou digitar novo cargo..."
                maxLength={60}
                className="w-full bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleAddRole}
              disabled={!newRole.trim() || roles.length >= MAX_ROLES || charging}
              className="shrink-0 inline-flex items-center gap-1 rounded-xl px-3 py-2.5 text-[11px] font-black uppercase tracking-wide disabled:opacity-40 whitespace-nowrap"
              style={{ background: accent, color: "#000" }}
              title={roles.length >= quota ? `Cargo extra: ${EXTRA_COST} 🪙` : "Adicionar cargo"}
            >
              <Plus className="w-3 h-3" /> Add
              {roles.length >= quota && roles.length < MAX_ROLES && (
                <span className="ml-1 text-[9px] font-black">{EXTRA_COST}🪙</span>
              )}
            </button>
          </div>

          {/* Sugestões da lista compartilhada */}
          <div className="flex flex-wrap gap-2">
            {filteredShared.length === 0 && (
              <p className="text-[11px] text-white/40 italic">
                Nenhum cargo cadastrado ainda para <b>{preferredService}</b>. Seja o primeiro a sugerir!
              </p>
            )}
            {filteredShared.map((r) => {
              const active = roles.includes(r);
              const disabled = !active && roles.length >= MAX_ROLES;
              return (
                <button
                  key={r}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleRole(r)}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all active:scale-95 disabled:opacity-30"
                  style={{
                    borderColor: active ? accent : "rgba(255,255,255,0.12)",
                    background: active ? `${accent}22` : "rgba(255,255,255,0.02)",
                    color: active ? "#fff" : "rgba(255,255,255,0.75)",
                  }}
                  aria-pressed={active}
                >
                  {active ? <Check className="w-3 h-3" style={{ color: accent }} /> : <Plus className="w-3 h-3" />}
                  {r}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
