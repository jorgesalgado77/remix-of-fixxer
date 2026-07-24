import { useEffect, useState } from "react";
import { Sparkles, ChevronRight, Handshake } from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { getB2BSuggestions, type B2BSuggestion } from "@/lib/activity-branches";
import { useCurrentCategory } from "@/hooks/use-current-category";
import { getCategoryTheme } from "@/lib/category-colors";

/**
 * Card compacto que sugere parcerias B2B cruzadas com base nos ramos
 * salvos no perfil do usuário logado. Puxa a `business_category` do
 * profile e chama `getB2BSuggestions`. Silencioso quando não há match.
 */
export function B2BSuggestionsCard() {
  const [suggestions, setSuggestions] = useState<B2BSuggestion[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const category = useCurrentCategory();
  const theme = getCategoryTheme(category);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: auth } = await supabaseExternal.auth.getUser();
        const uid = auth?.user?.id;
        if (!uid) return;
        const { data: p } = await supabaseExternal
          .from("profiles")
          .select("business_category, custom_branch")
          .eq("id", uid)
          .maybeSingle();
        const branches = String(p?.business_category ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const list = getB2BSuggestions(branches).slice(0, 4);
        if (!cancelled) setSuggestions(list);
      } catch {
        // silencioso — sem sugestões
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (dismissed || suggestions.length === 0) return null;

  return (
    <div
      className="rounded-2xl p-3 space-y-2 border"
      style={{
        borderColor: `${theme.primary}33`,
        background: `linear-gradient(135deg, ${theme.primary}0F, transparent 70%)`,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${theme.primary}22`, color: theme.primary }}
          >
            <Handshake className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-tight truncate">
              Rede de Afiliados B2B
            </p>
            <p className="text-[9px] text-white/50 truncate">
              Parcerias sugeridas para o seu ramo
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-[9px] font-black uppercase text-white/40 hover:text-white/70 shrink-0"
          aria-label="Fechar sugestões"
        >
          Ocultar
        </button>
      </div>

      <div className="grid gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s.title}
            className="w-full text-left bg-white/[0.03] hover:bg-white/[0.06] active:bg-white/[0.08] rounded-xl px-2.5 py-2 flex items-center gap-2 transition-colors"
          >
            <span className="text-base shrink-0">{s.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-white truncate">{s.title}</p>
              <p className="text-[9px] text-white/50 truncate flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" style={{ color: theme.primary }} />
                {s.hint}
              </p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-white/30 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
