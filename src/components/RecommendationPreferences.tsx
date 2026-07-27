import { useEffect, useMemo, useState } from "react";
import { Sparkles, Loader2, Check } from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import {
  ACTIVITY_MATRIX,
  findMacroForBranch,
  normalizeBranches,
} from "@/lib/activity-branches";
import { toast } from "sonner";

/**
 * Seção "Recomendações inteligentes" — vive na página /profile.
 *
 * Permite ao usuário:
 *  - Ativar/desativar o filtro global "🎯 Do meu ramo" (afeta carrosséis,
 *    sugestões B2B e feeds).
 *  - Escolher até 6 subcategorias prioritárias entre as opções da(s)
 *    macro(s) do seu ramo principal — dá peso extra ao recomendador.
 *
 * Depende das colunas `branch_filter_enabled` e `preferred_subcategories`
 * (o script SQL foi entregue no chat). Se o UPDATE falhar por coluna
 * inexistente, o componente avisa o usuário.
 */
const MAX_SUBS = 6;

export function RecommendationPreferences() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [macroLabels, setMacroLabels] = useState<string[]>([]);
  const [options, setOptions] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: auth } = await supabaseExternal.auth.getUser();
        const id = auth?.user?.id ?? null;
        if (!id) { if (!cancelled) setLoading(false); return; }
        setUid(id);

        // Best-effort: seleciona colunas novas; se der erro, cai no schema antigo.
        let bc: string | null = null;
        let cb: string | null = null;
        let subs: string[] = [];
        let en = true;
        try {
          const { data, error } = await supabaseExternal
            .from("profiles")
            .select("business_category, custom_branch, preferred_subcategories, branch_filter_enabled")
            .eq("id", id)
            .maybeSingle();
          if (error) throw error;
          bc = (data as any)?.business_category ?? null;
          cb = (data as any)?.custom_branch ?? null;
          subs = ((data as any)?.preferred_subcategories as string[] | null) ?? [];
          if ((data as any)?.branch_filter_enabled === false) en = false;
        } catch {
          const { data } = await supabaseExternal
            .from("profiles")
            .select("business_category, custom_branch")
            .eq("id", id)
            .maybeSingle();
          bc = (data as any)?.business_category ?? null;
          cb = (data as any)?.custom_branch ?? null;
        }

        if (cancelled) return;

        // Descobre macros do usuário e monta a lista de subcategorias disponíveis.
        const branches = normalizeBranches({ business_category: bc, custom_branch: cb });
        const macroIds = new Set<string>();
        const labels: string[] = [];
        for (const b of branches) {
          const m = findMacroForBranch(b);
          if (m && !macroIds.has(m.id)) {
            macroIds.add(m.id);
            labels.push(m.label);
          }
        }
        const opts: string[] = [];
        for (const m of ACTIVITY_MATRIX) {
          if (!macroIds.has(m.id)) continue;
          for (const br of m.branches) {
            for (const sub of br.subcategories ?? []) {
              if (!opts.includes(sub)) opts.push(sub);
            }
          }
        }
        setMacroLabels(labels);
        setOptions(opts);
        setSelected(new Set(subs));
        setEnabled(en);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const toggle = (sub: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sub)) next.delete(sub);
      else {
        if (next.size >= MAX_SUBS) {
          toast.error(`Máximo de ${MAX_SUBS} subcategorias.`);
          return prev;
        }
        next.add(sub);
      }
      return next;
    });
  };

  const persist = async (patch: { enabled?: boolean; subs?: string[] }) => {
    if (!uid) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      if (patch.enabled !== undefined) payload.branch_filter_enabled = patch.enabled;
      if (patch.subs !== undefined) payload.preferred_subcategories = patch.subs;
      const { error } = await supabaseExternal
        .from("profiles")
        .update(payload)
        .eq("id", uid);
      if (error) throw error;
      toast.success("Preferências salvas.");
      window.dispatchEvent(new CustomEvent("fixxer:profile-updated"));
    } catch (err: any) {
      const msg = String(err?.message ?? err ?? "");
      if (/column .* does not exist/i.test(msg) || /preferred_subcategories/i.test(msg)) {
        toast.error("Rode o script SQL fornecido no chat para habilitar preferências.");
      } else {
        toast.error("Não foi possível salvar. Tente novamente.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (v: boolean) => {
    setEnabled(v);
    await persist({ enabled: v });
  };

  const handleSaveSubs = async () => {
    await persist({ subs: Array.from(selected) });
  };

  const macroText = useMemo(() => macroLabels.join(" · "), [macroLabels]);

  if (loading) {
    return (
      <div className="pt-8 space-y-4">
        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
          <Sparkles className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-black uppercase tracking-tighter">Recomendações inteligentes</h3>
        </div>
        <div className="flex items-center gap-2 text-white/50 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando preferências...
        </div>
      </div>
    );
  }

  return (
    <div className="pt-8 space-y-6">
      <div className="flex items-center gap-3 border-b border-white/5 pb-4">
        <Sparkles className="w-6 h-6 text-primary" />
        <h3 className="text-xl font-black uppercase tracking-tighter">Recomendações inteligentes</h3>
      </div>

      {/* Toggle mestre */}
      <div className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-white/10 bg-white/5">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-black text-white uppercase tracking-tight">
            Priorizar conteúdo do meu ramo
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">
            Filtra carrosséis, sugestões B2B e feeds mostrando primeiro o que combina com seu perfil.
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => handleToggleEnabled(!enabled)}
          disabled={saving}
          className={`relative w-12 h-7 rounded-full transition-colors ${
            enabled ? "bg-[#00FF87]" : "bg-white/10"
          } disabled:opacity-50 shrink-0`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Subcategorias */}
      {options.length === 0 ? (
        <div className="p-4 rounded-2xl border border-dashed border-white/10 text-[11px] text-muted-foreground">
          Preencha seu <b className="text-white/70">Ramo Principal</b> mais acima para desbloquear
          preferências de subcategoria.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-black uppercase tracking-widest text-white/80">
                Subcategorias prioritárias
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {macroText && <>Baseado em: <span className="text-white/70">{macroText}</span> · </>}
                {selected.size}/{MAX_SUBS} escolhidas
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveSubs}
              disabled={saving}
              className="text-[10px] font-black uppercase tracking-widest bg-[#00FF87] text-black rounded-full px-4 py-2 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {options.map((sub) => {
              const active = selected.has(sub);
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => toggle(sub)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                    active
                      ? "bg-[#00FF87] text-black border-[#00FF87]"
                      : "bg-white/5 text-white/80 border-white/10 hover:border-white/30"
                  }`}
                >
                  {active && <Check className="w-3 h-3" />}
                  {sub}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default RecommendationPreferences;
