import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Star, MapPin, UserCircle2, RefreshCw, Store, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { primePublicProfileCategory } from "@/lib/public-profile-category";

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
type Card = Row & { _kind: Kind; _branch: string | null };

const LOJISTA_COLOR = CATEGORY_COLORS.lojista;
const FORNECEDOR_COLOR = CATEGORY_COLORS.fornecedor;

function RecentStoresCarouselInner() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState<"all" | Kind>("all");
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const fetchList = useCallback(async () => {
    try {
      console.log("[RecentStoresCarousel] Fetching...");
      const { data: profiles, error } = await supabaseExternal
        .from("profiles_public")
        .select("id, full_name, display_name, company_name, avatar_url, logo_url, role, business_category, custom_branch, city, state, created_at, lat, lng")
        .limit(100);

      if (error) throw error;
      console.log("[RecentStoresCarousel] Found:", profiles?.length);

      const rows = (profiles || []).map(r => {
        const role = (r.role || "").toLowerCase();
        let kind: Kind = "lojista";
        if (role.includes("fornec") || role.includes("supplier") || role.includes("parceiro")) {
          kind = "fornecedor";
        }
        
        return {
          id: r.id,
          full_name: r.full_name,
          display_name: r.display_name,
          company_name: r.company_name,
          avatar_url: r.avatar_url || r.logo_url,
          role: r.role,
          business_category: r.business_category,
          custom_branch: r.custom_branch,
          city: r.city,
          state: r.state,
          rating: 5.0,
          created_at: r.created_at,
          lat: r.lat,
          lng: r.lng,
          _kind: kind,
          _branch: r.business_category?.split(',')[0] || r.custom_branch || "Geral"
        } as Card;
      }) as Card[];

      console.log("[RecentStoresCarousel] setItems with:", rows.length);
      setItems(rows);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const sortedItems = useMemo(() => {
    if (kindFilter === "all") return items;
    return items.filter(i => i._kind === kindFilter);
  }, [items, kindFilter]);

  const openProfile = (p: Card) => {
    const cat = p._kind === "lojista" ? "lojista" : "fornecedor";
    primePublicProfileCategory(p.id, cat);
    navigate({ to: `/perfil/${p.id}` as any });
  };

  if (loading) return <div className="p-10 text-center text-white font-black italic uppercase animate-pulse">Carregando parceiros...</div>;

  return (
    <section aria-label="Lojistas e fornecedores recentes" className="bg-[#1A1A1B] border border-white/10 rounded-3xl p-6">
      <header className="mb-4">
        <h3 className="font-black italic uppercase text-white text-base">🏬 Parceiros FIXXER</h3>
        <div className="mt-2 flex gap-2">
          {["all", "lojista", "fornecedor"].map(k => (
            <button
              key={k}
              onClick={() => setKindFilter(k as any)}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${kindFilter === k ? 'bg-primary text-black border-primary' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}
            >
              {k === 'all' ? 'Todos' : k.charAt(0).toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
      </header>

      {sortedItems.length === 0 ? (
        <div className="p-10 text-center border border-dashed border-white/10 rounded-2xl text-white/40">
           Nenhum parceiro disponível nesta categoria.
        </div>
      ) : (
        <div ref={scrollerRef} className="flex gap-4 overflow-x-auto pb-4 snap-x scrollbar-hide">
          {sortedItems.map((p) => {
            const name = p.company_name || p.display_name || p.full_name || "Parceiro";
            return (
              <button
                key={p.id}
                onClick={() => openProfile(p)}
                className="w-48 flex-shrink-0 snap-start bg-black/40 border border-white/10 rounded-2xl overflow-hidden text-left hover:border-primary/50 hover:-translate-y-1 transition-all"
              >
                <div className="h-32 bg-white/5 flex items-center justify-center relative">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle2 className="w-12 h-12 text-white/20" />
                  )}
                  <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${p._kind === 'lojista' ? 'bg-[#00E5FF] text-black' : 'bg-[#A855F7] text-white'}`}>
                    {p._kind}
                  </div>
                </div>
                <div className="p-3">
                  <p className="font-black text-white text-[11px] truncate uppercase tracking-tighter italic block w-full">{name}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-primary" /> {p.city || "Brasil"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

import { memo as __memo } from "react";
export const RecentStoresCarousel = __memo(RecentStoresCarouselInner);
