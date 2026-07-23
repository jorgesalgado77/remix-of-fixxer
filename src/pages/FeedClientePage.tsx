import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { usePerformanceMode } from "@/hooks/use-performance-mode";
import { supabaseExternal } from "@/lib/supabaseExternal";
import {
  ArrowLeft,
  Search,
  MessageSquare,
  Bookmark,
  Star,
  MapPin,
  Store,
  Wrench,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Send,
  Award,
  User as UserIcon,
  Sparkles,
  ArrowUpDown,
  ClipboardList,
  ChevronDown,
  Pencil,
  Trash2,
  Navigation,
  Check,
} from "lucide-react";


// =============================================================================
// TIPOS
// =============================================================================

type VendorKind = "loja" | "prestador";
type Solution =
  | "Todas as Opções"
  | "Lojas de Planejados"
  | "Montadores de Móveis"
  | "Assistência Técnica"
  | "Reformas & Projetos";

type Vendor = {
  id: string;
  kind: VendorKind;
  name: string;
  city: string;
  state: string;
  rating: number;
  reviews: number;
  goldSeal?: boolean;
  headline: string;
  solutions: Solution[];
  avatar: string;
  gallery: string[];
};

// =============================================================================
// MOCK DATA
// =============================================================================

const SOLUTIONS: Solution[] = [
  "Todas as Opções",
  "Lojas de Planejados",
  "Montadores de Móveis",
  "Assistência Técnica",
  "Reformas & Projetos",
];

const MOCK_VENDORS: Vendor[] = [
  {
    id: "vendor-1",
    kind: "loja",
    name: "Inovamad Móveis Planejados",
    city: "Sorocaba",
    state: "SP",
    rating: 4.9,
    reviews: 187,
    goldSeal: true,
    headline: "Especialistas em Cozinhas e Dormitórios Sob Medida",
    solutions: ["Lojas de Planejados"],
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Inovamad&backgroundColor=00FF87",
    gallery: [
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
    ],
  },
  {
    id: "vendor-2",
    kind: "prestador",
    name: "Marcos Lima - Montador Profissional",
    city: "Votorantim",
    state: "SP",
    rating: 5.0,
    reviews: 92,
    goldSeal: true,
    headline: "Montagens, Desmontagens e Reparos em Geral",
    solutions: ["Montadores de Móveis"],
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Marcos+Lima&backgroundColor=00FF87",
    gallery: [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800",
      "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800",
    ],
  },
  {
    id: "vendor-3",
    kind: "loja",
    name: "Premium Casa & Decor",
    city: "São Paulo",
    state: "SP",
    rating: 4.8,
    reviews: 245,
    headline: "Projetos de Alto Padrão em Todos os Ambientes",
    solutions: ["Lojas de Planejados", "Reformas & Projetos"],
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Premium+Casa&backgroundColor=00FF87",
    gallery: [
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800",
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800",
    ],
  },
  {
    id: "vendor-4",
    kind: "prestador",
    name: "TechFix Assistência",
    city: "Campinas",
    state: "SP",
    rating: 4.7,
    reviews: 68,
    headline: "Assistência Técnica para Eletrodomésticos e Móveis Automatizados",
    solutions: ["Assistência Técnica"],
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=TechFix&backgroundColor=00FF87",
    gallery: [
      "https://images.unsplash.com/photo-1581092918484-8313e5b7e5c1?w=800",
    ],
  },
  {
    id: "vendor-5",
    kind: "loja",
    name: "Reforma Fácil Construções",
    city: "Sorocaba",
    state: "SP",
    rating: 4.6,
    reviews: 134,
    headline: "Reformas Completas e Projetos de Interiores",
    solutions: ["Reformas & Projetos"],
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Reforma+Facil&backgroundColor=00FF87",
    gallery: [
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
    ],
  },
  {
    id: "vendor-6",
    kind: "prestador",
    name: "Ana Ribeiro - Designer de Interiores",
    city: "Itu",
    state: "SP",
    rating: 4.9,
    reviews: 55,
    goldSeal: true,
    headline: "Projetos 3D e Consultoria de Ambientes",
    solutions: ["Reformas & Projetos"],
    avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Ana+Ribeiro&backgroundColor=00FF87",
    gallery: [
      "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800",
      "https://images.unsplash.com/photo-1615529182904-14819c35db37?w=800",
    ],
  },
];

const PAGE_SIZE = 4;

type SortKey = "relevance" | "reputation" | "nearest";

