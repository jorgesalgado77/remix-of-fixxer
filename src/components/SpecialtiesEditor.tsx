import { useMemo, useState } from "react";
import { Sparkles, Plus, Trash2, Star, StarOff, Coins } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type Specialty = {
  id: string;
  title: string;
  description?: string;
  featured?: boolean;
};

type PlanId = "free" | "pro" | "premium" | string;

const QUOTA_BY_PLAN: Record<string, number> = {
  free: 1,
  basic: 1,
  básico: 1,
  basico: 1,
  pro: 2,
  premium: 3,
};

const MAX_SPECIALTIES = 6;
const EXTRA_COST = 15; // moedas por especialidade extra

function planLabel(id: string) {
  const k = String(id || "free").toLowerCase();
  if (k === "premium") return "Premium";
  if (k === "pro") return "Pro";
  return "Free";
}

function uid() {
  return `sp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function SpecialtiesEditor({
  value,
  onChange,
  planId,
  userId,
}: {
  value: Specialty[];
  onChange: (next: Specialty[]) => void;
  planId: PlanId;
  userId?: string | null;
}) {
  const list = Array.isArray(value) ? value : [];
  const plan = String(planId || "free").toLowerCase();
  const quota = QUOTA_BY_PLAN[plan] ?? 1;

  const [draftTitle, setDraftTitle] = useState("");
  const [draftSubtitle, setDraftSubtitle] = useState("");
  const [charging, setCharging] = useState(false);

  const extrasCount = Math.max(0, list.length - quota);
  const extrasCost = extrasCount * EXTRA_COST;
  const canAddFree = list.length < quota;
  const reachedMax = list.length >= MAX_SPECIALTIES;

  const addSpecialty = async () => {
    const title = draftTitle.trim();
    if (!title) { toast.error("Informe o título principal da especialidade."); return; }
    if (reachedMax) { toast.error(`Limite máximo de ${MAX_SPECIALTIES} especialidades atingido.`); return; }

    // cobra moedas se ultrapassar cota do plano
    if (!canAddFree) {
      if (!userId) { toast.error("Faça login para adicionar especialidades extras."); return; }
      setCharging(true);
      try {
        const { spendCoinsForAction } = await import("@/lib/monetization");
        const res: any = await spendCoinsForAction(userId, "extra_specialty", `specialty:${title}`);
        if (!res?.ok) {
          if (res?.reason === "insufficient") {
            toast.error(`Saldo insuficiente. Cada especialidade extra custa ${EXTRA_COST} moedas.`);
          } else {
            toast.error("Não foi possível debitar as moedas.", { description: res?.error });
          }
          setCharging(false);
          return;
        }
        toast.success(`−${EXTRA_COST} moedas · Especialidade extra liberada.`);
      } catch (err: any) {
        toast.error("Erro ao processar cobrança.", { description: err?.message });
        setCharging(false);
        return;
      }
      setCharging(false);
    }

    const item: Specialty = {
      id: uid(),
      title,
      description: draftSubtitle.trim() || undefined,
      featured: false,
    };
    onChange([...list, item]);
    setDraftTitle("");
    setDraftSubtitle("");
  };

  const updateItem = (id: string, patch: Partial<Specialty>) => {
    onChange(list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeItem = (id: string) => {
    onChange(list.filter((s) => s.id !== id));
  };

  const featuredCount = useMemo(() => list.filter((s) => s.featured).length, [list]);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 border-b border-white/5 pb-4">
        <Sparkles className="w-5 h-5 text-primary mt-1" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-black uppercase tracking-tighter">Especialidades</h3>
          <p className="text-[11px] text-white/50 mt-1 break-words">
            Cadastre até {MAX_SPECIALTIES} especialidades. Plano <b>{planLabel(plan)}</b> inclui <b>{quota}</b> grátis.
            {" "}Cada adicional custa <b>{EXTRA_COST} moedas</b>.
          </p>
        </div>
      </div>

      {/* Contador / resumo */}
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
        <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
          {list.length}/{MAX_SPECIALTIES} usadas
        </span>
        <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-300">
          {Math.min(list.length, quota)}/{quota} grátis
        </span>
        {extrasCount > 0 && (
          <span className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 flex items-center gap-1">
            <Coins className="w-3 h-3" /> {extrasCount} extra · {extrasCost} moedas debitadas
          </span>
        )}
        {featuredCount > 0 && (
          <span className="px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-400/30 text-yellow-200">
            ⭐ {featuredCount} em destaque
          </span>
        )}
      </div>

      {/* Formulário de nova especialidade */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Título principal <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value.slice(0, 60))}
            placeholder="Ex.: Instalação de Ar-Condicionado Split"
            className="w-full bg-black/40 border border-white/10 focus:border-primary/50 p-3 rounded-xl outline-none text-sm"
            maxLength={60}
          />
          <div className="text-[9px] text-white/40 text-right">{draftTitle.length}/60</div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Subtítulo / descrição curta
          </label>
          <input
            type="text"
            value={draftSubtitle}
            onChange={(e) => setDraftSubtitle(e.target.value.slice(0, 140))}
            placeholder="Ex.: Atendimento em até 24h com garantia"
            className="w-full bg-black/40 border border-white/10 focus:border-primary/50 p-3 rounded-xl outline-none text-sm"
            maxLength={140}
          />
          <div className="text-[9px] text-white/40 text-right">{draftSubtitle.length}/140</div>
        </div>

        {!canAddFree && !reachedMax && (
          <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-400/30 rounded-xl p-3">
            ⚠️ Você já usou a cota grátis do plano <b>{planLabel(plan)}</b>. Adicionar mais custará <b>{EXTRA_COST} moedas</b>.
          </div>
        )}
        {reachedMax && (
          <div className="text-[11px] text-red-300/90 bg-red-500/10 border border-red-400/30 rounded-xl p-3">
            ⛔ Limite máximo de {MAX_SPECIALTIES} especialidades atingido.
          </div>
        )}

        <button
          type="button"
          onClick={addSpecialty}
          disabled={charging || reachedMax || !draftTitle.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-black uppercase text-xs tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition"
        >
          <Plus className="w-4 h-4" />
          {charging ? "Processando..." : canAddFree ? "Adicionar especialidade" : `Adicionar (−${EXTRA_COST} moedas)`}
        </button>
      </div>

      {/* Lista */}
      {list.length === 0 ? (
        <div className="text-center py-8 text-xs text-white/40 border border-dashed border-white/10 rounded-2xl">
          Nenhuma especialidade cadastrada ainda.
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((s, idx) => (
            <li
              key={s.id}
              className="group bg-[#1A1A1B] border border-white/10 rounded-2xl p-4 hover:border-primary/30 transition"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0 space-y-2">
                  <input
                    type="text"
                    value={s.title}
                    onChange={(e) => updateItem(s.id, { title: e.target.value.slice(0, 60) })}
                    className="w-full bg-transparent border-b border-white/10 focus:border-primary/50 pb-1 outline-none text-sm font-black uppercase tracking-tighter"
                    aria-label={`Título da especialidade ${idx + 1}`}
                  />
                  <input
                    type="text"
                    value={s.description ?? ""}
                    onChange={(e) => updateItem(s.id, { description: e.target.value.slice(0, 140) })}
                    placeholder="Subtítulo (opcional)"
                    className="w-full bg-transparent border-b border-white/5 focus:border-primary/40 pb-1 outline-none text-[12px] text-white/70"
                    aria-label={`Subtítulo da especialidade ${idx + 1}`}
                  />
                  {idx >= quota && (
                    <div className="text-[9px] text-amber-300/80 uppercase tracking-wider flex items-center gap-1">
                      <Coins className="w-3 h-3" /> item extra · {EXTRA_COST} moedas
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateItem(s.id, { featured: !s.featured })}
                    className={`p-2 rounded-lg border transition ${
                      s.featured
                        ? "bg-yellow-500/20 border-yellow-400/40 text-yellow-300"
                        : "bg-white/5 border-white/10 text-white/50 hover:text-white"
                    }`}
                    aria-label={s.featured ? "Remover destaque" : "Marcar como destaque"}
                    title={s.featured ? "Remover destaque" : "Marcar como destaque"}
                  >
                    {s.featured ? <Star className="w-4 h-4" /> : <StarOff className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(s.id)}
                    className="p-2 rounded-lg bg-red-500/10 border border-red-400/20 text-red-300 hover:bg-red-500/20 transition"
                    aria-label="Remover especialidade"
                    title="Remover especialidade"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SpecialtiesEditor;
