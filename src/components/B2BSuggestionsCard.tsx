import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Handshake, EyeOff, Eye, Store, Users, Wrench, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { 
  getB2BSuggestions, 
  normalizeBranches, 
  haversineKm,
  type B2BCandidate, 
  type B2BSuggestion,
  B2B_SUGGESTIONS
} from "@/lib/activity-branches";
import { useCurrentCategory } from "@/lib/user-category";
import { getCategoryTheme, type CategoryKey } from "@/lib/category-colors";
import { 
  scoreRelevanceDetailed, 
  useUserBranchContext, 
  relevanceRank, 
  type RelevanceResult 
} from "@/lib/branch-relevance";
import { RelevanceBadge } from "@/components/RelevanceBadge";
import { Button } from "@/components/ui/button";

const DISMISS_KEY_BASE = "fixxer_b2b_suggestions_dismissed_v1";

type Preset = {
  title: string;
  subtitle: string;
  reshowLabel: string;
  Icon: typeof Handshake;
};

const PRESETS: Record<CategoryKey, Preset> = {
  prestador: {
    title: "LOJISTAS E FORNECEDORES RECENTES",
    subtitle: "Conecte-se com lojistas e fornecedores B2B na sua região",
    reshowLabel: "Mostrar Sugestões de Afiliados",
    Icon: Handshake,
  },
  lojista: {
    title: "PARCEIROS & PRESTADORES RECENTES",
    subtitle: "Conecte-se com parceiros B2B e prestadores na sua região",
    reshowLabel: "Mostrar Sugestões de Parceiros",
    Icon: Store,
  },
  fornecedor: {
    title: "REDES DE REVENDA & LOJISTAS",
    subtitle: "Lojistas parceiros sugeridos para o seu ramo",
    reshowLabel: "Mostrar Sugestões de Revendas",
    Icon: Handshake,
  },
  cliente: {
    title: "SERVIÇOS RECOMENDADOS",
    subtitle: "Prestadores e lojas próximos ao seu perfil",
    reshowLabel: "Mostrar Serviços Recomendados",
    Icon: Wrench,
  },
  admin: {
    title: "REDE GLOBAL FIXXER",
    subtitle: "Parcerias sugeridas na plataforma",
    reshowLabel: "Mostrar Sugestões",
    Icon: Users,
  },
};

function keyFor(cat: CategoryKey) {
  return `${DISMISS_KEY_BASE}_${cat}`;
}

function readDismissed(cat: CategoryKey): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(keyFor(cat));
    if (raw === null) return false; // Default para expandido agora
    return raw !== "0";
  } catch {
    return true;
  }
}

function writeDismissed(cat: CategoryKey, v: boolean) {
  try {
    window.localStorage.setItem(keyFor(cat), v ? "1" : "0");
  } catch { /* noop */ }
}

