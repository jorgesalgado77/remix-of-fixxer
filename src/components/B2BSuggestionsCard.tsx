import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  if (typeof window === "undefined") return true;
  try {
    // Padrão: RECOLHIDO. Só considera expandido quando o usuário
    // clicou explicitamente em "Mostrar Sugestões" (grava "0").
    const raw = window.localStorage.getItem(keyFor(cat));
    if (raw === null) return true;
    return raw !== "0";
  } catch {
    return true;
  }
}

function writeDismissed(cat: CategoryKey, v: boolean) {
  try {
    // "1" = oculto, "0" = usuário expandiu explicitamente (persiste entre sessões).
    window.localStorage.setItem(keyFor(cat), v ? "1" : "0");
    window.dispatchEvent(
      new CustomEvent("fixxer:b2b-suggestions-visibility", { detail: { dismissed: v, category: cat } }),
    );
  } catch {
    /* noop */
  }
}

import { useNavigate } from "@tanstack/react-router";
import { supabaseExternal } from "@/lib/supabaseExternal";
import {
  ACTIVITY_MATRIX,
  getB2BSuggestions,
  normalizeBranches,
  type B2BCandidate,
  type B2BSuggestion,
} from "@/lib/activity-branches";
import { useCurrentCategory } from "@/lib/user-category";
import { getCategoryTheme } from "@/lib/category-colors";
import {
  scoreRelevanceDetailed,
  useUserBranchContext,
  relevanceRank,
  type BranchContext,
  type RelevanceResult,
} from "@/lib/branch-relevance";
import { RelevanceBadge } from "@/components/RelevanceBadge";

const DEFAULT_RADIUS_KM = 25;

function readRadius(): number {
  if (typeof window === "undefined") return DEFAULT_RADIUS_KM;
  const v = Number(window.localStorage.getItem("fixxer_radius_km"));
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_RADIUS_KM;
}

/**
 * Sugestões derivadas do próprio ramo do usuário: ramos e subcategorias
 * irmãs dentro das macro-categorias em que ele atua. Usado apenas quando
 * não existem parceiros reais suficientes no raio.
 */
function branchFallback(ctx: BranchContext): B2BSuggestion[] {
  if (ctx.macroIds.size === 0) return [];
  const out: B2BSuggestion[] = [];
  for (const macro of ACTIVITY_MATRIX) {
    if (!ctx.macroIds.has(macro.id)) continue;
    for (const b of macro.branches) {
      if (b.label.startsWith("📝")) continue;
      const key = b.label.trim().toLowerCase();
      if (ctx.branchKeys.has(key)) continue;
      out.push({
        icon: macro.icon,
        title: b.label,
        hint: `Buscar parceiros em ${macro.label.split(",")[0]}`,
        targetBranch: b.label,
      });
    }
  }
  return out;
}


/**
 * Card compacto que sugere parcerias B2B cruzadas com base nos ramos
 * salvos no perfil do usuário (incluindo ramos customizados). Filtra
 * candidatos reais pelo raio de atuação e reordena por recência.
 */
function B2BSuggestionsCardInner() {
  const navigate = useNavigate();
  const category = useCurrentCategory();

  const preset = PRESETS[category] ?? PRESETS.prestador;
  const branchCtx = useUserBranchContext();
  const [suggestions, setSuggestions] = useState<B2BSuggestion[]>([]);
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed(category));
  const theme = getCategoryTheme(category);
  const branchesRef = useRef<string[]>([]);
  const userLocRef = useRef<{ lat: number; lng: number } | null>(null);
  const candidatesRef = useRef<B2BCandidate[]>([]);

  const recompute = useCallback(() => {
    const radiusKm = readRadius();
    const list = getB2BSuggestions(branchesRef.current, {
      radiusKm: null, // Remove filtro de raio rigoroso para garantir que parceiros reais apareçam mesmo distantes
      userLocation: userLocRef.current,
      candidates: candidatesRef.current,
    }).slice(0, 24);
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
        // Candidatos reais: perfis com ramo preenchido (geo é opcional).
        try {
          const { data: cands } = await supabaseExternal
            .from("profiles")
            .select("id, display_name, company_name, full_name, business_category, lat, lng, updated_at")
            .not("business_category", "is", null)
            .neq("id", uid)
            .order("updated_at", { ascending: false })
            .limit(500); // Aumentado o limite para varrer mais usuários reais
          if (!cancelled && Array.isArray(cands)) {
            const flat: B2BCandidate[] = [];
            for (const row of cands as any[]) {
              const branches = String(row.business_category ?? "")
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean);
              const name =
                row.display_name || row.company_name || row.full_name || "Parceiro FIXXER";
              for (const br of branches) {
                flat.push({
                  title: `${name} — ${br}`,
                  targetBranch: br,
                  lat: row.lat,
                  lng: row.lng,
                  updatedAt: row.updated_at,
                  userId: row.id,
                });
              }
            }
            candidatesRef.current = flat;
          }
        } catch {
          /* sem candidatos reais — usa fallback do próprio ramo */
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

  // Prioridade: parceiros REAIS relacionados ao ramo do usuário; depois
  // ramos/subcategorias irmãs da(s) macro(s) dele; por último, presets fixos.
  const displaySuggestions = useMemo(() => {
    const score = (s: B2BSuggestion) => ({
      s,
      rel: s.targetBranch
        ? scoreRelevanceDetailed([s.targetBranch], branchCtx)
        : ({ level: "none", matchedBranch: null, reason: null } as RelevanceResult),
    });

    const real = suggestions
      .filter((s) => !!s.userId)
      .map(score)
      .sort((a, b) => relevanceRank(a.rel.level) - relevanceRank(b.rel.level));

    const out = [...real];
    const seen = new Set(out.map((x) => x.s.title));

    if (out.length < 4) {
      for (const s of [
        ...branchFallback(branchCtx),
        ...suggestions.filter((x) => !x.userId),
        ...(FALLBACK_SUGGESTIONS[category] ?? FALLBACK_SUGGESTIONS.prestador),
      ]) {
        if (out.length >= 4) break;
        if (seen.has(s.title)) continue;
        seen.add(s.title);
        out.push(score(s));
      }
    }
    return out.slice(0, 4);
  }, [suggestions, branchCtx, category]);

  const openSuggestion = useCallback(
    (s: B2BSuggestion) => {
      if (s.userId) {
        navigate({ to: "/perfil/$userId", params: { userId: s.userId } as any } as any);
        return;
      }
      const term = (s.targetBranch || s.title).trim();
      if (!term) return;
      const feed =
        category === "lojista"
          ? "/feed/lojista"
          : category === "fornecedor"
          ? "/feed/parceiro"
          : category === "cliente"
          ? "/feed/cliente"
          : "/feed/prestador";
      navigate({ to: feed as any });
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("fixxer:universal-search", { detail: { query: term } }),
        );
      }, 120);
    },
    [navigate, category],
  );


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
        {displaySuggestions.map(({ s, rel }) => (
          <button
            key={s.title}
            type="button"
            onClick={() => openSuggestion(s)}
            title={s.userId ? "Abrir perfil do parceiro" : `Buscar: ${s.targetBranch || s.title}`}
            className="w-full text-left bg-white/[0.03] hover:bg-white/[0.06] active:bg-white/[0.08] rounded-xl px-2.5 py-2 flex items-center gap-2 transition-colors"
          >

            <span className="text-base shrink-0">{s.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] font-bold text-white truncate flex-1">{s.title}</p>
                <RelevanceBadge result={rel} compact />
              </div>
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


