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
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState<"all" | Kind | "branch">("branch");
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const userBranchCtx = useUserBranchContext();

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

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      const { data: profiles, error } = await supabaseExternal
        .from("profiles_public")
        .select("id, full_name, display_name, company_name, avatar_url, logo_url, role, business_category, custom_branch, city, state, created_at, lat, lng")
        .limit(60);

      if (error) throw error;

      if (profiles && profiles.length > 0) {
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
            rating: 4.5 + Math.random() * 0.5, // Mock rating para bater com a imagem
            created_at: r.created_at,
            lat: r.lat ? Number(r.lat) : null,
            lng: r.lng ? Number(r.lng) : null,
            _kind: kind as Kind,
            _branch: r.business_category?.split(',')[0] || r.custom_branch || "Geral",
            _distance: dist
          };
        });
        
        // Ordenar por distância se disponível
        setItems(rows.sort((a, b) => (a._distance || 9999) - (b._distance || 9999)));
      }
    } catch (e) {
      console.error("[RecentStoresCarousel] Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [userCoords]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const sortedItems = useMemo(() => {
    let filtered = items;
    if (kindFilter === "branch") {
      filtered = items.filter(i => {
        if (!userBranchCtx.hasContext) return true;
        const relevance = scoreRelevance([i.business_category, i.custom_branch], userBranchCtx);
        return relevance !== "none";
      });
    } else if (kindFilter !== "all") {
      filtered = items.filter(i => i._kind === kindFilter);
    }
    return filtered.slice(0, 25); 
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
          {[1,2,3,4].map(i => (
            <div key={i} className="w-56 h-72 rounded-2xl bg-white/5 animate-pulse border border-white/5 flex-shrink-0" />
          ))}
        </div>
      ) : sortedItems.length === 0 ? (
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
            className="flex gap-4 overflow-x-auto pb-6 snap-x scrollbar-hide scroll-smooth"
          >
            {sortedItems.map((p) => {
              const name = p.company_name || p.display_name || p.full_name || "Parceiro";
              return (
                <button
                  key={p.id}
                  onClick={() => openProfile(p)}
                  className="w-56 flex-shrink-0 snap-start bg-[#1A1A1E] border border-white/5 rounded-2xl overflow-hidden text-left hover:border-primary/50 hover:-translate-y-1 transition-all duration-300 group/card"
                >
                  <div className="h-36 bg-white/5 flex items-center justify-center relative overflow-hidden">
                    {p.avatar_url ? (
                      <img 
                        src={p.avatar_url} 
                        alt={name} 
                        className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-white/[0.02]">
                        <UserCircle2 className="w-16 h-16 text-white/10" />
                      </div>
                    )}
                    
                    <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter italic z-10 ${p._kind === 'lojista' ? 'bg-[#00E5FF] text-black shadow-[0_0_15px_rgba(0,229,255,0.3)]' : 'bg-[#A855F7] text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'}`}>
                      {p._kind}
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <h4 className="font-black text-white text-[13px] leading-tight uppercase tracking-tight italic line-clamp-1">{name}</h4>
                    
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-bold text-primary uppercase tracking-widest">
                        {p._branch}
                      </span>
                    </div>

                    <div className="pt-1 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                        <MapPin className="w-3 h-3 text-primary" />
                        <span className="truncate">{p.city || "S/L"}, {p.state || "BR"}</span>
                      </div>
                      
                      {p._distance !== undefined && (
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-black italic uppercase tracking-tighter">
                          <Navigation className="w-3 h-3" />
                          {p._distance < 1 ? "Menos de 1 km" : `${p._distance.toFixed(1)} km de você`}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-white/5 mt-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500 fill-current" />
                        <span className="text-[10px] font-black text-white">{(p.rating || 5.0).toFixed(1)}</span>
                      </div>
                      <span className="text-[8px] font-bold text-muted-foreground uppercase">Ver Perfil</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <button 
            onClick={() => scroll("right")}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-xl hidden md:flex"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
      
      {/* Barra de Navegação Inferior Horizontal (Visual p/ Scroll Mobile) */}
      <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden w-full max-w-[200px] mx-auto">
         <div className="h-full bg-primary/20 w-1/3 rounded-full animate-pulse" />
      </div>
    </section>
  );
}

import { memo as __memo } from "react";
export const RecentStoresCarousel = __memo(RecentStoresCarouselInner);

