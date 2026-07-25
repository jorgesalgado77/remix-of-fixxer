import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, ChevronRight, Handshake, EyeOff, Eye, Store, Users, Wrench } from "lucide-react";
import type { CategoryKey } from "@/lib/category-colors";

const DISMISS_KEY_BASE = "fixxer_b2b_suggestions_dismissed_v1";

type Preset = {
  title: string;
  subtitle: string;
  reshowLabel: string;
  Icon: typeof Handshake;
};

const PRESETS: Record<CategoryKey, Preset> = {
  prestador: {
    title: "Rede de Afiliados B2B",
    subtitle: "Parcerias sugeridas para o seu ramo",
    reshowLabel: "Mostrar Sugestões de Afiliados",
    Icon: Handshake,
  },
  lojista: {
    title: "Rede de Fornecedores & Parceiros",
    subtitle: "Parceiros B2B sugeridos para sua loja",
    reshowLabel: "Mostrar Sugestões de Parceiros",
    Icon: Store,
  },
  fornecedor: {
    title: "Rede de Revendas & Lojistas",
    subtitle: "Lojistas parceiros sugeridos para você",
    reshowLabel: "Mostrar Sugestões de Revendas",
    Icon: Handshake,
  },
  cliente: {
    title: "Serviços Recomendados",
    subtitle: "Prestadores e lojas próximos ao seu perfil",
    reshowLabel: "Mostrar Serviços Recomendados",
    Icon: Wrench,
  },
  admin: {
    title: "Rede de Afiliados B2B",
    subtitle: "Parcerias sugeridas na plataforma",
    reshowLabel: "Mostrar Sugestões",
    Icon: Users,
  },
};

const FALLBACK_SUGGESTIONS: Record<CategoryKey, B2BSuggestion[]> = {
  lojista: [
    { title: "Fornecedores de Peças & Acessórios", hint: "Amplie seu catálogo com parceiros B2B", icon: "🔧" },
    { title: "Prestadores de Instalação", hint: "Ofereça serviço completo aos clientes", icon: "🛠️" },
    { title: "Logística & Entrega", hint: "Parceiros para agilizar suas entregas", icon: "🚚" },
    { title: "Marketing & Divulgação", hint: "Aumente a visibilidade da sua loja", icon: "📣" },
  ],
  prestador: [
    { title: "Lojistas do seu Ramo", hint: "Encontre lojas que precisam do seu serviço", icon: "🏬" },
    { title: "Fornecedores de Insumos", hint: "Materiais e ferramentas com desconto B2B", icon: "📦" },
    { title: "Parcerias entre Prestadores", hint: "Complete serviços com outros profissionais", icon: "🤝" },
    { title: "Clientes Corporativos", hint: "Contratos recorrentes na sua região", icon: "🏢" },
  ],
  fornecedor: [
    { title: "Lojistas Revendedores", hint: "Amplie sua rede de distribuição", icon: "🏬" },
    { title: "Prestadores Parceiros", hint: "Ofereça produtos + serviço", icon: "🛠️" },
    { title: "Distribuidores Regionais", hint: "Cobertura ampliada na sua área", icon: "🚚" },
    { title: "Clientes Corporativos", hint: "Vendas em escala B2B", icon: "🏢" },
  ],
  cliente: [
    { title: "Prestadores Próximos", hint: "Profissionais avaliados na sua região", icon: "🛠️" },
    { title: "Lojas Recomendadas", hint: "Produtos e serviços da sua área", icon: "🏬" },
    { title: "Serviços Emergenciais", hint: "Atendimento rápido quando precisar", icon: "⚡" },
    { title: "Ofertas & Promoções", hint: "Descontos exclusivos para você", icon: "🎁" },
  ],
  admin: [
    { title: "Sugestões da Plataforma", hint: "Parceiros em destaque no FIXXER", icon: "✨" },
  ],
};

function keyFor(cat: CategoryKey) {
  return `${DISMISS_KEY_BASE}_${cat}`;
}

function readDismissed(cat: CategoryKey): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(keyFor(cat)) === "1";
  } catch {
    return false;
  }
}

function writeDismissed(cat: CategoryKey, v: boolean) {
  try {
    if (v) window.localStorage.setItem(keyFor(cat), "1");
    else window.localStorage.removeItem(keyFor(cat));
    window.dispatchEvent(
      new CustomEvent("fixxer:b2b-suggestions-visibility", { detail: { dismissed: v, category: cat } }),
    );
  } catch {
    /* noop */
  }
}

import { supabaseExternal } from "@/lib/supabaseExternal";
import {
  getB2BSuggestions,
  normalizeBranches,
  type B2BCandidate,
  type B2BSuggestion,
} from "@/lib/activity-branches";
import { useCurrentCategory } from "@/lib/user-category";
import { getCategoryTheme } from "@/lib/category-colors";

const DEFAULT_RADIUS_KM = 25;

function readRadius(): number {
  if (typeof window === "undefined") return DEFAULT_RADIUS_KM;
  const v = Number(window.localStorage.getItem("fixxer_radius_km"));
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_RADIUS_KM;
}

