import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Star, MapPin, UserCircle2, ChevronLeft, ChevronRight, Navigation, Puzzle, ShieldCheck } from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { primePublicProfileCategory } from "@/lib/public-profile-category";
import { useUserBranchContext, scoreRelevance } from "@/lib/branch-relevance";
import { geocodeAddress } from "@/lib/geocoding.functions";
import { getHaversineDistance } from "@/lib/haversine-helper";
import { CarouselErrorFallback, CarouselLoadingFallback } from "./CarouselFallback";
import { dataMonitor } from "@/lib/monitoring";


type Row = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  role: string | null;
  business_category: string | null;
  custom_branch: string | null;
  preferred_service: string | null;
  city: string | null;
  state: string | null;
  rating: number | null;
  created_at: string | null;
  lat: number | null;
  lng: number | null;
  user_type?: string | null;
};

type Kind = "lojista" | "fornecedor";
type Card = Row & { _kind: Kind; _branch: string | null; _distance?: number };

// A lógica de cálculo Haversine foi movida para @/lib/haversine-helper.ts para uso global.

/**
 * Colunas garantidas na view `profiles_public` do Supabase externo.
 * NUNCA adicionar colunas não existentes aqui (ex.: karma_score / is_verified),
 * pois um único 42703 derruba a seção inteira.
 */
const SAFE_COLS =
  "id, full_name, display_name, company_name, avatar_url, logo_url, banner_url, role, user_type, business_category, activity_branch, custom_branch, preferred_service, city, state, neighborhood, lat, lng, rating, created_at";

const CACHE_KEY = "fixxer_recent_stores_v2";
const CACHE_TTL = 10 * 60 * 1000; // 10 min (stale-while-revalidate)
const PAGE_SIZE = 20;

type CachedPayload = { items: Card[]; ts: number };

function readStoresCache(): CachedPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPayload;
    if (!parsed?.items?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoresCache(items: Card[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ items, ts: Date.now() }));
  } catch { /* noop */ }
}

/** Classifica a role em lojista/fornecedor. Retorna null para perfis fora da seção. */
function classifyStoreKind(role: string | null | undefined, userType?: string | null): Kind | null {
  const r = `${role || ""} ${userType || ""}`.toLowerCase();
  if (r.includes("admin")) return null;
  if (r.includes("fornec") || r.includes("parceiro") || r.includes("b2b") || r.includes("suppl")) return "fornecedor";
  if (r.includes("lojist") || r.includes("loja") || r.includes("store")) return "lojista";
  return null;
}

