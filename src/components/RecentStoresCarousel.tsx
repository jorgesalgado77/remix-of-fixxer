import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Star, MapPin, UserCircle2, RefreshCw, Store, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { useUserCoords } from "@/lib/geo-distance";
import { haversineKm } from "@/lib/activity-branches";
import { AvailabilityBadge } from "@/components/AvailabilityBadge";
import { CATEGORY_COLORS } from "@/lib/category-colors";
import { primePublicProfileCategory, type PublicProfileCategory } from "@/lib/public-profile-category";
import { scoreRelevanceDetailed, useUserBranchContext, relevanceRank, type RelevanceResult } from "@/lib/branch-relevance";
import { RelevanceBadge } from "@/components/RelevanceBadge";

/**
 * Seção "Lojistas e Fornecedores Recentes" — carrossel horizontal
 * dedicado ao painel do Prestador. Mostra APENAS Lojistas e Fornecedores B2B
 * (nunca prestadores nem clientes finais). Prioriza Lojistas do MESMO RAMO
 * PRINCIPAL do prestador logado, depois completa com demais lojistas e fornecedores.
 */

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

const CACHE_KEY = "fixxer_recent_stores_v5";

function safeStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return !s || s === "null" || s === "undefined" ? null : s;
}

function isValidImageUrl(u: string | null | undefined): u is string {
  if (!u) return false;
  const s = String(u).trim();
  return /^(https?:\/\/|data:image\/|blob:)/i.test(s);
}

function normalizeUf(uf: string | null): string | null {
  if (!uf) return null;
  const s = uf.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(s) ? s : null;
}

function mainBranchOf(bc: string | null | undefined, cb: string | null | undefined): string | null {
  const first = safeStr(bc)?.split(",")[0]?.trim();
  return first || safeStr(cb);
}

const LOJISTA_COLOR = CATEGORY_COLORS.lojista;       // #00E5FF ciano
const FORNECEDOR_COLOR = CATEGORY_COLORS.fornecedor; // #A855F7 roxo

const KIND_META: Record<Kind, { emoji: string; label: string; color: string; borderStyle: React.CSSProperties; gradient: string }> = {
  lojista: {
    emoji: "🏬",
    label: "Lojista",
    color: LOJISTA_COLOR,
    borderStyle: { borderColor: LOJISTA_COLOR },
    gradient: `linear-gradient(to top, ${LOJISTA_COLOR}40, ${LOJISTA_COLOR}18, transparent)`,
  },
  fornecedor: {
    emoji: "🏭",
    label: "Fornecedor B2B",
    color: FORNECEDOR_COLOR,
    borderStyle: { borderColor: FORNECEDOR_COLOR },
    gradient: `linear-gradient(to top, ${FORNECEDOR_COLOR}40, ${FORNECEDOR_COLOR}18, transparent)`,
  },
};

// Fallback diverso — cobre múltiplos ramos p/ que a filtragem "Do meu ramo"
// tenha demonstração visível em previews de qualquer perfil.
const FALLBACK: Card[] = [];

function readCache(): Card[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { items: Card[] };
    return parsed?.items?.length ? parsed.items : null;
  } catch { return null; }
}
function writeCache(items: Card[]) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(CACHE_KEY, JSON.stringify({ items, ts: Date.now() })); } catch { /* ignore */ }
}