/**
 * Card compacto que sugere parcerias B2B cruzadas com base nos ramos
 * salvos no perfil do usuário (incluindo ramos customizados). Filtra
 * candidatos reais pelo raio de atuação e reordena por recência.
 */
function B2BSuggestionsCardInner() {
  const category = useCurrentCategory();
  const preset = PRESETS[category] ?? PRESETS.prestador;
  const [suggestions, setSuggestions] = useState<B2BSuggestion[]>([]);
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed(category));
  const theme = getCategoryTheme(category);
  const branchesRef = useRef<string[]>([]);
  const userLocRef = useRef<{ lat: number; lng: number } | null>(null);
  const candidatesRef = useRef<B2BCandidate[]>([]);

  const recompute = useCallback(() => {
    const radiusKm = readRadius();
    const list = getB2BSuggestions(branchesRef.current, {
      radiusKm,
      userLocation: userLocRef.current,
      candidates: candidatesRef.current,
    }).slice(0, 4);
    setSuggestions(list);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: auth } = await supabaseExternal.auth.getUser();
        const uid = auth?.user?.id;
        if (!uid) return;
        const { data: p } = await supabaseExternal
          .from("profiles")
          .select("business_category, custom_branch, lat, lng, service_radius_km")
          .eq("id", uid)
          .maybeSingle();
        if (cancelled) return;
        branchesRef.current = normalizeBranches(p ?? undefined);
        if (p?.lat != null && p?.lng != null) {
          userLocRef.current = { lat: Number(p.lat), lng: Number(p.lng) };
        }
        // Candidatos reais: profiles com lat/lng e business_category preenchidos
        try {
          const { data: cands } = await supabaseExternal
            .from("profiles")
            .select("id, company_name, full_name, business_category, lat, lng, updated_at")
            .not("business_category", "is", null)
            .not("lat", "is", null)
            .not("lng", "is", null)
            .neq("id", uid)
            .limit(80);
          if (!cancelled && Array.isArray(cands)) {
            const flat: B2BCandidate[] = [];
            for (const row of cands as any[]) {
              const branches = String(row.business_category ?? "")
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean);
              for (const br of branches) {
                flat.push({
                  title: (row.company_name || row.full_name || "Parceiro FIXXER") + " — " + br,
                  targetBranch: br,
                  lat: row.lat,
                  lng: row.lng,
                  updatedAt: row.updated_at,
                });
              }
            }
            candidatesRef.current = flat;
          }
        } catch {
          /* sem candidatos reais — usa fallback estático */
        }
        if (!cancelled) recompute();
      } catch {
        /* silencioso — sem sugestões */
      }
    })();

    const onRadiusChange = () => recompute();
    if (typeof window !== "undefined") {
      window.addEventListener("fixxer:radius-change", onRadiusChange);
    }
    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("fixxer:radius-change", onRadiusChange);
      }
    };
  }, [recompute]);

  // Sincroniza estado quando outra instância/aba altera a visibilidade.
  useEffect(() => {
    const onVis = (e: Event) => {
      const d = (e as CustomEvent).detail as { dismissed?: boolean } | undefined;
      if (typeof d?.dismissed === "boolean") setDismissed(d.dismissed);
    };
    window.addEventListener("fixxer:b2b-suggestions-visibility", onVis as EventListener);
    return () =>
      window.removeEventListener("fixxer:b2b-suggestions-visibility", onVis as EventListener);
  }, []);

  if (suggestions.length === 0) return null;

  // Estado OCULTO: mostra chip discreto para reexibir.
  if (dismissed) {
    const PresetIcon = preset.Icon;
    return (
      <button
        type="button"
        onClick={() => {
          setDismissed(false);
          writeDismissed(category, false);
        }}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors"
        aria-label={preset.reshowLabel}
        title={preset.reshowLabel}
      >
        <Eye className="w-3.5 h-3.5" style={{ color: theme.hex }} />
        {preset.reshowLabel}
      </button>
    );
  }

  const PresetIcon = preset.Icon;

  return (
    <div
      className="rounded-2xl p-3 space-y-2 border"
      style={{
        borderColor: `${theme.hex}33`,
        background: `linear-gradient(135deg, ${theme.hex}0F, transparent 70%)`,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${theme.hex}22`, color: theme.hex }}
          >
            <PresetIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-tight truncate">
              {preset.title}
            </p>
            <p className="text-[9px] text-white/50 truncate">
              {preset.subtitle}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setDismissed(true);
            writeDismissed(category, true);
          }}
          className="flex items-center gap-1 text-[9px] font-black uppercase text-white/40 hover:text-white/70 shrink-0"
          aria-label="Ocultar sugestões (pode reexibir depois)"
          title="Ocultar — você pode reexibir a qualquer momento"
        >
          <EyeOff className="w-3 h-3" />
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
                <Sparkles className="w-2.5 h-2.5" style={{ color: theme.hex }} />
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

export const B2BSuggestionsCard = memo(B2BSuggestionsCardInner);


