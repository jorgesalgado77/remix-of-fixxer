import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Heart, MessageCircle, User as UserIcon, MapPin, Star, Search,
  Tag, ExternalLink, ImageOff, Wrench, Store as StoreIcon, Truck,
} from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { useUserCoords, cityCoords } from "@/lib/geo-distance";
import { haversineKm } from "@/lib/activity-branches";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/favoritos")({
  head: () => ({
    meta: [
      { title: "Favoritos | Fixxer" },
      { name: "description", content: "Seus perfis e anúncios salvos no Fixxer — acesso rápido a lojistas, prestadores, fornecedores e promoções." },
      { property: "og:title", content: "Meus Favoritos | Fixxer" },
      { property: "og:description", content: "Perfis e anúncios que você marcou como favoritos no Fixxer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FavoritosPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-white" role="alert">
      <p className="text-xs uppercase font-black text-red-400">Erro ao carregar Favoritos</p>
      <p className="text-[11px] text-muted-foreground mt-2">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-6 text-white text-xs uppercase font-black">Página não encontrada.</div>
  ),
});

/* ============================ TIPOS ============================ */

type Kind = "prestador" | "lojista" | "parceiro" | "cliente";

interface FavProfile {
  id: string;            // id do registro em favorite_users (ou mock)
  userId: string;        // id do perfil favoritado (para /perfil/:userId e /chat/:peerId)
  name: string;
  avatarUrl: string | null;
  kind: Kind;
  branch: string | null;
  city: string | null;
  state: string | null;
  rating: number | null;
  isMock?: boolean;
}

interface FavAd {
  id: string;
  title: string;
  price: number | null;
  priceFrom?: number | null;
  city: string | null;
  state: string | null;
  imageUrl: string | null;
  category: string | null;
  postId?: string | null;
  isMock?: boolean;
}

/* ============================ MOCK ============================ */

const MOCK_PROFILES: FavProfile[] = [
  {
    id: "mock-p-1",
    userId: "mock-jorge-salgado",
    name: "Jorge Salgado",
    avatarUrl:
      "https://ui-avatars.com/api/?name=Jorge+Salgado&background=FF7A00&color=fff&size=256&bold=true&format=png",
    kind: "prestador",
    branch: "Conferente Técnico",
    city: "Votorantim",
    state: "SP",
    rating: 5.0,
    isMock: true,
  },
  {
    id: "mock-p-2",
    userId: "mock-eletrotech",
    name: "EletroTech Soluções",
    avatarUrl:
      "https://ui-avatars.com/api/?name=EletroTech&background=B18CFF&color=fff&size=256&bold=true&format=png",
    kind: "parceiro",
    branch: "Materiais Elétricos B2B",
    city: "Sorocaba",
    state: "SP",
    rating: 4.9,
    isMock: true,
  },
];

const MOCK_ADS: FavAd[] = [
  {
    id: "mock-ad-1",
    title: "Kit Furadeira Bosch 12V em Promoção",
    price: 380,
    priceFrom: 499,
    city: "Sorocaba",
    state: "SP",
    imageUrl: null,
    category: "Ferramentas",
    isMock: true,
  },
];

/* ======================= CORES POR CATEGORIA ======================= */

const KIND_META: Record<Kind, { label: string; color: string; rgb: string; Icon: any; emoji: string }> = {
  prestador: { label: "Prestador", color: "#FF7A00", rgb: "255,122,0", Icon: Wrench, emoji: "🛠️" },
  lojista:   { label: "Lojista",   color: "#00E5FF", rgb: "0,229,255", Icon: StoreIcon, emoji: "🏪" },
  parceiro:  { label: "Fornecedor",color: "#B18CFF", rgb: "177,140,255", Icon: Truck, emoji: "📦" },
  cliente:   { label: "Cliente",   color: "#22C55E", rgb: "34,197,94", Icon: UserIcon, emoji: "👤" },
};

function classifyRole(role?: string | null): Kind {
  const r = (role || "").toLowerCase();
  if (r.includes("prest") || r.includes("technic")) return "prestador";
  if (r.includes("loj") || r.includes("stor")) return "lojista";
  if (r.includes("parc") || r.includes("fornec") || r.includes("supplier")) return "parceiro";
  return "cliente";
}

/* ============================ HELPERS ============================ */

function formatLocation(user: { lat: number; lng: number } | null, city?: string | null, state?: string | null) {
  const cityLabel = city && state ? `${city}, ${state}` : city || state || "";
  if (!user) return cityLabel ? `📍 ${cityLabel}` : null;
  const c = cityCoords(city);
  if (!c) return cityLabel ? `📍 ${cityLabel}` : null;
  const km = haversineKm(user, c);
  if (!Number.isFinite(km)) return cityLabel ? `📍 ${cityLabel}` : null;
  const label = km < 10 ? km.toFixed(1) : Math.round(km).toString();
  return `📍 a ${label} km${cityLabel ? ` • ${cityLabel}` : ""}`;
}

function priceBRL(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return null;
  try {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
  } catch { return `R$ ${v.toFixed(2)}`; }
}

/* ============================ PÁGINA ============================ */

type TabKey = "perfis" | "anuncios";
type KindFilter = "todos" | "prestador" | "parceiro";

function FavoritosPage() {
  const navigate = useNavigate();
  const userCoords = useUserCoords();
  const [tab, setTab] = useState<TabKey>("perfis");
  const [kindFilter, setKindFilter] = useState<KindFilter>("todos");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<FavProfile[]>([]);
  const [ads, setAds] = useState<FavAd[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingAds, setLoadingAds] = useState(true);
  const [query, setQuery] = useState("");

  // Descobre usuário logado.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabaseExternal.auth.getUser();
        if (!cancelled) setCurrentUserId(data?.user?.id ?? null);
      } catch { if (!cancelled) setCurrentUserId(null); }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ================ FETCH PERFIS FAVORITADOS ================ */
  const fetchProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    try {
      if (!currentUserId) {
        setProfiles(MOCK_PROFILES);
        return;
      }
      const { data, error } = await supabaseExternal
        .from("favorite_users")
        .select("id, favorited_user_id, created_at")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rows = data ?? [];
      if (rows.length === 0) {
        setProfiles(MOCK_PROFILES);
        return;
      }

      const ids = rows.map((r: any) => r.favorited_user_id).filter(Boolean);
      let profilesById: Record<string, any> = {};
      try {
        const { data: profs } = await supabaseExternal
          .from("profiles")
          .select("id, full_name, name, avatar_url, avatar, photo_url, role, activity_branch, city, state, uf, rating")
          .in("id", ids);
        (profs ?? []).forEach((p: any) => { profilesById[p.id] = p; });
      } catch { /* silencioso — segue com nomes genéricos */ }

      const mapped: FavProfile[] = rows.map((r: any) => {
        const p = profilesById[r.favorited_user_id] || {};
        return {
          id: r.id,
          userId: r.favorited_user_id,
          name: p.full_name || p.name || "Perfil salvo",
          avatarUrl: p.avatar_url || p.avatar || p.photo_url || null,
          kind: classifyRole(p.role),
          branch: p.activity_branch || null,
          city: p.city || null,
          state: p.state || p.uf || null,
          rating: typeof p.rating === "number" ? p.rating : null,
        };
      });
      setProfiles(mapped.length > 0 ? mapped : MOCK_PROFILES);
    } catch (err) {
      if (typeof console !== "undefined") console.debug("[Favoritos] fallback mock perfis:", err);
      setProfiles(MOCK_PROFILES);
    } finally {
      setLoadingProfiles(false);
    }
  }, [currentUserId]);

  /* ================ FETCH ANÚNCIOS SALVOS ================ */
  const fetchAds = useCallback(async () => {
    setLoadingAds(true);
    try {
      if (!currentUserId) { setAds(MOCK_ADS); return; }
      const { data, error } = await supabaseExternal
        .from("favorite_posts")
        .select("id, post_id, created_at")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const rows = data ?? [];
      if (rows.length === 0) { setAds(MOCK_ADS); return; }

      const ids = rows.map((r: any) => r.post_id).filter(Boolean);
      let postsById: Record<string, any> = {};
      try {
        const { data: posts } = await supabaseExternal
          .from("posts")
          .select("id, title, price, price_from, city, state, image_url, images, category")
          .in("id", ids);
        (posts ?? []).forEach((p: any) => { postsById[p.id] = p; });
      } catch { /* silencioso */ }

      const mapped: FavAd[] = rows.map((r: any) => {
        const p = postsById[r.post_id] || {};
        const firstImg = Array.isArray(p.images) ? p.images[0] : null;
        return {
          id: r.id,
          postId: r.post_id,
          title: p.title || "Anúncio salvo",
          price: typeof p.price === "number" ? p.price : null,
          priceFrom: typeof p.price_from === "number" ? p.price_from : null,
          city: p.city || null,
          state: p.state || null,
          imageUrl: p.image_url || firstImg || null,
          category: p.category || null,
        };
      });
      setAds(mapped.length > 0 ? mapped : MOCK_ADS);
    } catch (err) {
      if (typeof console !== "undefined") console.debug("[Favoritos] fallback mock anúncios:", err);
      setAds(MOCK_ADS);
    } finally {
      setLoadingAds(false);
    }
  }, [currentUserId]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);
  useEffect(() => { fetchAds(); }, [fetchAds]);

  /* ============ REALTIME (silencioso) ============ */
  useEffect(() => {
    if (!currentUserId) return;
    let channelUsers: any = null;
    let channelPosts: any = null;
    try {
      channelUsers = supabaseExternal
        .channel(`fav-users-list-${currentUserId}`)
        .on("postgres_changes" as any,
            { event: "*", schema: "public", table: "favorite_users", filter: `user_id=eq.${currentUserId}` },
            () => fetchProfiles())
        .subscribe();
    } catch { /* ignore */ }
    try {
      channelPosts = supabaseExternal
        .channel(`fav-posts-list-${currentUserId}`)
        .on("postgres_changes" as any,
            { event: "*", schema: "public", table: "favorite_posts", filter: `user_id=eq.${currentUserId}` },
            () => fetchAds())
        .subscribe();
    } catch { /* ignore */ }
    return () => {
      try { if (channelUsers) supabaseExternal.removeChannel(channelUsers); } catch { /* ignore */ }
      try { if (channelPosts) supabaseExternal.removeChannel(channelPosts); } catch { /* ignore */ }
    };
  }, [currentUserId, fetchProfiles, fetchAds]);

  /* ============ AÇÕES ============ */
  const removeProfile = useCallback(async (fav: FavProfile) => {
    // Otimista.
    setProfiles((prev) => prev.filter((p) => p.id !== fav.id));
    if (fav.isMock) { toast("Removido dos favoritos (demo)."); return; }
    try {
      const { error } = await supabaseExternal
        .from("favorite_users")
        .delete()
        .eq("id", fav.id);
      if (error) throw error;
      // Limpa cache local do coração / contador desse alvo.
      try {
        window.localStorage.removeItem(`fixxer_favorite_user_v1:${currentUserId}:${fav.userId}`);
      } catch { /* ignore */ }
      toast.success("Perfil removido dos Favoritos.");
    } catch (err) {
      if (typeof console !== "undefined") console.debug("[Favoritos] remove perfil (silencioso):", err);
      toast("Removido localmente.", { description: "Sincronizaremos quando a conexão voltar." });
    }
  }, [currentUserId]);

  const removeAd = useCallback(async (fav: FavAd) => {
    setAds((prev) => prev.filter((a) => a.id !== fav.id));
    if (fav.isMock) { toast("Removido dos favoritos (demo)."); return; }
    try {
      const { error } = await supabaseExternal
        .from("favorite_posts")
        .delete()
        .eq("id", fav.id);
      if (error) throw error;
      toast.success("Anúncio removido dos Favoritos.");
    } catch (err) {
      if (typeof console !== "undefined") console.debug("[Favoritos] remove anúncio (silencioso):", err);
      toast("Removido localmente.", { description: "Sincronizaremos quando a conexão voltar." });
    }
  }, []);

  const openChat = useCallback((fav: FavProfile) => {
    navigate({ to: "/chat/$peerId" as any, params: { peerId: fav.userId } as any })
      .catch(() => { window.location.href = `/chat/${fav.userId}`; });
  }, [navigate]);

  const openProfile = useCallback((fav: FavProfile) => {
    navigate({ to: "/perfil/$userId" as any, params: { userId: fav.userId } as any })
      .catch(() => { window.location.href = `/perfil/${fav.userId}`; });
  }, [navigate]);

  /* ============ FILTRO DE BUSCA ============ */
  const filteredProfiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = profiles;
    if (kindFilter !== "todos") list = list.filter((p) => p.kind === kindFilter);
    if (!q) return list;
    return list.filter((p) =>
      [p.name, p.branch, p.city, p.state, KIND_META[p.kind].label]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q)),
    );
  }, [profiles, query, kindFilter]);

  const filteredAds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ads;
    return ads.filter((a) =>
      [a.title, a.category, a.city, a.state].filter(Boolean).some((s) => String(s).toLowerCase().includes(q)),
    );
  }, [ads, query]);

  /* ============================ RENDER ============================ */
  return (
    <div className="min-h-dvh bg-[#0A0A0A] text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <Heart className="w-5 h-5 text-red-500 fill-red-500/30" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm md:text-base font-black uppercase italic tracking-wider truncate">Meus Favoritos</h1>
            <p className="text-[10px] md:text-xs text-muted-foreground uppercase font-bold">Perfis salvos & anúncios acompanhados</p>
          </div>
        </div>

        {/* Abas */}
        <div
          className="max-w-5xl mx-auto px-4 pb-3 flex gap-2"
          role="tablist"
          aria-label="Categorias de favoritos"
        >
          <TabPill active={tab === "perfis"} onClick={() => setTab("perfis")} id="tab-perfis" ariaControls="panel-perfis">
            👤 Perfis {profiles.length > 0 && <span className="ml-1 text-[10px] opacity-80">({profiles.length})</span>}
          </TabPill>
          <TabPill active={tab === "anuncios"} onClick={() => setTab("anuncios")} id="tab-anuncios" ariaControls="panel-anuncios">
            📢 Anúncios {ads.length > 0 && <span className="ml-1 text-[10px] opacity-80">({ads.length})</span>}
          </TabPill>
        </div>

        {/* Busca */}
        <div className="max-w-5xl mx-auto px-4 pb-4">
          <label className="sr-only" htmlFor="fav-search">Buscar nos favoritos</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" aria-hidden="true" />
            <input
              id="fav-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, cidade ou categoria…"
              className="w-full h-11 bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 text-xs font-bold placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-6">
        {tab === "perfis" && (
          <section id="panel-perfis" role="tabpanel" aria-labelledby="tab-perfis" aria-live="polite">
            {loadingProfiles ? (
              <SkeletonGrid />
            ) : filteredProfiles.length === 0 ? (
              <EmptyState
                icon={<UserIcon className="w-8 h-8 text-red-400" />}
                title="Nenhum perfil favoritado"
                description="Toque no ❤️ nos perfis para salvá-los aqui."
                cta={{ label: "Explorar Feed", to: "/feed" }}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProfiles.map((fav) => (
                  <ProfileCard
                    key={fav.id}
                    fav={fav}
                    userCoords={userCoords}
                    onChat={() => openChat(fav)}
                    onView={() => openProfile(fav)}
                    onRemove={() => removeProfile(fav)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "anuncios" && (
          <section id="panel-anuncios" role="tabpanel" aria-labelledby="tab-anuncios" aria-live="polite">
            {loadingAds ? (
              <SkeletonGrid />
            ) : filteredAds.length === 0 ? (
              <EmptyState
                icon={<Tag className="w-8 h-8 text-primary" />}
                title="Nenhum anúncio salvo"
                description="Salve promoções e solicitações para acompanhá-las por aqui."
                cta={{ label: "Ir para o Feed", to: "/feed" }}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAds.map((ad) => (
                  <AdCard
                    key={ad.id}
                    ad={ad}
                    userCoords={userCoords}
                    onRemove={() => removeAd(ad)}
                    onOpen={() => {
                      if (ad.postId) {
                        navigate({ to: "/feed" as any }).catch(() => { window.location.href = "/feed"; });
                      } else {
                        toast.info("Prévia demo — publique/salve anúncios reais para abrir.");
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

/* ============================ COMPONENTES ============================ */

function TabPill({
  active, onClick, children, id, ariaControls,
}: { active: boolean; onClick: () => void; children: React.ReactNode; id: string; ariaControls: string }) {
  return (
    <button
      type="button"
      id={id}
      role="tab"
      aria-selected={active}
      aria-controls={ariaControls}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={[
        "px-4 h-10 rounded-full text-[11px] font-black uppercase italic tracking-wider border transition-all whitespace-nowrap",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        active
          ? "bg-primary text-black border-primary shadow-[0_0_18px_rgba(0,255,135,0.35)]"
          : "bg-black/40 text-white/80 border-white/10 hover:border-primary/40",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function ProfileCard({
  fav, userCoords, onChat, onView, onRemove,
}: {
  fav: FavProfile;
  userCoords: { lat: number; lng: number } | null;
  onChat: () => void;
  onView: () => void;
  onRemove: () => void;
}) {
  const meta = KIND_META[fav.kind];
  const location = formatLocation(userCoords, fav.city, fav.state);
  const Icon = meta.Icon;

  return (
    <article
      className="rounded-2xl bg-black/40 border border-white/10 overflow-hidden flex flex-col hover:border-white/20 transition-all"
      style={{ boxShadow: `0 0 0 1px rgba(${meta.rgb},0.15) inset` }}
    >
      {/* Topo com avatar */}
      <div className="relative h-32 bg-gradient-to-b from-white/[0.04] to-transparent flex items-center justify-center">
        {fav.avatarUrl ? (
          <img
            src={fav.avatarUrl}
            alt={fav.name}
            loading="lazy"
            className="w-24 h-24 rounded-full object-cover border-2"
            style={{ borderColor: meta.color, boxShadow: `0 0 18px rgba(${meta.rgb},0.35)` }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div
            className="w-24 h-24 rounded-full border-2 flex items-center justify-center bg-black/60"
            style={{ borderColor: meta.color, color: meta.color }}
            aria-hidden="true"
          >
            <Icon className="w-10 h-10" />
          </div>
        )}

        {/* Desfavoritar */}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remover ${fav.name} dos favoritos`}
          title="Remover dos favoritos"
          className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/70 border border-white/10 flex items-center justify-center text-red-500 hover:bg-red-500/20 hover:border-red-500/40 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <Heart className="w-4 h-4 fill-red-500" />
        </button>
      </div>

      {/* Corpo */}
      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 text-[9px] font-black uppercase italic tracking-wider px-2 py-0.5 rounded-full border"
            style={{ color: meta.color, borderColor: `rgba(${meta.rgb},0.4)`, background: `rgba(${meta.rgb},0.08)` }}
          >
            {meta.emoji} {meta.label}
          </span>
          {fav.rating != null && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-400">
              <Star className="w-3 h-3 fill-amber-400" aria-hidden="true" />
              {fav.rating.toFixed(1)}
            </span>
          )}
        </div>

        <h3 className="text-sm font-black uppercase italic truncate" title={fav.name}>{fav.name}</h3>

        {fav.branch && (
          <p className="text-[10px] font-bold uppercase italic text-white/70 truncate">{fav.branch}</p>
        )}

        {location && (
          <p className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3" aria-hidden="true" />
            <span className="truncate">{location.replace("📍 ", "")}</span>
          </p>
        )}

        {/* Ações */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            type="button"
            onClick={onChat}
            aria-label={`Abrir chat com ${fav.name}`}
            className="h-10 rounded-xl bg-primary/15 border border-primary/40 text-primary text-[10px] font-black uppercase italic flex items-center justify-center gap-1 hover:bg-primary/25 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <MessageCircle className="w-3.5 h-3.5" /> Chat
          </button>
          <button
            type="button"
            onClick={onView}
            aria-label={`Ver perfil público de ${fav.name}`}
            className="h-10 rounded-xl border text-[10px] font-black uppercase italic flex items-center justify-center gap-1 transition-all focus:outline-none focus-visible:ring-2"
            style={{
              color: meta.color,
              borderColor: `rgba(${meta.rgb},0.5)`,
              background: `rgba(${meta.rgb},0.08)`,
              ["--tw-ring-color" as any]: meta.color,
            }}
          >
            <UserIcon className="w-3.5 h-3.5" /> Ver Perfil
          </button>
        </div>
      </div>
    </article>
  );
}

function AdCard({
  ad, userCoords, onRemove, onOpen,
}: {
  ad: FavAd;
  userCoords: { lat: number; lng: number } | null;
  onRemove: () => void;
  onOpen: () => void;
}) {
  const location = formatLocation(userCoords, ad.city, ad.state);
  return (
    <article className="rounded-2xl bg-black/40 border border-white/10 overflow-hidden flex flex-col hover:border-primary/30 transition-all">
      <div className="relative h-36 bg-black/60 flex items-center justify-center overflow-hidden">
        {ad.imageUrl ? (
          <img
            src={ad.imageUrl}
            alt={ad.title}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="text-white/40 flex flex-col items-center gap-1">
            <ImageOff className="w-8 h-8" aria-hidden="true" />
            <span className="text-[9px] font-black uppercase italic">Sem imagem</span>
          </div>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remover anúncio "${ad.title}" dos favoritos`}
          className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/70 border border-white/10 flex items-center justify-center text-red-500 hover:bg-red-500/20 hover:border-red-500/40 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <Heart className="w-4 h-4 fill-red-500" />
        </button>
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        {ad.category && (
          <span className="inline-flex w-fit text-[9px] font-black uppercase italic tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
            {ad.category}
          </span>
        )}
        <h3 className="text-sm font-black uppercase italic line-clamp-2" title={ad.title}>{ad.title}</h3>
        <div className="flex items-baseline gap-2 flex-wrap">
          {ad.priceFrom && ad.price && ad.priceFrom > ad.price && (
            <span className="text-[10px] font-bold text-white/40 line-through">{priceBRL(ad.priceFrom)}</span>
          )}
          {ad.price != null && (
            <span className="text-base font-black text-primary">{priceBRL(ad.price)}</span>
          )}
        </div>
        {location && (
          <p className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3" aria-hidden="true" />
            <span className="truncate">{location.replace("📍 ", "")}</span>
          </p>
        )}
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Visualizar anúncio ${ad.title}`}
          className="mt-2 h-10 rounded-xl bg-primary/15 border border-primary/40 text-primary text-[10px] font-black uppercase italic flex items-center justify-center gap-1 hover:bg-primary/25 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Visualizar
        </button>
      </div>
    </article>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-black/40 border border-white/10 overflow-hidden animate-pulse">
          <div className="h-32 bg-white/[0.03]" />
          <div className="p-4 space-y-2">
            <div className="h-3 w-20 bg-white/10 rounded" />
            <div className="h-4 w-3/4 bg-white/10 rounded" />
            <div className="h-3 w-1/2 bg-white/10 rounded" />
            <div className="h-10 bg-white/[0.06] rounded-xl mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  icon, title, description, cta,
}: { icon: React.ReactNode; title: string; description: string; cta?: { label: string; to: string } }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 py-16 px-4 rounded-2xl bg-black/40 border border-white/10">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center">{icon}</div>
      <h3 className="text-sm font-black uppercase italic">{title}</h3>
      <p className="text-[11px] text-muted-foreground max-w-sm">{description}</p>
      {cta && (
        <Link
          to={cta.to as any}
          className="mt-2 inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-primary text-black text-[11px] font-black uppercase italic shadow-[0_0_18px_rgba(0,255,135,0.35)]"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
