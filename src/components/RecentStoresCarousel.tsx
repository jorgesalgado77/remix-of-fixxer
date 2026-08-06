import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Star, MapPin, UserCircle2, ChevronLeft, ChevronRight, Navigation, Puzzle } from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { primePublicProfileCategory } from "@/lib/public-profile-category";
import { useUserBranchContext, scoreRelevance } from "@/lib/branch-relevance";
import { geocodeAddress } from "@/lib/geocoding.functions";
import { getHaversineDistance } from "@/lib/haversine-helper";


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

function RecentStoresCarouselInner() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Persistência do estado dos filtros
  const [kindFilter, setKindFilter] = useState<"all" | Kind | "branch">("all");

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [radiusFilter, setRadiusFilter] = useState<number>(0); // 0 = Sem limite
  const [scrollProgress, setScrollProgress] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return Number(localStorage.getItem('fixxer_carousel_scroll')) || 0;
  });

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; address?: string } | null>(null);
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


  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const { data: { session } } = await supabaseExternal.auth.getSession();
        if (session?.user) {
          const userId = session.user.id;
          
          // Busca RIGOROSA e COMPLETA dos dados de endereço.
          const { data: profile, error } = await supabaseExternal
            .from("profiles")
            .select("id, lat, lng, city, state, street, neighborhood, number, cep")
            .eq("id", userId)
            .maybeSingle();
          
          if (profile) {
            let currentLat = profile.lat ? Number(profile.lat) : 0;
            let currentLng = profile.lng ? Number(profile.lng) : 0;

            // Rotina de Geocodificação Automática com Cache e Validação
            const needsGeo = (!currentLat || !currentLng || (Math.abs(currentLat) < 0.001)) && (profile.cep || profile.city);
            
            if (needsGeo) {
              const geoCacheKey = `fixxer_geo_cache_${userId}_${profile.cep || profile.city}`;
              const cached = localStorage.getItem(geoCacheKey);
              
              if (cached) {
                const parsed = JSON.parse(cached);
                currentLat = parsed.lat;
                currentLng = parsed.lng;
              } else {
                console.log("[Geocoding] Iniciando preenchimento automático para:", profile.id);
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
                    console.log("[Geocoding] Coordenadas encontradas:", geo);
                    currentLat = geo.lat;
                    currentLng = geo.lng;

                    // Persistir no banco de dados para evitar re-processamento
                    await supabaseExternal
                      .from("profiles")
                      .update({ lat: geo.lat, lng: geo.lng })
                      .eq("id", userId);
                    
                    // Cache local para evitar chamadas durante a sessão se o banco demorar a refletir
                    localStorage.setItem(geoCacheKey, JSON.stringify({ lat: geo.lat, lng: geo.lng }));
                  }
                } catch (geoErr) {
                  console.error("[Geocoding] Falha na rotina automática:", geoErr);
                  // Não faz nada, mantém lat/lng zero para não quebrar a UI
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
          }
        }
      } catch (err) {
        console.error("Erro ao buscar endereço do perfil:", err);
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
      // Limpar cache ao forçar atualização manual
      if (!isMore) cacheRef.current = {};

      if (isMore) setLoadingMore(true);
      else setLoading(true);
      
      setError(null);
      
      // Construção da query com colunas básicas primeiro para evitar quebra total
      // Se a view não tiver as colunas novas, o Supabase retornará erro 42703 (coluna inexistente)
      let query = supabaseExternal
        .from("profiles_public")
        .select("id, full_name, display_name, company_name, avatar_url, role, business_category, custom_branch, preferred_service, city, state, street, neighborhood, number, cep, created_at, lat, lng, activity_branch")
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1)
        .order('created_at', { ascending: false });

      // Tentativa de buscar colunas de endereço detalhado separadamente ou verificar erro
      // Para manter a UI estável, se as colunas novas falharem, usamos o fallback
      const { data: profiles, error: supabaseError } = await query;


      if (supabaseError) throw supabaseError;

      if (profiles) {
        // Recuperar o ID do usuário atual do Supabase (para filtrar o próprio card)
        const { data: { session } } = await supabaseExternal.auth.getSession();
        const currentUserId = session?.user?.id;

        // Filtrar Admins e o PRÓPRIO usuário logado
        const filteredProfiles = profiles.filter((p: any) => {
          const isMe = String(p.id) === String(currentUserId);
          // Usamos apenas role para admin, já que user_type pode ser a coluna faltante
          const roleStr = String(p.role || "").toLowerCase();
          const isAdmin = roleStr === 'admin';
          return !isAdmin && !isMe;
        });



        const rows: Card[] = filteredProfiles.map((r: any) => {
          const roleStr = (r.role || "").toLowerCase();
          const isLojista = roleStr.includes("lojist");
          const isFornecedor = roleStr.includes("fornec") || roleStr.includes("parceiro");
          const kind = isFornecedor ? "fornecedor" : "lojista";

          // Prioridade total para o Ramo de Atividade Real (Banco de Dados)
          // 1. activity_branch (valor do Picker oficial)
          // 2. custom_branch (valor manual)
          // 3. business_category (categoria legada)
          const branch = r.activity_branch || r.custom_branch || r.business_category || (isLojista ? "Lojista" : isFornecedor ? "Fornecedor B2B" : "Profissional");
          
          // Debugging distance: Log inputs for calculation
          const rLat = r.lat !== null && r.lat !== undefined ? Number(r.lat) : 0;
          const rLng = r.lng !== null && r.lng !== undefined ? Number(r.lng) : 0;
          const uLat = userCoords?.lat !== null && userCoords?.lat !== undefined ? Number(userCoords?.lat) : 0;
          const uLng = userCoords?.lng !== null && userCoords?.lng !== undefined ? Number(userCoords?.lng) : 0;

          // Validação rigorosa: aceita valores reais de coordenadas (não zero)
          const dist = getHaversineDistance(uLat, uLng, rLat, rLng) ?? undefined;

          if (r.id.includes("debug") || (r.display_name && r.display_name.includes("ANDREIA"))) {
            console.log(`[RecentStoresCarousel] Dist Check for ${r.display_name}:`, { 
              dist,
              rLat, rLng, 
              uLat, uLng, 
              uAddress: userCoords?.address,
              rAddress: `${r.street || ""}, ${r.number || ""}, ${r.neighborhood || ""}, ${r.city || ""}, ${r.state || ""} - CEP ${r.cep || ""}`.trim()
            });
          }

          return {
            id: r.id,
            full_name: r.full_name,
            display_name: r.display_name,
            company_name: r.company_name,
            avatar_url: r.avatar_url,
            role: r.role,
            business_category: r.business_category,
            custom_branch: r.custom_branch,
            preferred_service: r.preferred_service,
            city: r.city,
            state: r.state,
            street: r.street || null,
            neighborhood: r.neighborhood || null,
            number: r.number || null,
            cep: r.cep || null,
            rating: 4.5 + Math.random() * 0.5,
            created_at: r.created_at,
            lat: r.lat !== null ? Number(r.lat) : null,
            lng: r.lng !== null ? Number(r.lng) : null,
            _kind: kind as Kind,
            _branch: branch,
            _distance: dist
          };
        });
        
        const newItems = isMore ? [...items, ...rows] : rows;
        
        // Remove duplicates by ID
        const uniqueItems = Array.from(new Map(newItems.map(item => [item.id, item])).values());
        
        // Ordenar por distância se disponível, senão por data
        const sorted = userCoords 
          ? [...uniqueItems].sort((a, b) => {
              const distA = a._distance ?? Infinity;
              const distB = b._distance ?? Infinity;
              return distA - distB;
            })
          : uniqueItems;

        // Persistência em cache de memória (opcional) e estado
        setItems(sorted);
        setPage(currentPage);
        setHasMore(rows.length === PAGE_SIZE);

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
    // Resetar quando o filtro mudar apenas se não houver itens OU se o filtro mudar para algo não cacheado
    // Mantemos os itens se eles já existirem para evitar "sumiço" ao voltar de rotas
    if (items.length === 0) {
      setPage(0);
      setHasMore(true);
      fetchList();
    }
  }, [kindFilter, items.length]);

  const filteredItems = useMemo(() => {
    let filtered = items;
    
    // 1. Filtragem por Tipo (Role)
    if (kindFilter === "lojista") {
      filtered = filtered.filter(i => i._kind === "lojista");
    } else if (kindFilter === "fornecedor") {
      filtered = filtered.filter(i => i._kind === "fornecedor");
    } else if (kindFilter === "branch") {
      filtered = filtered.filter(i => {
        if (!userBranchCtx.hasContext) return true;
        const relevance = scoreRelevance([i.business_category], userBranchCtx);
        return relevance !== "none";
      });
    }

    // 2. Filtragem por Raio (Distância)
    if (radiusFilter > 0) {
      filtered = filtered.filter(i => i._distance !== undefined && i._distance <= radiusFilter);
    }

    return filtered;
  }, [items, kindFilter, radiusFilter, userBranchCtx]);


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
        <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl text-white/40 italic text-sm">
           Nenhum parceiro encontrado nesta categoria.
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
                        <span className="text-[10px] font-black text-white italic">{(p.rating || 5.0).toFixed(1)}</span>
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
                          <span className="text-[9px] font-black text-[#00FF88] uppercase italic">Disponível</span>
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