function B2BSuggestionsCardInner() {
  const navigate = useNavigate();
  const category = useCurrentCategory();
  const branchCtx = useUserBranchContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [suggestions, setSuggestions] = useState<B2BSuggestion[]>([]);
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed(category));
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const theme = getCategoryTheme(category);
  const preset = PRESETS[category] || PRESETS.prestador;

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", handleScroll);
      handleScroll();
      // Observer para mudanças de conteúdo (carregamento das fotos)
      const observer = new ResizeObserver(handleScroll);
      observer.observe(el);
      return () => {
        el.removeEventListener("scroll", handleScroll);
        observer.disconnect();
      };
    }
  }, [suggestions, handleScroll]);

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      const amount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
    }
  };

  const loadRealData = useCallback(async () => {
    const cacheKey = `fixxer_b2b_suggestions_cache_${category}`;
    const CACHE_TTL = 10 * 60 * 1000;

    // Hidratação imediata pelo cache (evita seção vazia / piscando ao navegar)
    let hadCache = false;
    try {
      const raw = window.localStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { items: B2BSuggestion[]; ts: number };
        if (parsed?.items?.length) {
          setSuggestions(parsed.items);
          setIsLoading(false);
          hadCache = true;
          if (Date.now() - parsed.ts < CACHE_TTL) return;
        }
      }
    } catch { /* noop */ }

    try {
      if (!hadCache) setIsLoading(true);

      const { data: auth } = await supabaseExternal.auth.getUser();
      const uid = auth?.user?.id ?? null;

      let userLoc: { lat: number; lng: number } | null = null;
      if (uid) {
        const { data: userProfile } = await supabaseExternal
          .from("profiles")
          .select("lat, lng")
          .eq("id", uid)
          .maybeSingle();
        if (userProfile?.lat != null) userLoc = { lat: Number(userProfile.lat), lng: Number(userProfile.lng) };
      }

      // Perfis públicos reais (view segura). Sem exigir business_category,
      // pois muitos perfis usam custom_branch / preferred_service.
      const { data: cands, error } = await supabaseExternal
        .from("profiles_public")
        .select(
          "id, display_name, company_name, full_name, business_category, activity_branch, custom_branch, preferred_service, avatar_url, logo_url, lat, lng, city, state, role, user_type, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Alvos por categoria do usuário logado.
      const targetsByCategory: Record<string, string[]> = {
        prestador: ["lojist", "fornec", "parceiro", "b2b"],
        lojista: ["prestador", "fornec", "parceiro", "b2b"],
        fornecedor: ["lojist", "prestador"],
        cliente: ["prestador", "lojist"],
        admin: [],
      };
      const targets = targetsByCategory[category] ?? [];

      const list: B2BSuggestion[] = ((cands as any[]) ?? [])
        .filter((c) => {
          if (uid && String(c.id) === String(uid)) return false;
          const role = `${c.role || ""} ${c.user_type || ""}`.toLowerCase();
          if (role.includes("admin")) return false;
          if (!targets.length) return true;
          return targets.some((t) => role.includes(t));
        })
        .map((c: any) => {
          const branches = normalizeBranches(c);
          const name = c.display_name || c.company_name || c.full_name || "Membro FIXXER";
          const dist = userLoc && c.lat != null ? haversineKm(userLoc, { lat: Number(c.lat), lng: Number(c.lng) }) : null;

          return {
            userId: c.id,
            title: name,
            icon: "👤",
            avatarUrl: c.avatar_url || c.logo_url,
            hint: `${branches[0] || c.activity_branch || c.preferred_service || "Profissional"} • ${c.city || "Região"}`,
            targetBranch: branches[0],
            _relevance: scoreRelevanceDetailed(branches, branchCtx),
            _dist: dist,
          } as any;
        });

      const sorted = list.sort((a: any, b: any) => {
        const rankA = relevanceRank(a._relevance.level);
        const rankB = relevanceRank(b._relevance.level);
        if (rankA !== rankB) return rankA - rankB;
        return (a._dist ?? 9999) - (b._dist ?? 9999);
      });

      const finalList = sorted.slice(0, 25);
      if (finalList.length > 0 || !hadCache) setSuggestions(finalList);
      if (finalList.length > 0) {
        try {
          window.localStorage.setItem(cacheKey, JSON.stringify({ items: finalList, ts: Date.now() }));
        } catch { /* noop */ }
      }
    } catch (err) {
      console.error("Erro ao carregar sugestões B2B reais:", err);
    } finally {
      setIsLoading(false);
    }
  }, [branchCtx, category]);

  const didLoad = useRef(false);
  useEffect(() => {
    // Evita recarregamentos desnecessários a cada re-render do contexto de ramos.
    const key = `${category}`;
    if (didLoad.current === (key as any)) return;
    (didLoad as any).current = key;
    loadRealData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);


  if (dismissed) {
    return (
      <button
        onClick={() => { setDismissed(false); writeDismissed(category, false); }}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors"
      >
        <Eye className="w-3.5 h-3.5" style={{ color: theme.hex }} />
        {preset.reshowLabel}
      </button>
    );
  }

  return (
    <div
      className="rounded-2xl p-4 space-y-4 border relative group/container"
      style={{
        borderColor: `${theme.hex}33`,
        background: `linear-gradient(135deg, ${theme.hex}0F, transparent 70%)`,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
            style={{ backgroundColor: `${theme.hex}22`, color: theme.hex }}
          >
            <preset.Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[12px] font-black uppercase tracking-tight text-white/90">
              {preset.title}
            </h3>
            <p className="text-[9px] text-white/40 uppercase font-bold tracking-wider">
              {preset.subtitle}
            </p>
          </div>
        </div>
        <button
          onClick={() => { setDismissed(true); writeDismissed(category, true); }}
          className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors"
          title="Ocultar esta seção"
        >
          <EyeOff className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="relative">
        {/* Navegação Horizontal */}
        {canScrollLeft && (
          <button 
            onClick={() => scroll("left")}
            className="absolute left-[-12px] top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/80 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-primary/50 transition-all shadow-xl backdrop-blur-md"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        
        {canScrollRight && (
          <button 
            onClick={() => scroll("right")}
            className="absolute right-[-12px] top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/80 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-primary/50 transition-all shadow-xl backdrop-blur-md"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        <div 
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth scrollbar-hide"
        >
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-[260px] flex-shrink-0 animate-pulse bg-white/5 border border-white/5 rounded-2xl h-[220px]" />
            ))
          ) : suggestions.length > 0 ? (
            suggestions.map((s: any) => (
              <div 
                key={s.userId}
                onClick={() => navigate({ to: "/perfil/$userId", params: { userId: s.userId } } as any)}
                className="w-[260px] flex-shrink-0 snap-start bg-[#141415] border border-white/5 rounded-2xl overflow-hidden hover:border-primary/30 hover:bg-white/[0.04] transition-all cursor-pointer group/card shadow-xl"
              >
                <div className="aspect-[16/9] relative overflow-hidden bg-black/40">
                  {s.avatarUrl ? (
                    <img src={s.avatarUrl} alt={s.title} className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/10">
                      <Users className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <RelevanceBadge result={s._relevance} compact />
                  </div>
                  {s._dist !== null && (
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black text-white/80 uppercase">
                      {s._dist < 1 ? "< 1 km" : `${Math.round(s._dist)} km`}
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <h4 className="text-[11px] font-black text-white uppercase truncate mb-0.5">
                    {s.title}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[9px] text-white/40 font-bold uppercase truncate">
                    <MapPin className="w-2.5 h-2.5 text-primary" />
                    {s.hint}
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-primary/10 text-[8px] font-black text-primary uppercase tracking-wider">
                      Disponível
                    </span>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[9px] font-black text-white/40 group-hover/card:text-primary transition-colors">
                      Ver Perfil
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="w-full py-10 flex flex-col items-center justify-center text-center opacity-30">
              <Sparkles className="w-8 h-8 mb-2" />
              <p className="text-[10px] font-black uppercase italic tracking-widest">Buscando novos parceiros reais...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const B2BSuggestionsCard = memo(B2BSuggestionsCardInner);
