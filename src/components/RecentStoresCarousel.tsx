import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Star, MapPin, UserCircle2, ChevronLeft, ChevronRight, Navigation, Puzzle } from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { primePublicProfileCategory } from "@/lib/public-profile-category";
import { useUserBranchContext, scoreRelevance } from "@/lib/branch-relevance";


type Row = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  role: string | null;
  business_category: string | null;
  custom_branch: string | null;
  city: string | null;
  state: string | null;
  rating: number | null;
  created_at: string | null;
  lat: number | null;
  lng: number | null;
};

type Kind = "lojista" | "fornecedor";
type Card = Row & { _kind: Kind; _branch: string | null; _distance?: number };

// Helper para cálculo Haversine (Distância entre coordenadas)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function RecentStoresCarouselInner() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Persistência do estado dos filtros
  const [kindFilter, setKindFilter] = useState<"all" | Kind | "branch">(() => {
    if (typeof window === 'undefined') return "branch";
    return (localStorage.getItem('fixxer_carousel_filter') as any) || "branch";
  });

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return Number(localStorage.getItem('fixxer_carousel_scroll')) || 0;
  });

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;
  const userBranchCtx = useUserBranchContext();

  // Cache simples em memória para evitar chamadas repetidas
  const cacheRef = useRef<{ [key: string]: { data: Card[], timestamp: number } }>({});
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  // Monitorar progresso do scroll e persistir
  const handleScroll = () => {
    if (!scrollerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollerRef.current;
    const totalScrollable = scrollWidth - clientWidth;
    
    let progress = 0;
    if (totalScrollable <= 0) {
      progress = 100;
    } else {
      progress = (scrollLeft / totalScrollable) * 100;
    }
    
    setScrollProgress(progress);
    localStorage.setItem('fixxer_carousel_scroll', progress.toString());

    // Lógica de Infinite Scroll: se chegar perto do fim, carrega mais
    if (totalScrollable - scrollLeft < 500 && !loadingMore && hasMore && !loading) {
      fetchList(true);
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

  // Capturar localização do usuário logado
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const { data: { session } } = await supabaseExternal.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabaseExternal
            .from("profiles_public")
            .select("lat, lng")
            .eq("id", session.user.id)
            .single();
          
          if (profile?.lat && profile?.lng) {
            setUserCoords({ lat: Number(profile.lat), lng: Number(profile.lng) });
          }
        }
      } catch (err) {
        console.error("Location fetch error:", err);
      }
    };
    getUserLocation();
  }, []);

  const fetchList = useCallback(async (isMore = false) => {
    const currentPage = isMore ? page + 1 : 0;
    const cacheKey = `carousel_${kindFilter}_${currentPage}`;
    
    // Verificar cache se não for "carregar mais" (ou se quisermos cache por página também)
    if (!isMore && cacheRef.current[cacheKey] && (Date.now() - cacheRef.current[cacheKey].timestamp < CACHE_TTL)) {
      setItems(cacheRef.current[cacheKey].data);
      setLoading(false);
      return;
    }

    try {
      if (isMore) setLoadingMore(true);
      else setLoading(true);
      
      setError(null);
      
      let query = supabaseExternal
        .from("profiles_public")
        .select("id, full_name, display_name, company_name, avatar_url, logo_url, role, business_category, custom_branch, city, state, created_at, lat, lng")
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      // Aplicar filtros básicos na query para performance
      if (kindFilter === "lojista") {
        query = query.ilike('role', '%lojista%');
      } else if (kindFilter === "fornecedor") {
        query = query.ilike('role', '%fornec%');
      }

      const { data: profiles, error: supabaseError } = await query;

      if (supabaseError) throw supabaseError;

      if (profiles) {
        const rows: Card[] = profiles.map(r => {
          const roleStr = (r.role || "").toLowerCase();
          const kind = roleStr.includes("fornec") ? "fornecedor" : "lojista";
          const dist = (userCoords && r.lat && r.lng) 
            ? calculateDistance(userCoords.lat, userCoords.lng, Number(r.lat), Number(r.lng)) 
            : undefined;

          return {
            id: r.id,
            full_name: r.full_name,
            display_name: r.display_name,
            company_name: r.company_name,
            avatar_url: r.avatar_url || (r as any).logo_url,
            role: r.role,
            business_category: r.business_category,
            custom_branch: r.custom_branch,
            city: r.city,
            state: r.state,
            rating: 4.5 + Math.random() * 0.5,
            created_at: r.created_at,
            lat: r.lat ? Number(r.lat) : null,
            lng: r.lng ? Number(r.lng) : null,
            _kind: kind as Kind,
            _branch: r.business_category?.split(',')[0] || r.custom_branch || "Geral",
            _distance: dist
          };
        });
        
        const newItems = isMore ? [...items, ...rows] : rows;
        
        // Ordenar se houver coordenadas (Haversine)
        const sorted = userCoords 
          ? newItems.sort((a, b) => (a._distance || 9999) - (b._distance || 9999))
          : newItems;

        setItems(sorted);
        setPage(currentPage);
        setHasMore(rows.length === PAGE_SIZE);

        // Salvar no cache
        if (!isMore) {
          cacheRef.current[cacheKey] = { data: sorted, timestamp: Date.now() };
        }
      }
    } catch (e: any) {
      console.error("[RecentStoresCarousel] Fetch error:", e);
      setError(e.message || "Falha ao carregar parceiros.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      if (!isMore) setTimeout(handleScroll, 100);
    }
  }, [userCoords, kindFilter, page, items, userBranchCtx]);

  useEffect(() => {
    // Resetar quando o filtro mudar (exceto no carregamento inicial se já tivermos itens do cache)
    setPage(0);
    setHasMore(true);
    fetchList();
  }, [kindFilter]);

  const filteredItems = useMemo(() => {
    // Filtro adicional em memória para o "Do meu ramo" se necessário (embora idealmente fizesse via query)
    if (kindFilter === "branch") {
      return items.filter(i => {
        if (!userBranchCtx.hasContext) return true;
        const relevance = scoreRelevance([i.business_category, i.custom_branch], userBranchCtx);
        return relevance !== "none";
      });
    }
    return items;
  }, [items, kindFilter, userBranchCtx]);


  const scroll = (direction: "left" | "right") => {
    if (!scrollerRef.current) return;
    const amount = direction === "left" ? -300 : 300;
    scrollerRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  const openProfile = (p: Card) => {
    primePublicProfileCategory(p.id, p._kind);
    navigate({ to: `/perfil/${p.id}` as any });
  };

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
        
        <div className="flex items-center gap-3 mt-6 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setKindFilter("branch")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 border ${kindFilter === "branch" ? 'bg-[#00FF88] text-black border-[#00FF88]' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}`}
          >
            <span className="text-sm">🎯</span> Do meu ramo
          </button>

          <button
            onClick={() => setKindFilter("all")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 border ${kindFilter === "all" ? 'bg-white/20 text-white border-white/30' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}`}
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400" /> Todos
          </button>

          <button
            onClick={() => setKindFilter("lojista")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 border ${kindFilter === "lojista" ? 'bg-white/20 text-white border-white/30' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}`}
          >
            <span className="text-sm">🏬</span> Lojistas
          </button>

          <button
            onClick={() => setKindFilter("fornecedor")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 border ${kindFilter === "fornecedor" ? 'bg-white/20 text-white border-white/30' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}`}
          >
            <span className="text-sm">🏭</span> Fornecedores
          </button>

          <button
            onClick={() => fetchList()}
            className="px-4 py-2 rounded-full text-xs font-bold bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 flex items-center gap-2"
          >
            <span>🔄</span> Atualizar
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex gap-4 overflow-hidden py-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="w-64 h-[400px] rounded-3xl bg-white/5 animate-pulse border border-white/5 flex-shrink-0" />
          ))}
        </div>
      ) : error ? (
        <div className="p-12 text-center border border-dashed border-red-500/20 rounded-3xl bg-red-500/5 text-red-400 italic text-sm">
           <p className="font-bold mb-2 uppercase tracking-tighter">Erro de Conexão</p>
           {error}
           <button onClick={() => fetchList()} className="mt-4 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-black uppercase text-red-400 hover:bg-red-500/20 transition-all">Tentar Novamente</button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl text-white/40 italic text-sm">
           Nenhum parceiro encontrado nesta categoria.
        </div>
      ) : (

        <div className="relative">
          {/* Navegação Horizontal - Botões Desktop */}
          <button 
            onClick={() => scroll("left")}
            className="absolute -left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-xl hidden md:flex"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div 
            ref={scrollerRef} 
            onScroll={handleScroll}
            className="flex gap-4 overflow-x-auto pb-6 snap-x scrollbar-hide scroll-smooth touch-pan-x"
          >

            {filteredItems.map((p) => {
              const name = p.company_name || p.display_name || p.full_name || "Parceiro";
              return (
                <button
                  key={p.id}
                  onClick={() => openProfile(p)}
                  className={`w-64 flex-shrink-0 snap-start bg-[#1A1A1E] border-2 rounded-3xl overflow-hidden text-left hover:-translate-y-1 transition-all duration-300 group/card relative ${
                    p._kind === 'lojista' 
                      ? 'border-[#00E5FF]/30 hover:border-[#00E5FF] shadow-[0_0_20px_rgba(0,229,255,0.05)]' 
                      : 'border-[#A855F7]/30 hover:border-[#A855F7] shadow-[0_0_20px_rgba(168,85,247,0.05)]'
                  }`}
                >
                  <div className="h-44 bg-gradient-to-b from-white/[0.02] to-transparent flex items-center justify-center relative overflow-hidden">
                    {/* Badge Rating Superior */}
                    <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1 z-20">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-[10px] font-black text-white italic">{(p.rating || 5.0).toFixed(1)}</span>
                    </div>

                    {p.avatar_url ? (
                      <div className={`w-28 h-28 rounded-full border-4 flex items-center justify-center overflow-hidden transition-all duration-500 group-hover/card:scale-110 ${
                        p._kind === 'lojista' ? 'border-[#00E5FF]' : 'border-[#A855F7]'
                      }`}>
                        <img 
                          src={p.avatar_url} 
                          alt={name} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    ) : (
                      <div className={`w-28 h-28 rounded-full border-4 flex items-center justify-center bg-white/5 transition-all duration-500 group-hover/card:scale-110 ${
                        p._kind === 'lojista' ? 'border-[#00E5FF]' : 'border-[#A855F7]'
                      }`}>
                        <UserCircle2 className={`w-16 h-16 ${p._kind === 'lojista' ? 'text-[#00E5FF]/40' : 'text-[#A855F7]/40'}`} />
                      </div>
                    )}
                    
                    {/* Badge Categoria Flutuante */}
                    <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter italic z-10 flex items-center gap-1.5 shadow-lg border border-white/10 ${
                      p._kind === 'lojista' ? 'bg-[#00E5FF] text-black' : 'bg-[#A855F7] text-white'
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

                  <div className="p-5 space-y-3 bg-gradient-to-b from-black/40 to-black/60">
                    <h4 className="font-black text-white text-base leading-tight uppercase tracking-tight italic line-clamp-1">{name}</h4>
                    
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${
                        p._kind === 'lojista' ? 'text-[#00E5FF]' : 'text-[#A855F7]'
                      }`}>
                        {p._kind === 'lojista' ? <Navigation className="w-3 h-3" /> : <Puzzle className="w-3 h-3" />}
                        {p._branch}
                      </span>
                    </div>

                    <div className="pt-1 flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] text-white/40 font-bold uppercase tracking-tight">
                        <MapPin className="w-3 h-3 text-red-500" />
                        <span className="truncate">{p.city || "S/L"}, {p.state || "BR"}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#00FF88] shadow-[0_0_8px_#00FF88] animate-pulse" />
                        <span className="text-[10px] font-black text-[#00FF88] uppercase italic">Disponível</span>
                      </div>
                    </div>
                  </div>
                </button>

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
            onClick={() => scroll("right")}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-xl hidden md:flex"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
      
      {/* Barra de Navegação Inferior Horizontal Personalizada */}
      <div className="mt-8 relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden max-w-md mx-auto">
        <div 
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500/20 via-[#00FF88] to-emerald-500/20 rounded-full transition-all duration-200 shadow-[0_0_10px_rgba(0,255,136,0.5)]"
          style={{ 
            width: `${Math.max(10, scrollProgress)}%`, 
            left: `${scrollProgress * 0.9}%`,
            transform: 'translateX(0)'
          }}
        />
      </div>
    </section>


  );
}

import { memo as __memo } from "react";
export const RecentStoresCarousel = __memo(RecentStoresCarouselInner);