const SORT_LABELS: Record<SortKey, string> = {
  relevance: "Mais relevantes",
  reputation: "Melhor reputação",
  nearest: "Mais perto",
};

type MyNeed = {
  id: string;
  title: string;
  category: string | null;
  location: string | null;
  created_at: string;
  metadata: any;
};

// Coordenadas aproximadas das cidades dos vendors (para "Mais perto" via geolocalização)
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  sorocaba: { lat: -23.5015, lng: -47.4526 },
  votorantim: { lat: -23.5464, lng: -47.4383 },
  "são paulo": { lat: -23.5505, lng: -46.6333 },
  campinas: { lat: -22.9099, lng: -47.0626 },
  itu: { lat: -23.2637, lng: -47.2992 },
};

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function FeedClientePage() {
  const { glassClass } = usePerformanceMode();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [solution, setSolution] = useState<Solution>("Todas as Opções");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<{ vendor: Vendor; index: number } | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userCity, setUserCity] = useState<string>("");

  const [sortBy, setSortBy] = useState<SortKey>("relevance");
  const [sortOpen, setSortOpen] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);

  const [myNeeds, setMyNeeds] = useState<MyNeed[]>([]);
  const [needsOpen, setNeedsOpen] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMyNeeds = useCallback(async (uid: string) => {
    const { data, error } = await supabaseExternal
      .from("feed_posts")
      .select("id,title,category,location,created_at,metadata")
      .eq("author_id", uid)
      .eq("type", "b2c")
      .order("created_at", { ascending: false })
      .limit(20);
    if (!error && data) setMyNeeds(data as MyNeed[]);
  }, []);

  // Load session + saved favorites + user city + my needs
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabaseExternal.auth.getUser();
      if (!mounted) return;
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const [{ data: rows }, { data: profile }] = await Promise.all([
          supabaseExternal.from("feed_post_saves").select("post_id").eq("user_id", uid),
          supabaseExternal.from("profiles").select("city").eq("id", uid).maybeSingle(),
        ]);
        if (!mounted) return;
        if (rows) setSaved(new Set(rows.map((r: any) => r.post_id)));
        if (profile?.city) setUserCity(String(profile.city));
        await loadMyNeeds(uid);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadMyNeeds]);

  const filtered = useMemo(() => {
    let list = MOCK_VENDORS.filter((v) => {
      if (solution !== "Todas as Opções" && !v.solutions.includes(solution)) return false;
      if (savedOnly && !saved.has(v.id)) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return (
          v.name.toLowerCase().includes(q) ||
          v.headline.toLowerCase().includes(q) ||
          v.city.toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (sortBy === "reputation") {
      list = [...list].sort(
        (a, b) => b.rating - a.rating || b.reviews - a.reviews,
      );
    } else if (sortBy === "nearest") {
      const city = userCity.trim().toLowerCase();
      list = [...list].sort((a, b) => {
        const aMatch = city && a.city.toLowerCase() === city ? 0 : 1;
        const bMatch = city && b.city.toLowerCase() === city ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
        return a.city.localeCompare(b.city);
      });
    }
    return list;
  }, [query, solution, savedOnly, saved, sortBy, userCity]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
  const savedCount = saved.size;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, solution, sortBy, savedOnly]);

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => c + PAGE_SIZE);
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, visible.length]);

  const toggleSaved = useCallback(
    async (vendorId: string) => {
      if (!userId) {
        toast.error("Faça login para salvar favoritos.");
        return;
      }
      const isSaved = saved.has(vendorId);
      const next = new Set(saved);
      if (isSaved) {
        next.delete(vendorId);
        setSaved(next);
        const { error } = await supabaseExternal
          .from("feed_post_saves")
          .delete()
          .eq("user_id", userId)
          .eq("post_id", vendorId);
        if (error) {
          setSaved(saved);
          toast.error("Não foi possível remover dos favoritos.");
        }
      } else {
        next.add(vendorId);
        setSaved(next);
        const { error } = await supabaseExternal
          .from("feed_post_saves")
          .upsert(
            { user_id: userId, post_id: vendorId },
            { onConflict: "user_id,post_id" },
          );
        if (error) {
          setSaved(saved);
          toast.error("Não foi possível salvar o favorito.");
        } else {
          toast.success("Salvo nos favoritos!");
        }
      }
    },
    [saved, userId],
  );

  const openChat = useCallback(
    (vendor: Vendor) => {
      navigate({ to: "/chat/$peerId", params: { peerId: vendor.id } });
    },
    [navigate],
  );

  const openProfile = useCallback(
    (vendor: Vendor) => {
      if (vendor.kind === "loja") {
        navigate({ to: "/lojista/$id", params: { id: vendor.id } });
      } else {
        toast.info("Perfil do prestador em breve.");
      }
    },
    [navigate],
  );

  const handlePublished = useCallback(async () => {
    if (userId) await loadMyNeeds(userId);
    setNeedsOpen(true);
  }, [userId, loadMyNeeds]);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white pb-32">
      {/* HEADER FIXO */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0A0A0B]/90 border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to="/_authenticated/cliente"
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:border-[#00FF87]/50 transition-all shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar serviços, lojas ou móveis..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs font-medium text-white placeholder:text-muted-foreground focus:border-[#00FF87] outline-none transition-all"
            />
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        {/* BANNER PUBLICAR NECESSIDADE */}
        <button
          onClick={() => setPublishOpen(true)}
          className={`${glassClass} w-full text-left border-2 border-[#00FF87]/40 rounded-3xl p-5 relative overflow-hidden hover:border-[#00FF87] transition-all group`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#00FF87]/10 via-transparent to-transparent" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#00FF87] text-black flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6" strokeWidth={3} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-3 h-3 text-[#00FF87]" />
                <span className="text-[9px] font-black uppercase tracking-widest text-[#00FF87]">
                  Grátis e Sem Compromisso
                </span>
              </div>
              <h2 className="text-sm font-black text-white uppercase italic leading-tight">
                Publicar Minha Necessidade
              </h2>
              <p className="text-[10px] text-muted-foreground font-medium mt-1">
                Descreva o que precisa e receba orçamentos de vários profissionais
              </p>
            </div>
          </div>
        </button>

        {/* MINHAS NECESSIDADES */}
        {userId && myNeeds.length > 0 && (
          <section className={`${glassClass} border border-white/10 rounded-2xl bg-[#1A1A1B] overflow-hidden`}>
            <button
              onClick={() => setNeedsOpen((v) => !v)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-xl bg-[#00FF87]/15 border border-[#00FF87]/30 flex items-center justify-center shrink-0">
                <ClipboardList className="w-4 h-4 text-[#00FF87]" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-[10px] font-black uppercase tracking-widest text-white">
                  Minhas Necessidades
                </div>
                <div className="text-[9px] text-muted-foreground font-bold">
                  {myNeeds.length} publicada{myNeeds.length > 1 ? "s" : ""}
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform ${needsOpen ? "rotate-180" : ""}`}
              />
            </button>
            {needsOpen && (
              <ul className="border-t border-white/5 divide-y divide-white/5">
                {myNeeds.map((n) => {
                  const status = (n.metadata?.status as string) || "active";
                  const statusLabel =
                    status === "active"
                      ? "Ativa"
                      : status === "closed"
                        ? "Encerrada"
                        : status === "paused"
                          ? "Pausada"
                          : status;
                  const statusColor =
                    status === "active"
                      ? "bg-[#00FF87]/15 text-[#00FF87] border-[#00FF87]/30"
                      : status === "closed"
                        ? "bg-white/10 text-muted-foreground border-white/20"
                        : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
                  return (
                    <li key={n.id} className="px-4 py-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate">{n.title}</div>
                        <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                          {n.category || "—"}
                          {n.location ? ` · ${n.location}` : ""}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${statusColor}`}
                      >
                        {statusLabel}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {/* FILTROS DE SOLUÇÃO */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
          {SOLUTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSolution(s)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all border shrink-0 ${
                solution === s
                  ? "bg-[#00FF87] text-black border-[#00FF87] shadow-[0_0_15px_rgba(0,255,135,0.3)]"
                  : "bg-white/5 text-muted-foreground border-white/10 hover:border-white/20"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* ORDENAÇÃO + FAVORITOS */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setSortOpen((v) => !v)}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
            >
              <ArrowUpDown className="w-3 h-3" />
              {SORT_LABELS[sortBy]}
              <ChevronDown className={`w-3 h-3 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
            </button>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                <div className="absolute left-0 top-full mt-2 z-20 w-48 bg-[#1A1A1B] border border-white/10 rounded-xl overflow-hidden shadow-xl">
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => {
                        setSortBy(k);
                        setSortOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors ${
                        sortBy === k ? "text-[#00FF87]" : "text-white"
                      }`}
                    >
                      {SORT_LABELS[k]}
                      {k === "nearest" && !userCity && (
                        <span className="ml-2 text-[8px] font-bold text-muted-foreground normal-case">
                          (defina sua cidade)
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setSavedOnly((v) => !v)}
            className={`ml-auto px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
              savedOnly
                ? "bg-[#00FF87]/20 border-[#00FF87] text-[#00FF87]"
                : "bg-white/5 border-white/10 hover:border-white/20 text-white"
            }`}
            aria-pressed={savedOnly}
          >
            <Bookmark className={`w-3 h-3 ${savedOnly ? "fill-current" : ""}`} />
            Salvos
            <span
              className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${
                savedOnly ? "bg-[#00FF87] text-black" : "bg-white/10 text-white"
              }`}
            >
              {savedCount}
            </span>
          </button>
        </div>

        {/* LISTA */}
        <div className="space-y-4 pt-2">
          {visible.length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-xs font-medium">
              {savedOnly
                ? "Você ainda não salvou nenhum favorito."
                : "Nenhum resultado encontrado."}
            </div>
          )}
          {visible.map((vendor) => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              glassClass={glassClass}
              saved={saved.has(vendor.id)}
              onToggleSaved={() => toggleSaved(vendor.id)}
              onChat={() => openChat(vendor)}
              onProfile={() => openProfile(vendor)}
              onOpenLightbox={(index) => setLightbox({ vendor, index })}
            />
          ))}

          {hasMore && (
            <div ref={sentinelRef} className="py-8 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Carregando mais...
            </div>
          )}
          {!hasMore && visible.length > 0 && (
            <div className="py-8 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              — Fim do feed —
            </div>
          )}
        </div>
      </div>

      {lightbox && (
        <Lightbox
          vendor={lightbox.vendor}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onChange={(i) => setLightbox({ vendor: lightbox.vendor, index: i })}
        />
      )}

      {publishOpen && (
        <PublishModal
          userId={userId}
          onClose={() => setPublishOpen(false)}
          onPublished={handlePublished}
          glassClass={glassClass}
        />
      )}
    </div>
  );
}


// =============================================================================
// CARD
// =============================================================================

function VendorCard({
  vendor,
  glassClass,
  saved,
  onToggleSaved,
  onChat,
  onProfile,
  onOpenLightbox,
}: {
  vendor: Vendor;
  glassClass: string;
  saved: boolean;
  onToggleSaved: () => void;
  onChat: () => void;
  onProfile: () => void;
  onOpenLightbox: (index: number) => void;
}) {
  const [carouselIdx, setCarouselIdx] = useState(0);
  const isLoja = vendor.kind === "loja";

  return (
    <article className={`${glassClass} border border-white/10 rounded-3xl overflow-hidden bg-[#1A1A1B]`}>
      {/* Cabeçalho */}
      <div className="p-4 flex items-start gap-3">
        <div className="relative shrink-0">
          <img
            src={vendor.avatar}
            alt={vendor.name}
            className="w-12 h-12 rounded-xl border border-white/10 bg-black/40 object-cover"
          />
          {vendor.goldSeal && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-400 border-2 border-[#1A1A1B] flex items-center justify-center">
              <Award className="w-3 h-3 text-black" strokeWidth={3} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border flex items-center gap-1 ${
                isLoja
                  ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                  : "bg-[#00FF87]/10 text-[#00FF87] border-[#00FF87]/30"
              }`}
            >
              {isLoja ? <Store className="w-2.5 h-2.5" /> : <Wrench className="w-2.5 h-2.5" />}
              {isLoja ? "Lojista" : "Prestador"}
            </span>
            <div className="flex items-center gap-0.5 text-yellow-400">
              <Star className="w-3 h-3 fill-current" />
              <span className="text-[10px] font-black text-white">{vendor.rating.toFixed(1)}</span>
              <span className="text-[9px] text-muted-foreground font-bold">({vendor.reviews})</span>
            </div>
          </div>
          <h3 className="text-xs font-black text-white uppercase italic leading-tight truncate">
            {vendor.name}
          </h3>
          <div className="flex items-center gap-1 mt-0.5 text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
            <MapPin className="w-2.5 h-2.5" />
            {vendor.city}/{vendor.state}
          </div>
        </div>
      </div>

      {/* Headline */}
      <p className="px-4 pb-3 text-[11px] text-white/80 font-medium leading-relaxed">
        {vendor.headline}
      </p>

      {/* Galeria carrossel */}
      {vendor.gallery.length > 0 && (
        <div className="relative aspect-[16/10] bg-black/40 group">
          <img
            src={vendor.gallery[carouselIdx]}
            alt=""
            onClick={() => onOpenLightbox(carouselIdx)}
            className="w-full h-full object-cover cursor-zoom-in"
          />
          {vendor.gallery.length > 1 && (
            <>
              <button
                onClick={() =>
                  setCarouselIdx((i) => (i - 1 + vendor.gallery.length) % vendor.gallery.length)
                }
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCarouselIdx((i) => (i + 1) % vendor.gallery.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {vendor.gallery.map((_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === carouselIdx ? "bg-[#00FF87] w-4" : "bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Ações */}
      <div className="p-3 flex items-center gap-2 border-t border-white/5">
        <button
          onClick={onChat}
          className="flex-1 py-2.5 rounded-xl bg-[#00FF87] text-black font-black uppercase italic text-[10px] tracking-widest hover:shadow-[0_0_15px_rgba(0,255,135,0.4)] transition-all flex items-center justify-center gap-1.5"
        >
          <MessageSquare className="w-3 h-3" strokeWidth={3} />
          Solicitar Orçamento
        </button>
        <button
          onClick={onProfile}
          className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"
        >
          <UserIcon className="w-3 h-3" />
          Perfil
        </button>
        <button
          onClick={onToggleSaved}
          className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all shrink-0 ${
            saved
              ? "bg-[#00FF87]/20 border-[#00FF87] text-[#00FF87]"
              : "bg-white/5 border-white/10 hover:border-white/20 text-muted-foreground"
          }`}
          aria-label="Salvar favorito"
        >
          <Bookmark className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
        </button>
      </div>
    </article>
  );
}

// =============================================================================
// LIGHTBOX
// =============================================================================

function Lightbox({
  vendor,
  index,
  onClose,
  onChange,
}: {
  vendor: Vendor;
  index: number;
  onClose: () => void;
  onChange: (i: number) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onChange((index - 1 + vendor.gallery.length) % vendor.gallery.length);
      if (e.key === "ArrowRight") onChange((index + 1) % vendor.gallery.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, vendor.gallery.length, onClose, onChange]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center"
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={vendor.gallery[index]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-full object-contain rounded-2xl"
      />
      {vendor.gallery.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange((index - 1 + vendor.gallery.length) % vendor.gallery.length);
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChange((index + 1) % vendor.gallery.length);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
    </div>
  );
}

// =============================================================================
// PUBLISH MODAL
// =============================================================================

function PublishModal({
  userId,
  onClose,
  onPublished,
  glassClass,
}: {
  userId: string | null;
  onClose: () => void;
  onPublished?: () => void | Promise<void>;
  glassClass: string;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Montagem");
  const [city, setCity] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !details.trim()) {
      toast.error("Preencha o título e a descrição.");
      return;
    }
    if (!userId) {
      toast.error("Faça login para publicar.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabaseExternal.from("feed_posts").insert({
        title,
        content: details,
        category,
        location: city,
        author_id: userId,
        type: "b2c",
        metadata: { status: "active", source: "cliente_feed" },
      });
      if (error) throw error;
      toast.success("Necessidade publicada!", {
        description: "Você receberá orçamentos em breve.",
      });
      await onPublished?.();
      onClose();
    } catch (err: any) {
      console.error("[FeedCliente] publish error", err);
      toast.error("Não foi possível publicar.", {
        description: err.message ?? "Tente novamente em instantes.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`${glassClass} w-full max-w-md border border-white/10 rounded-3xl p-6 space-y-4 bg-[#1A1A1B]`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white uppercase italic flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#00FF87]" />
            Publicar Necessidade
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
              O que você precisa?
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Montar armário planejado"
              className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#00FF87] outline-none font-medium"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#00FF87] outline-none font-medium appearance-none"
              >
                <option>Montagem</option>
                <option>Planejados</option>
                <option>Assistência Técnica</option>
                <option>Reforma</option>
                <option>Outros</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                Cidade
              </label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Sorocaba/SP"
                className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#00FF87] outline-none font-medium"
              />
            </div>
          </div>
          <div>
            <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
              Descreva o serviço
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              placeholder="Descreva com detalhes o que precisa ser feito..."
              className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#00FF87] outline-none font-medium resize-none"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-[#00FF87] text-black font-black uppercase italic text-xs tracking-widest hover:shadow-[0_0_20px_rgba(0,255,135,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? "Publicando..." : "Publicar Agora"}
          {!loading && <Send className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}