function RecentStoresCarouselInner() {
  const navigate = useNavigate();
  const cachedInitial = useMemo(() => readStoresCache(), []);
  const [items, setItems] = useState<Card[]>(() => cachedInitial?.items ?? []);
  const [loading, setLoading] = useState(!cachedInitial);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persistência do estado dos filtros
  const [kindFilter, setKindFilter] = useState<"all" | Kind | "branch">(() => {
    if (typeof window === "undefined") return "all";
    const v = window.localStorage.getItem("fixxer_carousel_filter");
    return v === "lojista" || v === "fornecedor" || v === "branch" ? v : "all";
  });

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [radiusFilter, setRadiusFilter] = useState<number>(0); // 0 = Sem limite
  const [scrollProgress, setScrollProgress] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return Number(localStorage.getItem('fixxer_carousel_scroll')) || 0;
  });

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const pageRef = useRef(0);
  const [hasMore, setHasMore] = useState(true);
  const inFlight = useRef(false);
  const userBranchCtx = useUserBranchContext();

  // Monitorar progresso do scroll e persistir
  const handleScroll = () => {
    if (!scrollerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollerRef.current;
    const totalScrollable = scrollWidth - clientWidth;

    if (totalScrollable > 0) {
      const progress = (scrollLeft / totalScrollable) * 100;
      setScrollProgress(progress);
      localStorage.setItem('fixxer_carousel_scroll', progress.toString());

      // Infinite Scroll: se chegar perto do fim, carrega mais
      if (totalScrollable - scrollLeft < 500 && !loadingMore && hasMore && !loading) {
        fetchList(true);
      }
    } else {
      setScrollProgress(0);
    }
  };

  // Restaurar posição do scroll após carregar itens
  useEffect(() => {
    if (items.length > 0 && scrollerRef.current && scrollProgress > 0) {
      const { scrollWidth, clientWidth } = scrollerRef.current;
      const totalScrollable = scrollWidth - clientWidth;
      if (totalScrollable > 0) {
        scrollerRef.current.scrollLeft = (scrollProgress / 100) * totalScrollable;
      }
    }
  }, [items.length]); // Só executa quando a lista popula pela primeira vez ou cresce

  // Persistir filtro quando mudar
  useEffect(() => {
    localStorage.setItem('fixxer_carousel_filter', kindFilter);
  }, [kindFilter]);

  // Carrega coordenadas em cache somente após a hidratação (evita mismatch de SSR)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fixxer_user_coords_v1');
      if (saved) setUserCoords(JSON.parse(saved));
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const { data: { session } } = await supabaseExternal.auth.getSession();
        if (session?.user) {
          const userId = session.user.id;
          setCurrentUserId(userId);

          // Busca RIGOROSA e COMPLETA dos dados de endereço.
          const { data: profile } = await supabaseExternal
            .from("profiles")
            .select("id, lat, lng, city, state, street, neighborhood, number, cep")
            .eq("id", userId)
            .maybeSingle();

          if (profile) {
            let currentLat = (profile.lat !== null && profile.lat !== undefined) ? Number(profile.lat) : 0;
            let currentLng = (profile.lng !== null && profile.lng !== undefined) ? Number(profile.lng) : 0;

            // Rotina de Geocodificação Automática com Cache e Validação
            const needsGeo = (!currentLat || !currentLng || (Math.abs(currentLat) < 0.000001)) && (profile.cep || profile.city);

            if (needsGeo) {
              const geoCacheKey = `fixxer_geo_cache_${userId}_${profile.cep || profile.city}`;
              const cached = localStorage.getItem(geoCacheKey);

              if (cached) {
                const parsed = JSON.parse(cached);
                currentLat = parsed.lat;
                currentLng = parsed.lng;
              } else {
                try {
                  const geo = await geocodeAddress({
                    data: {
                      street: profile.street || undefined,
                      number: profile.number || undefined,
                      neighborhood: profile.neighborhood || undefined,
                      city: profile.city || undefined,
                      state: profile.state || undefined,
                      cep: profile.cep || undefined,
                    }
                  });

                  if (geo && geo.lat && geo.lng) {
                    currentLat = geo.lat;
                    currentLng = geo.lng;
                    await supabaseExternal
                      .from("profiles")
                      .update({ lat: geo.lat, lng: geo.lng })
                      .eq("id", userId);
                    localStorage.setItem(geoCacheKey, JSON.stringify({ lat: geo.lat, lng: geo.lng }));
                  }
                } catch (geoErr) {
                  console.error("[Geocoding] Falha na rotina automática:", geoErr);
                }
              }
            }

            const addressParts = [
              profile.street,
              profile.number,
              profile.neighborhood,
              profile.city,
              profile.state
            ].filter(Boolean);

            const coords = {
              lat: currentLat,
              lng: currentLng,
              address: addressParts.join(", ") + (profile.cep ? ` - CEP ${profile.cep}` : "")
            };
            setUserCoords(coords);
            localStorage.setItem('fixxer_user_coords_v1', JSON.stringify(coords));
          }
        }
      } catch (err) {
        console.error("Erro ao buscar endereço do perfil:", err);
      }
    };
    getUserLocation();
  }, []);

  /**
   * Busca perfis públicos. Independente de filtros/coordenadas (filtragem e
   * distância são calculadas no cliente) → evita recarregamentos desnecessários.
   */
  const fetchList = useCallback(async (isMore = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    const currentPage = isMore ? pageRef.current + 1 : 0;

    try {
      if (isMore) setLoadingMore(true);
      else if (items.length === 0) setLoading(true);

      setError(null);

      const runQuery = (cols: string, withOrder: boolean) => {
        let q = supabaseExternal.from("profiles_public").select(cols);
        if (withOrder) q = q.order("created_at", { ascending: false });
        return q.range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);
      };

      let { data, error: supabaseError } = await runQuery(SAFE_COLS, true);

      // Resiliência 42703: view desatualizada não pode derrubar a seção.
      if (
        supabaseError &&
        (supabaseError.code === "42703" || String(supabaseError.message || "").includes("does not exist"))
      ) {
        const retry = await runQuery(PUBLIC_PROFILE_MINIMAL_COLS, false);
        data = retry.data as any;
        supabaseError = retry.error;
      }

      if (supabaseError) throw supabaseError;


      const profiles = (data as any[]) ?? [];

      const rows: Card[] = profiles
        .map((r: any) => {
          const kind = classifyStoreKind(r.role, r.user_type);
          if (!kind) return null;
          if (currentUserId && String(r.id) === String(currentUserId)) return null;

          const branch =
            r.activity_branch ||
            r.custom_branch ||
            r.business_category ||
            (kind === "lojista" ? "Lojista" : "Fornecedor B2B");

          return {
            id: r.id,
            full_name: r.full_name,
            display_name: r.display_name,
            company_name: r.company_name,
            avatar_url: r.avatar_url || r.logo_url || null,
            role: r.role,
            business_category: r.business_category,
            custom_branch: r.custom_branch,
            preferred_service: r.preferred_service,
            city: r.city,
            state: r.state,
            neighborhood: r.neighborhood || null,
            rating: r.rating != null ? Number(r.rating) : 0,
            created_at: r.created_at || null,
            lat: r.lat !== null && r.lat !== undefined ? Number(r.lat) : null,
            lng: r.lng !== null && r.lng !== undefined ? Number(r.lng) : null,
            _kind: kind,
            _branch: branch,
          } as Card;
        })
        .filter(Boolean) as Card[];

      const merged = isMore ? [...items, ...rows] : rows;
      const uniqueItems = Array.from(new Map(merged.map((i) => [i.id, i])).values());

      // Só sobrescreve a lista quando há resultado, mantendo o cache visível.
      if (uniqueItems.length > 0 || !isMore) setItems(uniqueItems);
      if (uniqueItems.length > 0) writeStoresCache(uniqueItems);
      pageRef.current = currentPage;
      setHasMore(profiles.length === PAGE_SIZE);
    } catch (e: any) {
      dataMonitor.logError("RecentStoresCarousel", e, { kindFilter });
      setError(e?.message || "Falha ao carregar parceiros.");
    } finally {
      inFlight.current = false;
      setLoading(false);
      setLoadingMore(false);
      if (!isMore) setTimeout(handleScroll, 100);
    }
  }, [items, currentUserId, kindFilter]);

  // Busca inicial (uma única vez) + revalidação apenas quando o cache está velho.
  const didFetch = useRef(false);
  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    const cached = readStoresCache();
    if (!cached || Date.now() - cached.ts > CACHE_TTL) {
      fetchList(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ao identificar o usuário logado, apenas remove o próprio card (sem refetch).
  useEffect(() => {
    if (!currentUserId) return;
    setItems((prev) => prev.filter((i) => String(i.id) !== String(currentUserId)));
  }, [currentUserId]);

  const filteredItems = useMemo(() => {
    const uLat = userCoords?.lat ?? 0;
    const uLng = userCoords?.lng ?? 0;

    let filtered = items.map((i) => ({
      ...i,
      _distance: getHaversineDistance(uLat, uLng, i.lat ?? 0, i.lng ?? 0) ?? undefined,
    }));

    if (userCoords) {
      filtered.sort((a, b) => (a._distance ?? Infinity) - (b._distance ?? Infinity));
    }

    if (kindFilter === "lojista") {
      filtered = filtered.filter(i => i._kind === "lojista");
    } else if (kindFilter === "fornecedor") {
      filtered = filtered.filter(i => i._kind === "fornecedor");
    } else if (kindFilter === "branch") {
      filtered = filtered.filter(i => {
        if (!userBranchCtx.hasContext) return true;
        const relevance = scoreRelevance(
          [i.business_category, i.custom_branch, i._branch, i.preferred_service].filter(Boolean) as string[],
          userBranchCtx
        );
        return relevance !== "none";
      });
    }

    if (radiusFilter > 0) {
      filtered = filtered.filter(i => i._distance !== undefined && i._distance <= radiusFilter);
    }

    return filtered;
  }, [items, kindFilter, radiusFilter, userBranchCtx, userCoords]);



  const scroll = (direction: "left" | "right") => {
    if (!scrollerRef.current) return;
    const amount = direction === "left" ? -300 : 300;
    scrollerRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  const openProfile = (p: Card) => {
    primePublicProfileCategory(p.id, p._kind);
    navigate({ to: `/perfil/${p.id}` as any });
  };

  if (loading && items.length === 0) {
    return (
      <section className="bg-[#121214] border border-white/5 rounded-3xl p-6 shadow-2xl">
        <h3 className="font-black italic uppercase text-white text-xl tracking-tighter mb-4">LOJISTAS E FORNECEDORES RECENTES</h3>
        <CarouselLoadingFallback />
      </section>
    );
  }

  if (error && items.length === 0) {
    return (
      <CarouselErrorFallback 
        title="LOJISTAS E FORNECEDORES RECENTES"
        error={error}
        onRetry={() => fetchList(false)}
      />
    );
  }

  return (
    <section aria-label="Lojistas e Fornecedores Recentes" className="bg-[#121214] border border-white/5 rounded-3xl p-6 relative group shadow-2xl">
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🏬</span>
          <h3 className="font-black italic uppercase text-white text-xl tracking-tighter">
            LOJISTAS E FORNECEDORES RECENTES
          </h3>
        </div>
        <p className="text-xs text-white/40 font-medium">
          Conecte-se com lojistas e fornecedores B2B na sua região — priorizando lojistas de <span className="text-white font-bold">{userBranchCtx.branches[0] || "Seu Ramo"}</span>.
        </p>
        
        <div className="flex items-center gap-3 mt-6 overflow-x-auto pb-4 scrollbar-hide snap-x no-scrollbar">
          <button
            onClick={() => setKindFilter("all")}
            className={`min-w-[120px] h-9 flex-shrink-0 rounded-full text-[10px] font-black uppercase italic transition-all flex items-center justify-center gap-2 border snap-start ${kindFilter === "all" ? 'bg-white/20 text-white border-white/30' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}`}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Todos
          </button>

          <button
            onClick={() => setKindFilter("branch")}
            className={`min-w-[120px] h-9 flex-shrink-0 rounded-full text-[10px] font-black uppercase italic transition-all flex items-center justify-center gap-2 border snap-start ${kindFilter === "branch" ? 'bg-[#00FF88] text-black border-[#00FF88]' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}`}
          >
            <span className="text-xs">🎯</span> Do meu ramo
          </button>

          <button
            onClick={() => setKindFilter("lojista")}
            className={`min-w-[120px] h-9 flex-shrink-0 rounded-full text-[10px] font-black uppercase italic transition-all flex items-center justify-center gap-2 border snap-start ${kindFilter === "lojista" ? 'bg-white/20 text-white border-white/30' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}`}
          >
            <span className="text-xs">🏬</span> Lojistas
          </button>

          <button
            onClick={() => setKindFilter("fornecedor")}
            className={`min-w-[120px] h-9 flex-shrink-0 rounded-full text-[10px] font-black uppercase italic transition-all flex items-center justify-center gap-2 border snap-start ${kindFilter === "fornecedor" ? 'bg-white/20 text-white border-white/30' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}`}
          >
            <span className="text-xs">🏭</span> Fornecedores
          </button>

          <div className="flex items-center gap-2 border-l border-white/10 pl-3">
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest whitespace-nowrap">Raio (KM):</span>
            <select
              value={radiusFilter}
              onChange={(e) => setRadiusFilter(Number(e.target.value))}
              className="h-9 bg-white/5 text-white/80 border border-white/10 rounded-full px-3 text-[10px] font-black outline-none focus:border-[#00FF88]/50 transition-all cursor-pointer"
            >
              <option value={0}>Todos</option>
              <option value={10}>10 KM</option>
              <option value={25}>25 KM</option>
              <option value={50}>50 KM</option>
              <option value={100}>100 KM</option>
              <option value={200}>200 KM</option>
            </select>
          </div>

          <button
            onClick={() => {
              setKindFilter("all");
              setRadiusFilter(0);
              setScrollProgress(0);
              if (scrollerRef.current) scrollerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
            }}
            className="min-w-[120px] h-9 flex-shrink-0 rounded-full text-[10px] font-black uppercase italic bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 snap-start"
          >
            <span>🧹</span> Limpar
          </button>

          <button
            onClick={() => fetchList()}
            className="min-w-[120px] h-9 flex-shrink-0 rounded-full text-[10px] font-black uppercase italic bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 flex items-center justify-center gap-2 snap-start"
          >
            <span>🔄</span> Atualizar
          </button>
        </div>
      </header>

      {loading && items.length === 0 ? (
        <div className="flex gap-4 overflow-hidden py-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="w-64 h-[400px] rounded-3xl bg-white/5 animate-pulse border border-white/5 flex-shrink-0" />
          ))}
        </div>
      ) : error && items.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-red-500/20 rounded-3xl bg-red-500/5 text-red-400 italic text-sm">
           <p className="font-bold mb-2 uppercase tracking-tighter">Erro de Conexão</p>
           {error}
           <button onClick={() => fetchList()} className="mt-4 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-black uppercase text-red-400 hover:bg-red-500/20 transition-all">Tentar Novamente</button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl text-white/40 italic text-sm space-y-3">
           <p>{items.length > 0 ? "Nenhum parceiro corresponde aos filtros selecionados." : "Nenhum lojista ou fornecedor disponível no momento."}</p>
           <button
             onClick={() => { setKindFilter("all"); setRadiusFilter(0); fetchList(false); }}
             className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase text-white/70 hover:bg-white/10 transition-all"
           >
             Limpar filtros e recarregar
           </button>
        </div>

      ) : (

        <div className="relative">
          {/* Navegação Horizontal - Botões Desktop */}
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              scroll("left");
            }}
            className="absolute -left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#00FF88] text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-xl hidden md:flex hover:scale-110 active:scale-95"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div 
            ref={scrollerRef} 
            onScroll={handleScroll}
            className="flex gap-4 overflow-x-auto pb-6 snap-x scrollbar-hide scroll-smooth touch-pan-x no-scrollbar pr-20"
            style={{ 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none', 
              WebkitOverflowScrolling: 'touch',
              minHeight: '440px'
            }}
          >

            {filteredItems.map((p) => {
              const name = p.company_name || p.display_name || p.full_name || "Parceiro";
              return (
                <div
                  key={p.id}
                  onClick={() => openProfile(p)}
                  role="button"
                  tabIndex={0}
                  className={`w-64 flex-shrink-0 snap-start bg-[#1A1A1E] border-2 rounded-3xl overflow-hidden text-left hover:-translate-y-2 transition-all duration-300 group/card relative cursor-pointer outline-none focus:ring-2 focus:ring-[#00FF88]/50 flex flex-col ${
                    p._kind === 'lojista' 
                      ? 'border-[#00E5FF]/20 hover:border-[#00E5FF] shadow-[0_0_20px_rgba(0,229,255,0.05)]' 
                      : 'border-[#A855F7]/20 hover:border-[#A855F7] shadow-[0_0_20px_rgba(168,85,247,0.05)]'
                  }`}
                >
                  <div className="h-40 bg-gradient-to-b from-white/[0.05] to-transparent flex items-center justify-center relative overflow-hidden shrink-0">
                    {/* Badge Rating Superior */}
                    <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-1.5">
                      <div className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1 shadow-lg">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-[10px] font-black text-white italic">{p.rating && p.rating > 0 ? p.rating.toFixed(1) : "s/av."}</span>
                      </div>
                      
                      {p._distance !== undefined && (
                        <div className="px-2 py-0.5 rounded-full bg-[#00FF88]/20 backdrop-blur-md border border-[#00FF88]/30 flex items-center gap-1 shadow-lg animate-in fade-in zoom-in duration-300">
                          <Navigation className="w-2.5 h-2.5 text-[#00FF88]" />
                          <span className="text-[9px] font-black text-[#00FF88] italic">
                            {p._distance < 1 ? `${(p._distance * 1000).toFixed(0)}m` : `${p._distance.toFixed(1)}km`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Badge CNPJ Verificado Real */}
                    {(p as any).is_verified && (
                      <div className="absolute top-4 left-4 z-20">
                        <div className="px-2 py-0.5 rounded-full bg-[#00FF88]/20 backdrop-blur-md border border-[#00FF88]/30 flex items-center gap-1 shadow-lg">
                          <ShieldCheck className="w-2.5 h-2.5 text-[#00FF88]" />
                          <span className="text-[8px] font-black text-[#00FF88] uppercase italic">Verificado</span>
                        </div>
                      </div>
                    )}

                    {p.avatar_url ? (
                      <div className={`w-28 h-28 rounded-full border-4 flex items-center justify-center overflow-hidden transition-all duration-500 group-hover/card:scale-110 shadow-2xl ${
                        p._kind === 'lojista' ? 'border-[#00E5FF]' : 'border-[#A855F7]'
                      }`}>
                        <img 
                          src={p.avatar_url} 
                          alt={name} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    ) : (
                      <div className={`w-28 h-28 rounded-full border-4 flex items-center justify-center bg-white/5 transition-all duration-500 group-hover/card:scale-110 shadow-2xl ${
                        p._kind === 'lojista' ? 'border-[#00E5FF]' : 'border-[#A855F7]'
                      }`}>
                        <UserCircle2 className={`w-20 h-20 ${p._kind === 'lojista' ? 'text-[#00E5FF]/40' : 'text-[#A855F7]/40'}`} />
                      </div>
                    )}
                    
                    {/* Badge Categoria Flutuante */}
                    <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter italic z-10 flex items-center gap-1.5 shadow-2xl border border-white/20 transition-transform group-hover/card:scale-105 ${
                      p._kind === 'lojista' ? 'bg-[#00E5FF] text-black shadow-[#00E5FF]/20' : 'bg-[#A855F7] text-white shadow-[#A855F7]/20'
                    }`}>
                      {p._kind === 'lojista' ? (
                        <>
                          <Navigation className="w-3 h-3 rotate-45" /> LOJISTA
                        </>
                      ) : (
                        <>
                          <Puzzle className="w-3 h-3" /> FORNECEDOR B2B
                        </>
                      )}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col space-y-3 bg-gradient-to-b from-black/60 to-black/80">
                    <h4 className="font-black text-white text-base leading-tight uppercase tracking-tight italic line-clamp-2">{name}</h4>
                    
                    <div className="flex flex-col gap-1.5 flex-1">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className={`flex items-start gap-1.5 text-[11px] font-black uppercase tracking-tight ${
                          p._kind === 'lojista' ? 'text-[#00E5FF]' : 'text-[#A855F7]'
                        }`}>
                          <Puzzle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span className="leading-tight line-clamp-2">{p._branch}</span>
                        </span>
                      </div>
                      {p.preferred_service && (
                        <div className="flex items-start gap-1.5 text-[10px] text-white/50 font-medium uppercase italic leading-tight">
                          <Star className="w-3 h-3 mt-0.5 shrink-0 text-amber-500/60" />
                          <span className="flex-1 line-clamp-2">{p.preferred_service}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-1 flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] text-white/50 font-bold uppercase tracking-tight">
                        <MapPin className="w-3 h-3 text-red-500" />
                        <span className="truncate max-w-[80px]">
                          {p.city || "S/L"}, {p.state || "BR"}
                        </span>
                        {p._distance !== undefined && !isNaN(p._distance) ? (
                          <span className="ml-auto flex items-center gap-1 text-[#00FF88] font-black italic">
                            <Navigation className="w-2.5 h-2.5 rotate-45" />
                             {p._distance.toFixed(1)} KM
                           </span>
                         ) : (
                           <span className="ml-auto text-white/20 text-[8px] italic uppercase tracking-tighter flex items-center gap-1">
                             <Navigation className="w-2.5 h-2.5 opacity-30" />
                             Distância N/D
                           </span>
                         )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#00FF88]/10 border border-[#00FF88]/20">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#00FF88] shadow-[0_0_8px_#00FF88] animate-pulse" />
                          <span className="text-[9px] font-black text-[#00FF88] uppercase italic">
                            {(() => {
                              if (!p.created_at) return "Online";
                              const years = Math.floor(Math.abs(Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
                              return years >= 1 ? `Ativo há +${years} ${years === 1 ? "ano" : "anos"}` : "Ativo recentemente";
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              );
            })}
            
            {loadingMore && (
              <div className="flex gap-4">
                {[1,2,3].map(i => (
                  <div key={i} className="w-64 h-[400px] rounded-3xl bg-white/5 animate-pulse border border-white/5 flex-shrink-0" />
                ))}
              </div>
            )}
          </div>


          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              scroll("right");
            }}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#00FF88] text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-xl hidden md:flex hover:scale-110 active:scale-95"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
      
      {/* Barra de Navegação Inferior Horizontal Personalizada */}
      <div className="mt-8 relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden max-w-sm mx-auto pointer-events-none">
        <div 
          className="absolute top-0 h-full bg-[#00FF88] rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(0,255,136,0.6)]"
          style={{ 
            width: `${Math.max(20, Math.min(100, (3 / Math.max(1, filteredItems.length)) * 100))}%`,
            left: `${Math.max(0, Math.min(80, (scrollProgress / 100) * 80))}%`,
          }}
        />
      </div>
    </section>


  );
}

import { memo as __memo } from "react";
export const RecentStoresCarousel = __memo(RecentStoresCarouselInner);