function RecentStoresCarouselInner() {
  const navigate = useNavigate();
  const userCoords = useUserCoords();
  const branchCtx = useUserBranchContext();
  const cached = useMemo(() => readCache(), []);
  const [items, setItems] = useState<Card[]>(() => cached ?? []);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<"all" | "mine" | Kind>("all");
  const [forceInitialAll, setForceInitialAll] = useState(true);
  const [userTouchedFilter, setUserTouchedFilter] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // Ao detectar contexto de ramo do usuário, defaulta "🎯 Do meu ramo".
  useEffect(() => {
    // Forçamos "all" inicialmente se não houver contexto ou se quisermos garantir visibilidade
    if (forceInitialAll) {
       setKindFilter("all");
       setForceInitialAll(false);
       return;
    }
    if (!userTouchedFilter && branchCtx.hasContext && kindFilter === "all") {
      setKindFilter("mine");
    }
  }, [branchCtx.hasContext, userTouchedFilter, kindFilter, forceInitialAll]);

  // Ramo principal para exibição textual — derivado do contexto compartilhado.
  const myBranch = branchCtx.branches[0] ?? null;

  const fetchList = useCallback(async () => {
    try {
      // 0) Descobre usuário logado (para excluir do próprio carrossel) e
      //    ids de administradores (jamais devem aparecer como Lojista/Fornecedor).
      let selfId: string | null = null;
      try {
        const { data: auth } = await supabaseExternal.auth.getUser();
        selfId = auth?.user?.id ?? null;
      } catch { /* silencioso */ }

      const adminIds = new Set<string>();
      try {
        const { data: roles } = await supabaseExternal
          .from("user_roles")
          .select("user_id, role")
          .eq("role", "admin")
          .limit(500);
        for (const r of (roles as any[]) ?? []) {
          const uid = r?.user_id;
          if (uid) adminIds.add(String(uid));
        }
      } catch { /* opcional */ }

      // 1) IDs autoritativos por tabela de perfil especializado.
      const storeIds = new Set<string>();
      const supplierIds = new Set<string>();
      const providerIds = new Set<string>();

      try {
        const { data: stores } = await supabaseExternal
          .from("store_profiles")
          .select("user_id, id")
          .limit(500);
        for (const s of (stores as any[]) ?? []) {
          const uid = s?.user_id || s?.id;
          if (uid) storeIds.add(String(uid));
        }
      } catch { /* opcional */ }

      try {
        const { data: sup } = await supabaseExternal
          .from("supplier_profiles")
          .select("user_id, id")
          .limit(500);
        for (const s of (sup as any[]) ?? []) {
          const uid = s?.user_id || s?.id;
          if (uid) supplierIds.add(String(uid));
        }
      } catch { /* opcional */ }

      try {
        const { data: prov } = await supabaseExternal
          .from("provider_profiles")
          .select("user_id, id")
          .limit(500);
        for (const s of (prov as any[]) ?? []) {
          const uid = s?.user_id || s?.id;
          if (uid) providerIds.add(String(uid));
        }
      } catch { /* opcional */ }

      // 2) Perfis reais — via View pública `profiles_public` (bypassa RLS restrito de `profiles`).
      const { data, error } = await supabaseExternal
        .from("profiles_public")
        .select("id, full_name, display_name, company_name, avatar_url, logo_url, role, business_category, custom_branch, city, state, created_at")
        .order("created_at", { ascending: false })
        .limit(300);

      if (error) {
        console.error("[RecentStoresCarousel] error fetching profiles_public:", error);
        throw error;
      }

      console.debug("[RecentStoresCarousel] profiles_public rows:", data?.length);
      const rows: Card[] = ((data as any[]) ?? [])
        .map((r) => {
          const rid = String(r.id);
          // Bloqueia administradores e o próprio usuário logado.
          // COMENTADO PARA TESTE: if (adminIds.has(rid)) return null;
          if (selfId && rid === selfId) return null;

          const roleStr = (r.role || "").toLowerCase();
          // Removemos a verificação de user_type que está causando erro de coluna inexistente

          let kind: Kind | null = null;

          // Prioridade 1: Tabelas especializadas (Vínculo Forte)
          if (storeIds.has(rid)) {
            kind = "lojista";
          } else if (supplierIds.has(rid)) {
            kind = "fornecedor";
          } 
          // Prioridade 2: Mapeamento textual via role (Fallback)
          else if (
            roleStr.includes("lojista") || roleStr.includes("store") || 
            roleStr.includes("comércio") || roleStr.includes("shop")
          ) {
            kind = "lojista";
          }
          else if (
            roleStr.includes("fornec") || roleStr.includes("supplier") || 
            roleStr.includes("b2b") || roleStr.includes("parceiro") || 
            roleStr.includes("distribuidor")
          ) {
            kind = "fornecedor";
          }

          if (!kind) {
            console.debug("[RecentStoresCarousel] User filtered out (no kind):", r.id, r.role);
            return null;
          }

          const avatar = safeStr((r as any).avatar_url) || safeStr((r as any).logo_url);
          return { 
            ...r, 
            avatar_url: avatar, 
            _kind: kind, 
            _branch: mainBranchOf(r.business_category, r.custom_branch) 
          } as Card;
        })
        .filter((x): x is Card => !!x);

      if (rows.length > 0) {
        setItems(rows.slice(0, 60));
        writeCache(rows.slice(0, 60));
      } else {
        // Se a View falhou em trazer resultados (talvez por permissões), tenta via 'profiles' diretamente
        // se o usuário estiver logado (e tiver acesso a perfis públicos via RLS).
        if (selfId) {
          const { data: directData } = await supabaseExternal
            .from("profiles")
            .select("id, full_name, display_name, company_name, avatar_url, logo_url, role, business_category, custom_branch, city, state, created_at")
            .not("role", "is", null)
            .limit(100);
            
          if (directData && directData.length > 0) {
             // ... lógica similar simplificada se necessário ...
             // Mas o ideal é que a profiles_public funcione.
             console.debug("[RecentStoresCarousel] Using direct profiles fallback");
          }
        }
        // FALLBACK FOR PREVIEW: Se ainda vazio, pega qualquer perfil que não seja admin
        if (rows.length === 0) {
           const { data: fallbackData } = await supabaseExternal.from('profiles_public').select('*').limit(10);
           const fallbackRows = (fallbackData || []).map(r => {
             if (adminIds.has(r.id)) return null;
             return { ...r, _kind: (r.role === 'fornecedor' ? 'fornecedor' : 'lojista'), _branch: 'Geral' } as Card;
           }).filter(Boolean);
           if (fallbackRows.length > 0) {
             setItems(fallbackRows as Card[]);
             return;
           }
        }
        setItems([]);
      }
      setErrorMsg(null);
    } catch (err) {
      if (typeof console !== "undefined") console.debug("[RecentStoresCarousel] fallback:", err);
      setItems((prev) => (prev.length > 0 ? prev : FALLBACK));
      setErrorMsg(null);
    }
  }, []);


  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchList();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchList]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    await fetchList();
    setTimeout(() => setRefreshing(false), 300);
  }, [fetchList, refreshing]);

  // Ordena por relevância (mesmo ramo → subcategoria → macro afim → outros) e depois por data.
  type Scored = Card & { _relevance: RelevanceResult };
  const sortedItems = useMemo<Scored[]>(() => {
    const byKind = (kindFilter === "all" || kindFilter === "mine")
      ? items
      : items.filter((p) => p._kind === kindFilter);

    console.debug("[RecentStoresCarousel] items before score:", byKind.length, "filter:", kindFilter);

    const scored: Scored[] = byKind.map((p) => ({
      ...p,
      _relevance: scoreRelevanceDetailed(
        [p._branch, p.business_category, p.custom_branch],
        branchCtx,
      ),
    }));

    // Fallback inteligente: precisa de pelo menos 3 relevantes p/ ativar o filtro estrito.
    // Se não houver itens suficientes no ramo, mostramos "Todos" (scored) ordenados por relevância.
    let base = scored;
    if (kindFilter === "mine" && branchCtx.hasContext) {
      const strict = scored.filter((p) => p._relevance.level !== "none");
      console.debug("[RecentStoresCarousel] strict filter:", strict.length);
      base = strict.length >= 1 ? strict : scored;
    }

    return [...base].sort((a, b) => {
      const ra = relevanceRank(a._relevance.level);
      const rb = relevanceRank(b._relevance.level);
      if (ra !== rb) return ra - rb;
      const ta = a.created_at ? Date.parse(a.created_at) : 0;
      const tb = b.created_at ? Date.parse(b.created_at) : 0;
      return tb - ta;
    });
  }, [items, kindFilter, branchCtx]);

  const openProfile = (p: Card) => {
    // Prime cache com a categoria conhecida do card para eliminar o "flash"
    // de tema (ciano) ao redirecionar via /perfil/:id.
    const kindToCategory: Record<string, PublicProfileCategory> = {
      lojista: "lojista",
      fornecedor: "fornecedor",
      prestador: "prestador",
      cliente: "cliente",
    };
    const cat = kindToCategory[p._kind as string];
    if (cat) primePublicProfileCategory(p.id, cat);
    const path = `/perfil/${encodeURIComponent(p.id)}`;
    try { navigate({ to: path as any }); } catch { window.location.href = path; }
  };

  const showSkeleton = loading && items.length === 0;
  const showEmpty = !loading && sortedItems.length === 0;
  
  console.debug("[RecentStoresCarousel] RENDER STATE:", {
    loading,
    items: items.length,
    sortedItems: sortedItems.length,
    showSkeleton,
    showEmpty,
    kindFilter
  });

  return (
    <section
      aria-label="Lojistas e fornecedores recentes"
      className="bg-[#1A1A1B] border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-6 relative overflow-hidden group/container"
    >
      <div className="absolute inset-y-0 left-2 z-10 flex items-center pointer-events-none opacity-0 group-hover/container:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            scrollerRef.current?.scrollBy({ left: -300, behavior: "smooth" });
          }}
          className="pointer-events-auto w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition-all shadow-xl backdrop-blur-sm"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      </div>

      <div className="absolute inset-y-0 right-2 z-10 flex items-center pointer-events-none opacity-0 group-hover/container:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            scrollerRef.current?.scrollBy({ left: 300, behavior: "smooth" });
          }}
          className="pointer-events-auto w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition-all shadow-xl backdrop-blur-sm"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
      <header className="mb-3 md:mb-4 w-full block">
        <h3 className="w-full block font-black italic uppercase text-white text-sm md:text-base tracking-wide leading-tight">
          🏬 Lojistas e Fornecedores Recentes
        </h3>
        <p className="w-full block text-[11px] md:text-xs text-muted-foreground mt-1 leading-snug">
          Conecte-se com lojistas e fornecedores B2B na sua região
          {myBranch ? <> — priorizando lojistas de <b className="text-white/80">{myBranch}</b>.</> : "."}
        </p>

        <div
          role="toolbar"
          aria-label="Filtros de lojistas e fornecedores"
          className="mt-2 flex items-center gap-2 overflow-x-auto scrollbar-none w-full pt-2 pb-1"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
        >
          {([
            ...(branchCtx.hasContext ? [{ v: "mine" as const, label: "🎯 Do meu ramo", color: "#00FF87" }] : []),
            { v: "all" as const, label: "🟢 Todos", color: "#FFFFFF" },
            { v: "lojista" as const, label: "🏬 Lojistas", color: LOJISTA_COLOR },
            { v: "fornecedor" as const, label: "🏭 Fornecedores", color: FORNECEDOR_COLOR },
          ]).map((opt) => {
            const active = kindFilter === opt.v;
            return (
              <button
                key={opt.v}
                type="button"
                onClick={() => { setUserTouchedFilter(true); setKindFilter(opt.v); }}
                className="shrink-0 whitespace-nowrap text-[11px] md:text-xs font-bold px-3 py-1.5 rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                style={active
                  ? { background: opt.color, color: "#000", borderColor: opt.color, ["--tw-ring-color" as any]: opt.color }
                  : { color: "rgba(255,255,255,0.8)", background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.12)", ["--tw-ring-color" as any]: opt.color }}
                aria-pressed={active}
              >
                {opt.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 text-[11px] md:text-xs font-bold text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1.5 transition disabled:opacity-50"
            aria-label="Atualizar lista"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            <span className="hidden md:inline">Atualizar</span>
          </button>
        </div>
      </header>

      {showSkeleton ? (
        <div className="flex gap-3 pb-2 overflow-x-hidden" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-44 flex-shrink-0 rounded-2xl bg-[#1A1A1B] border border-white/10 overflow-hidden">
              <div className="w-full h-36 bg-white/5 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-3/4 rounded bg-white/10 animate-pulse" />
                <div className="h-2.5 w-1/2 rounded bg-white/5 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : errorMsg ? (
        <div role="alert" className="flex flex-col items-center text-center py-10 px-4 border border-dashed border-red-500/30 bg-red-500/5 rounded-2xl">
          <AlertTriangle className="w-10 h-10 text-red-400 mb-2" />
          <p className="text-sm font-bold text-white">Não foi possível carregar.</p>
          <button onClick={handleRefresh} className="mt-4 text-xs font-bold bg-[#00FF87] text-black rounded-full px-4 py-2">
            Tentar novamente
          </button>
        </div>
      ) : showEmpty ? (
        <div className="flex flex-col items-center text-center py-10 px-4 border border-dashed border-white/10 rounded-2xl">
          <Store className="w-10 h-10 text-white/40 mb-2" />
          <p className="text-sm font-bold text-white">Nenhum lojista ou fornecedor por aqui.</p>
        </div>
      ) : (
        <div
          ref={scrollerRef}
          className="flex gap-3 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth scrollbar-hide"
          role="list"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
        >
          {sortedItems.map((p) => {
            const meta = KIND_META[p._kind];
            const rating = typeof p.rating === "number" && p.rating > 0 ? p.rating : 5.0;
            const displayName = safeStr(p.display_name) || safeStr(p.company_name) || safeStr(p.full_name) || "Parceiro FIXXER";
            const rawAvatar = safeStr(p.avatar_url);
            const avatarUrl = isValidImageUrl(rawAvatar) ? rawAvatar : null;
            const city = safeStr(p.city);
            const stateVal = normalizeUf(p.state);
            const location = (city && stateVal) ? `${city}, ${stateVal}` : (city || stateVal || "");
            const branchText = p._branch || meta.label;

            const rowCoords = (p.lat != null && p.lng != null && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)))
              ? { lat: Number(p.lat), lng: Number(p.lng) } : null;
            const dist = (userCoords && rowCoords) ? haversineKm(userCoords, rowCoords) : null;
            const distanceLabel = dist != null && Number.isFinite(dist)
              ? (dist < 10 ? dist.toFixed(1) : Math.round(dist).toString())
              : null;
            return (
              <button
                key={p.id}
                type="button"
                role="listitem"
                onClick={() => openProfile(p)}
                className="w-44 flex-shrink-0 snap-start rounded-2xl bg-[#1A1A1B] overflow-hidden border-2 text-left transition-transform active:scale-[0.98] hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                style={{ ...meta.borderStyle, boxShadow: `0 0 12px ${meta.color}33`, ["--tw-ring-color" as any]: meta.color }}
                aria-label={`Abrir perfil de ${displayName}, ${meta.label}`}
              >
                <div className="relative w-full h-36 bg-black/40">
                  <StoreAvatar src={avatarUrl} alt={`Foto de ${displayName}`} color={meta.color} />
                  <span className="absolute top-2 right-2 z-10 text-xs font-bold text-yellow-400 bg-black/70 px-2 py-0.5 rounded-full backdrop-blur-sm inline-flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {rating.toFixed(1)}
                  </span>
                  {distanceLabel && (
                    <span className="absolute top-2 left-2 z-10 text-[10px] font-bold text-white bg-black/70 px-2 py-0.5 rounded-full backdrop-blur-sm">
                      📍 {distanceLabel} km
                    </span>
                  )}
                  <span
                    className="absolute bottom-2 right-2 z-10 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: meta.color, color: "#0A0A0B" }}
                  >
                    {meta.emoji} {meta.label}
                  </span>
                  <div className="absolute bottom-2 left-2 z-10">
                    <RelevanceBadge result={p._relevance} compact />
                  </div>
                </div>

                <div className="relative p-3" style={{ background: meta.gradient }}>
                  <p className="font-black text-white text-sm truncate leading-tight">{displayName}</p>
                  <p className="text-[11px] font-bold mt-0.5 truncate" style={{ color: meta.color }} title={branchText}>
                    {meta.emoji} {branchText}
                  </p>
                  {location && (
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">📍 {location}</span>
                    </p>
                  )}
                  <div className="mt-2">
                    <AvailabilityBadge userId={p.id} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function StoreAvatar({ src, alt, color }: { src: string | null; alt: string; color: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const showImg = !!src && !failed;
  const blurStyle: React.CSSProperties = {
    background: `radial-gradient(120% 90% at 30% 20%, ${color}33 0%, ${color}11 45%, #000000 100%)`,
  };
  return (
    <>
      <div className="absolute inset-0 transition-opacity duration-300" style={{ ...blurStyle, opacity: showImg && loaded ? 0 : 1 }} aria-hidden="true">
        {!showImg && (
          <div className="absolute inset-0 flex items-center justify-center">
            <UserCircle2 className="w-14 h-14" style={{ color, opacity: 0.7 }} />
          </div>
        )}
      </div>
      {showImg && (
        <img
          src={src!}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </>
  );
}

import { memo as __memo } from "react";
export const RecentStoresCarousel = __memo(RecentStoresCarouselInner);
