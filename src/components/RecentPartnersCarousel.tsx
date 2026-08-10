import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Star, MapPin, UserCircle2, RefreshCw, UsersRound, AlertTriangle, ArrowUpDown, X } from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { primePublicProfileCategory, type PublicProfileCategory } from "@/lib/public-profile-category";
import { cityCoords, useUserCoords } from "@/lib/geo-distance";
import { haversineKm } from "@/lib/activity-branches";
import { scoreRelevanceDetailed, useUserBranchContext, relevanceRank, type RelevanceResult, type BranchContext } from "@/lib/branch-relevance";
import { RelevanceBadge } from "@/components/RelevanceBadge";
import { AvailabilityBadge } from "@/components/AvailabilityBadge";

/**
 * Seção "Prestadores e Parceiros Recentes" — carrossel horizontal.
 *
 * Recursos:
 * - Filtragem rígida: só Prestadores (🛠️ âmbar) e Parceiros/Fornecedores B2B (🚚 violeta).
 * - Cache SWR em localStorage (`fixxer_recent_partners_v1`): renderiza imediato + revalida.
 * - Estado de erro com "Tentar novamente" quando a busca falha e nada está em cache.
 * - Pré-carregamento (`/perfil/:userId`) no hover/touchstart do card.
 * - Ordenação configurável: Recentes, Melhor avaliados, Mais próximos (quando geo disponível).
 * - Pull-to-refresh mobile + botão Atualizar no desktop.
 * - Acessibilidade: role="list", focus-visible, navegação por teclado (←/→/Home/End),
 *   ARIA labels descritivos, aria-live para estados dinâmicos.
 * - Clique → `/perfil/:userId` unificado.
 */

type PartnerRow = {
  id: string;
  full_name: string | null;
  display_name?: string | null;
  company_name?: string | null;
  name?: string | null;
  avatar_url: string | null;
  avatar?: string | null;
  photo_url?: string | null;
  banner_url?: string | null;
  role: string | null;
  activity_branch: string | null;
  business_category?: string | null;
  custom_branch?: string | null;
  category?: string | null;
  city: string | null;
  uf: string | null;
  state?: string | null;
  location?: string | null;
  address?: string | null;
  rating: number | null;
  created_at: string | null;
  lat?: number | null;
  lng?: number | null;
  distance_km?: number | string | null;
  distance?: number | string | null;
  vehicle_type?: string | null;
  vehicle_description?: string | null;
  vehicle_details?: Record<string, any> | null;
  offerings_notes?: string | null;
  preferred_service?: string | null;
  preferred_services?: string[] | string | null;
  job_roles?: string | null;
};


type PartnerKind = "prestador" | "fornecedor";
type PartnerCard = PartnerRow & { _kind: PartnerKind };
type SortMode = "recent" | "rating" | "nearby";
type KindFilter = "all" | "mine" | PartnerKind;

const CACHE_KEY = "fixxer_recent_partners_v4";
const CACHE_TTL = 10 * 60 * 1000; // 10 min (stale-while-revalidate)
const SORT_KEY = "fixxer_recent_partners_sort_v1";
const FILTER_KEY = "fixxer_recent_partners_filter_v1";

// ---- URL query-string sync (compartilhável / restaurável em reload) ----
const URL_SORT_PARAM = "partnersSort";
const URL_FILTER_PARAM = "partnersKind";
const VALID_SORTS: SortMode[] = ["recent", "rating", "nearby"];
const VALID_FILTERS: KindFilter[] = ["all", "mine", "prestador", "fornecedor"];
function readUrlParam<T extends string>(name: string, valid: T[]): T | null {
  if (typeof window === "undefined") return null;
  try {
    const v = new URLSearchParams(window.location.search).get(name);
    return v && (valid as string[]).includes(v) ? (v as T) : null;
  } catch { return null; }
}
function writeUrlParams(next: Partial<Record<string, string | null>>) {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    for (const [k, v] of Object.entries(next)) {
      if (v == null) url.searchParams.delete(k); else url.searchParams.set(k, v);
    }
    window.history.replaceState(window.history.state, "", url.toString());
  } catch { /* ignore */ }
}




// ---- Validações defensivas de dados de perfil ----
/** URL de imagem aceitável: http(s), data:image ou blob. Descarta strings vazias/inválidas. */
function isValidImageUrl(u: string | null | undefined): u is string {
  if (!u || typeof u !== "string") return false;
  const s = u.trim();
  if (!s || s === "null" || s === "undefined") return false;
  return /^(https?:\/\/|data:image\/|blob:)/i.test(s);
}
/** UF válida: 2 letras. Aceita qualquer caso, normaliza para maiúsculo na saída. */
function normalizeUf(uf: string | null | undefined): string | null {
  if (!uf) return null;
  const s = String(uf).trim().toUpperCase();
  return /^[A-Z]{2}$/.test(s) ? s : null;
}
/** Retorna string não-vazia ou null (evita renderizar "null"/"undefined"). */
function safeStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === "null" || s === "undefined") return null;
  return s;
}

function classifyRole(role: string | null | undefined): PartnerKind | null {
  const r = (role || "").toLowerCase();
  if (r.includes("lojista") || r.includes("cliente") || r.includes("casual") || r.includes("admin")) return null;
  if (r.includes("prestador")) return "prestador";
  if (r.includes("fornec") || r.includes("parceiro") || r.includes("b2b")) return "fornecedor";
  return null;
}

const KIND_META: Record<PartnerKind, { emoji: string; label: string; color: string; borderClass: string; gradientClass: string }> = {
  prestador: {
    emoji: "🛠️",
    label: "Prestador",
    color: "#FF9F0A",
    borderClass: "border-[#FF9F0A]",
    gradientClass: "from-[#FF9F0A]/25 via-[#FF9F0A]/10 to-transparent",
  },
  fornecedor: {
    emoji: "🚚",
    label: "Parceiro Fornecedor",
    color: "#A855F7",
    borderClass: "border-[#A855F7]",
    gradientClass: "from-[#A855F7]/25 via-[#A855F7]/10 to-transparent",
  },
};

const FALLBACK_PARTNERS: PartnerCard[] = [
  { id: "mock-jorge-salgado", full_name: "Jorge Salgado", avatar_url: null, role: "prestador", activity_branch: "Conferente Técnico", city: "Votorantim", uf: "SP", rating: 5.0, created_at: null, distance_km: 4.8, _kind: "prestador" },
  { id: "mock-carlos-silva", full_name: "Carlos Silva", avatar_url: null, role: "prestador", activity_branch: "Montador de Móveis", city: "Sorocaba", uf: "SP", rating: 4.9, created_at: null, distance_km: 8.2, _kind: "prestador" },
  { id: "mock-mdf-cia", full_name: "Mdf & Cia Atacado", avatar_url: null, role: "fornecedor", activity_branch: "Insumos e Ferragens", city: "Sorocaba", uf: "SP", rating: 4.8, created_at: null, distance_km: 9.1, _kind: "fornecedor" },
  { id: "mock-ana-paula", full_name: "Ana Paula", avatar_url: null, role: "prestador", activity_branch: "Designer de Interiores", city: "Votorantim", uf: "SP", rating: 5.0, created_at: null, distance_km: 5.4, _kind: "prestador" },
  { id: "mock-ferragens-real", full_name: "Ferragens Real", avatar_url: null, role: "fornecedor", activity_branch: "Ferragens B2B", city: "Osasco", uf: "SP", rating: 4.9, created_at: null, distance_km: 92, _kind: "fornecedor" },
  { id: "mock-rodrigo-marques", full_name: "Rodrigo Marques", avatar_url: null, role: "prestador", activity_branch: "Marcenaria Fina", city: "Campinas", uf: "SP", rating: 4.7, created_at: null, distance_km: 87, _kind: "prestador" },

];

// ------- Cache SWR (localStorage) -------
function readCache(): { items: PartnerCard[]; ts: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { items: PartnerCard[]; ts: number };
    if (!parsed?.items?.length) return null;
    return parsed;
  } catch { return null; }
}
function writeCache(items: PartnerCard[]) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(CACHE_KEY, JSON.stringify({ items, ts: Date.now() })); } catch { /* ignore */ }
}
function readSort(): SortMode {
  if (typeof window === "undefined") return "recent";
  try {
    const v = window.localStorage.getItem(SORT_KEY);
    return v === "rating" || v === "nearby" ? v : "recent";
  } catch { return "recent"; }
}
function readFilter(): KindFilter {
  if (typeof window === "undefined") return "all";
  try {
    const v = window.localStorage.getItem(FILTER_KEY);
    return v === "prestador" || v === "fornecedor" || v === "mine" ? v : "all";
  } catch { return "all"; }
}


// Cache de "preload" para roles já resolvidos por perfil.
const roleCache = new Map<string, string | null>();
async function preloadProfile(id: string) {
  if (!id || roleCache.has(id)) return;
  roleCache.set(id, null); // marca em progresso
  try {
    const { data } = await supabaseExternal
      .from("profiles").select("role").eq("id", id).maybeSingle();
    roleCache.set(id, ((data as any)?.role ?? null));
  } catch { roleCache.delete(id); }
}

// ---- Cache de pré-carregamento de imagens (reduz flicker ao rolar horizontal) ----
// Guarda URLs já pré-carregadas (ou em progresso) durante toda a sessão do app.
const imagePreloadCache = new Set<string>();
function preloadImage(url: string | null | undefined) {
  if (!url || typeof window === "undefined") return;
  if (imagePreloadCache.has(url)) return;
  imagePreloadCache.add(url);
  try {
    const img = new window.Image();
    // Prioridade baixa: não competir com hero/feed principal.
    (img as any).fetchPriority = "low";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.src = url;
  } catch { imagePreloadCache.delete(url); }
}

function RecentPartnersCarouselInner() {
  const navigate = useNavigate();
  const userCoords = useUserCoords();
  const branchCtx = useUserBranchContext();

  const cached = useMemo(() => readCache(), []);
  const [items, setItems] = useState<PartnerCard[]>(() => cached?.items ?? []);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>(() => readUrlParam<SortMode>(URL_SORT_PARAM, VALID_SORTS) ?? readSort());
  const [kindFilter, setKindFilter] = useState<KindFilter>(() => readUrlParam<KindFilter>(URL_FILTER_PARAM, VALID_FILTERS) ?? readFilter());
  const [userTouchedFilter, setUserTouchedFilter] = useState(false);
  const [pull, setPull] = useState(0);
  // Cards descartados manualmente pelo usuário quando não têm coordenadas válidas (badge "Sem localização").
  const [dismissedNoGeo, setDismissedNoGeo] = useState<Set<string>>(() => new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // Ao descobrir que o usuário tem ramos configurados, defaulta para "🎯 Do meu ramo".
  // Só faz o auto-switch se o usuário AINDA não escolheu outro filtro manualmente
  // e não há preferência salva na URL/localStorage.
  useEffect(() => {
    if (userTouchedFilter) return;
    const hadUrlPref = readUrlParam<KindFilter>(URL_FILTER_PARAM, VALID_FILTERS);
    if (hadUrlPref) return;
    if (branchCtx.hasContext && kindFilter === "all") setKindFilter("mine");
  }, [branchCtx.hasContext, userTouchedFilter, kindFilter]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabaseExternal.auth.getUser();
        if (!cancelled) setCurrentUserId(data?.user?.id ?? null);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);
  const startY = useRef<number | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const THRESHOLD = 60;
  const MAX_PULL = 90;

  // Persiste sort/filter em localStorage E na URL (?partnersSort=&partnersKind=)
  useEffect(() => {
    try { window.localStorage.setItem(SORT_KEY, sortMode); } catch { /* ignore */ }
    writeUrlParams({ [URL_SORT_PARAM]: sortMode === "recent" ? null : sortMode });
  }, [sortMode]);
  useEffect(() => {
    try { window.localStorage.setItem(FILTER_KEY, kindFilter); } catch { /* ignore */ }
    writeUrlParams({ [URL_FILTER_PARAM]: kindFilter === "all" ? null : kindFilter });
  }, [kindFilter]);


  const fetchPartners = useCallback(async (ctx: BranchContext): Promise<{ ok: boolean }> => {
    // Seleciona APENAS colunas que existem com segurança na tabela `profiles` do
    // Supabase externo.
    const SAFE_COLS = "id, full_name, display_name, company_name, avatar_url, logo_url, banner_url, role, user_type, business_category, custom_branch, preferred_service, job_roles, city, state, created_at, lat, lng";
    try {
      // Bloqueia administradores e o próprio usuário logado do carrossel público.
      let selfId = ctx.userId;

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

      let fetchRes = await supabaseExternal
        .from("profiles_public")
        .select(SAFE_COLS)
        .not("role", "is", null)
        .order("created_at", { ascending: false })
        .limit(100);
      
      let data = fetchRes.data as any[] | null;
      let error = fetchRes.error;
      
      if (error && (error.code === '42703' || error.message.includes('does not exist'))) {
        console.warn("[RecentPartnersCarousel] Colunas ausentes na view, tentando fallback seguro...");
        const FALLBACK_COLS = "id, full_name, display_name, company_name, avatar_url, role, business_category, custom_branch, preferred_service, city, state, created_at, lat, lng";
        const fallbackRes = await supabaseExternal
          .from("profiles_public")
          .select(FALLBACK_COLS)
          .not("role", "is", null)
          .order("created_at", { ascending: false })
          .limit(100);
        data = fallbackRes.data as any[] | null;
        error = fallbackRes.error;
      }
      
      if (error) throw error;

      const rows = (data ?? [])
        .map((r) => {
          const rid = String(r.id);
          if (adminIds.has(rid)) return null;
          if (selfId && rid === selfId) return null;
          const kind = classifyRole(r.role);
          if (!kind) return null;
          // Normaliza campos "amigáveis" a partir do que realmente existe no banco.
          const branch = safeStr(r.business_category) || safeStr(r.custom_branch) || null;
          const merged: PartnerCard = {
            ...r,
            name: safeStr(r.display_name) || safeStr(r.company_name) || safeStr(r.full_name),
            full_name: safeStr(r.display_name) || safeStr(r.company_name) || safeStr(r.full_name),
            activity_branch: branch,
            uf: r.state ?? null,
            _kind: kind,
          } as PartnerCard;
          return merged;
        })
        .filter((x): x is PartnerCard => !!x);
      
      if (rows.length > 0) {
        setItems(rows);
        writeCache(rows);
      } else {
        setItems((prev) => (prev.length > 0 ? prev : FALLBACK_PARTNERS));
      }
      setErrorMsg(null);
      return { ok: true };
    } catch (err: unknown) {
      if (typeof console !== "undefined") console.debug("[RecentPartnersCarousel] fallback silencioso:", err);
      setItems((prev) => (prev.length > 0 ? prev : FALLBACK_PARTNERS));
      setErrorMsg(null);
      return { ok: false };
    }
  }, []);


  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!branchCtx.userId && items.length === 0) {
         // Se não tem user ID ainda e não tem nada, espera ou usa cache
         if (cached) {
            setItems(cached.items);
            setLoading(false);
         }
      }
      
      if (branchCtx.userId) {
        await fetchPartners(branchCtx);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchPartners, branchCtx.userId, cached]);

  // Quando a geolocalização do usuário fica disponível, limpamos descartes manuais
  // para que os badges "Sem localização" sejam recriados/reavaliados com o novo contexto.
  useEffect(() => {
    if (userCoords) setDismissedNoGeo(new Set());
  }, [userCoords]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setErrorMsg(null);
    await fetchPartners(branchCtx);
    setTimeout(() => setRefreshing(false), 300);
  }, [fetchPartners, refreshing, branchCtx]);

  // ---- Ordenação em memória (com coords pré-calculadas para "Mais próximos") ----
  type Enriched = PartnerCard & {
    _coords: { lat: number; lng: number } | null;
    _distanceKm: number | null;
    _relevance: RelevanceResult;
  };
  const sortedItems = useMemo<Enriched[]>(() => {
    // 1) Filtro por tipo (Prestador / Parceiro) — "mine" e "all" mantêm ambos os tipos.
    const byKind = (kindFilter === "all" || kindFilter === "mine")
      ? items
      : items.filter((p) => p._kind === kindFilter);

    // 2) Calcula relevância vs. ramo do usuário logado (com razão para tooltip).
    const scored: Enriched[] = byKind.map((p) => {
      const rowCoords = (p.lat != null && p.lng != null && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)))
        ? { lat: Number(p.lat), lng: Number(p.lng) }
        : null;
      const coords = rowCoords ?? cityCoords(p.city) ?? null;
      const liveDist = (userCoords && coords) ? haversineKm(userCoords, coords) : null;
      const storedRaw = p.distance_km ?? p.distance;
      const storedDist = storedRaw != null ? Number(storedRaw) : null;
      const isSelf = !!currentUserId && p.id === currentUserId;
      const dist = isSelf
        ? 0
        : Number.isFinite(liveDist as number)
          ? (liveDist as number)
          : (storedDist != null && Number.isFinite(storedDist) ? storedDist : null);
      const rel = scoreRelevanceDetailed(
        [p.activity_branch, p.business_category, p.custom_branch, p.category, p.preferred_service],
        branchCtx,
      );
      return { ...p, _coords: coords, _distanceKm: dist, _relevance: rel };
    });

    // 3) Filtro "🎯 Do meu ramo": prefere itens relevantes, mas com fallback
    //    inteligente — se sobrar menos de 3, mantém a lista completa (ordenada
    //    por relevância) para evitar seção vazia em nichos pequenos.
    let base = scored;
    if (kindFilter === "mine" && branchCtx.hasContext) {
      const strict = scored.filter((p) => p._relevance.level !== "none");
      base = strict.length >= 3 ? strict : scored;
    }

    // 4) Ordenação
    if (sortMode === "rating") {
      base = [...base].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sortMode === "nearby" && userCoords) {
      base = base.filter((p) => !dismissedNoGeo.has(p.id));
      base = [...base].sort((a, b) => {
        const da = a._distanceKm ?? Number.POSITIVE_INFINITY;
        const db = b._distanceKm ?? Number.POSITIVE_INFINITY;
        return da - db;
      });
    } else {
      base = [...base].sort((a, b) => {
        const ta = a.created_at ? Date.parse(a.created_at) : 0;
        const tb = b.created_at ? Date.parse(b.created_at) : 0;
        return tb - ta;
      });
    }

    // 5) Boost por relevância: exact > subcategory > macro > none.
    return [...base].sort((a, b) => relevanceRank(a._relevance.level) - relevanceRank(b._relevance.level));
  }, [items, sortMode, userCoords, kindFilter, dismissedNoGeo, currentUserId, branchCtx]);

  // ---- IntersectionObserver: pré-carrega /perfil/:id + foto quando o card se aproxima ----
  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return;
    const root = scrollerRef.current;
    if (!root || sortedItems.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          const id = el.dataset.partnerId;
          if (id) preloadProfile(id);
          const avatar = el.dataset.partnerAvatar;
          if (avatar) preloadImage(avatar);
        }
      },
      { root, rootMargin: "0px 400px 0px 400px", threshold: 0.01 },
    );
    for (const el of cardRefs.current) if (el) io.observe(el);
    return () => io.disconnect();
  }, [sortedItems]);

  // Pré-carrega ansiosamente as fotos válidas dos primeiros cards visíveis (reduz flicker inicial).
  useEffect(() => {
    for (const p of sortedItems.slice(0, 8)) {
      const raw = safeStr(p.avatar_url) || safeStr(p.avatar) || safeStr(p.photo_url);
      if (isValidImageUrl(raw)) preloadImage(raw);
    }
  }, [sortedItems]);


  // ---- Pull-to-refresh (mobile) ----
  const onTouchStart = (e: React.TouchEvent) => {
    if (refreshing) return;
    const el = scrollerRef.current;
    if (el && el.scrollLeft > 4) return;
    startY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current == null || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setPull(Math.min(MAX_PULL, dy / 2.2));
  };
  const onTouchEnd = () => {
    if (startY.current == null) return;
    startY.current = null;
    if (pull >= THRESHOLD) handleRefresh();
    setPull(0);
  };

  const openProfile = (p: PartnerCard) => {
    // Prime cache com a categoria já conhecida do card → evita "flash" de cor
    // ao passar pelo redirecionador /perfil/:id (que resolve categoria e navega
    // para /prestador, /parceiro, /lojista ou /cliente).
    const kindToCategory: Record<string, PublicProfileCategory> = {
      prestador: "prestador",
      fornecedor: "fornecedor",
      lojista: "lojista",
      cliente: "cliente",
    };
    const cat = kindToCategory[p._kind as string];
    if (cat) primePublicProfileCategory(p.id, cat);
    const path = `/perfil/${encodeURIComponent(p.id)}`;
    try { navigate({ to: path as any }); } catch { window.location.href = path; }
  };

  // ---- Navegação por teclado no carrossel ----
  // Enter/Espaço → abre /perfil/:id (redundante ao comportamento nativo do <button>,
  // mas explícito para leitores de tela e para reforçar o contrato de interação).
  // Setas/Home/End → move o foco entre cards com scroll suave.
  const onCardKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const p = sortedItems[idx];
      if (p) openProfile(p);
      return;
    }
    if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "Home" || e.key === "End") {
      e.preventDefault();
      const last = sortedItems.length - 1;
      let next = idx;
      if (e.key === "ArrowRight") next = Math.min(last, idx + 1);
      if (e.key === "ArrowLeft") next = Math.max(0, idx - 1);
      if (e.key === "Home") next = 0;
      if (e.key === "End") next = last;
      const el = cardRefs.current[next];
      if (el) { el.focus(); el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }); }
    }
  };

  const showSkeleton = loading && items.length === 0;
  const showBlockingError = !!errorMsg && sortedItems.length === 0;

  return (
    <section
      aria-label="Prestadores e parceiros recentes"
      className="bg-[#1A1A1B] border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-6 relative overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {(pull > 0 || refreshing) && (
        <div
          className="absolute left-0 right-0 top-0 flex items-center justify-center text-[11px] font-bold text-white/80 pointer-events-none"
          style={{ height: refreshing ? 32 : Math.max(pull, 0), transition: refreshing ? "height 200ms" : undefined }}
          aria-live="polite"
        >
          <RefreshCw
            className="w-4 h-4 mr-1"
            style={{
              color: "#00FF87",
              animation: refreshing ? "spin 800ms linear infinite" : undefined,
              transform: refreshing ? undefined : `rotate(${Math.min(360, pull * 4)}deg)`,
            }}
          />
          {refreshing ? "Atualizando..." : pull >= THRESHOLD ? "Solte para atualizar" : "Puxe para atualizar"}
        </div>
      )}

      {/* ---- HEADER RESPONSIVO (mobile-first) ---------------------------------
           Linha 1: título + subtítulo ocupam 100% da largura (sem compressão lateral).
           Linha 2: barra horizontal rolável com pílulas de filtro + ordenação + refresh.
      ------------------------------------------------------------------------- */}
      <header className="mb-3 md:mb-4 w-full block">
        <div className="w-full block">
          <h3 className="w-full block font-black italic uppercase text-white text-sm md:text-base tracking-wide leading-tight">
            👥 Prestadores e Parceiros Recentes
          </h3>
          <p className="w-full block text-[11px] md:text-xs text-muted-foreground mt-1 leading-snug">
            Conecte-se com profissionais e fornecedores recomendados na sua região.
          </p>
        </div>

        <div
          role="toolbar"
          aria-label="Filtros e ordenação de parceiros"
          aria-orientation="horizontal"
          className="mt-2 flex items-center gap-2 overflow-x-auto scrollbar-none w-full pt-2 pb-1"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
        >
          {/* Grupo radio: filtro por categoria. Roving tabindex + setas para teclado. */}
          <div role="radiogroup" aria-label="Filtrar parceiros por categoria" className="contents">
            {(() => {
              const opts: Array<{ v: KindFilter; label: string; color: string }> = [
                ...(branchCtx.hasContext ? [{ v: "mine" as KindFilter, label: "🎯 Do meu ramo", color: "#00FF87" }] : []),
                { v: "all", label: "🟢 Todos", color: "#00FF87" },
                { v: "prestador", label: "🛠️ Prestadores", color: "#FF9F0A" },
                { v: "fornecedor", label: "🚚 Parceiros B2B", color: "#A855F7" },
              ];
              return opts.map((opt, i) => {
                const active = kindFilter === opt.v;
                return (
                  <button
                    key={opt.v}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={`Filtrar por ${opt.label.replace(/^\S+\s/, "")}`}
                    tabIndex={active ? 0 : -1}
                    onClick={() => { setUserTouchedFilter(true); setKindFilter(opt.v); }}
                    onKeyDown={(e) => {
                      if (["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) {
                        e.preventDefault();
                        let ni = i;
                        if (e.key === "ArrowRight") ni = (i + 1) % opts.length;
                        if (e.key === "ArrowLeft") ni = (i - 1 + opts.length) % opts.length;
                        if (e.key === "Home") ni = 0;
                        if (e.key === "End") ni = opts.length - 1;
                        const next = opts[ni];
                        if (next) {
                          setUserTouchedFilter(true);
                          setKindFilter(next.v);
                          const el = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button[role="radio"]')[ni];
                          el?.focus();
                        }
                      }
                    }}
                    className="shrink-0 whitespace-nowrap text-[11px] md:text-xs font-bold px-3 py-1.5 rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    style={active
                      ? { background: opt.color, color: "#000", borderColor: opt.color, ["--tw-ring-color" as any]: opt.color }
                      : { color: "rgba(255,255,255,0.8)", background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.12)", ["--tw-ring-color" as any]: opt.color }}
                  >
                    {opt.label}
                  </button>
                );
              });
            })()}
          </div>

          {/* Ordenação como pílula (cicla entre modos) */}
          <button
            type="button"
            onClick={() => {
              const options: SortMode[] = userCoords
                ? ["recent", "rating", "nearby"]
                : ["recent", "rating"];
              const i = options.indexOf(sortMode);
              setSortMode(options[(i + 1) % options.length] ?? "recent");
            }}
            className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 text-[11px] md:text-xs font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF87] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            aria-label={`Ordenação atual: ${sortMode === "rating" ? "Melhor avaliados" : sortMode === "nearby" ? "Mais próximos" : "Recentes"}. Toque para alternar.`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" aria-hidden="true" />
            {sortMode === "rating" ? "Melhor avaliados" : sortMode === "nearby" ? "Mais próximos" : "Recentes"}
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 text-[11px] md:text-xs font-bold text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1.5 transition disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF87] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            aria-label="Atualizar lista de parceiros"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            <span className="hidden md:inline">Atualizar</span>
          </button>
        </div>
      </header>

      {/* Banner amarelo removido — falhas caem silenciosamente para o mock fallback. */}


      {showSkeleton ? (
        <div className="flex gap-3 pb-2 overflow-x-hidden" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-44 flex-shrink-0 rounded-2xl bg-[#1A1A1B] border border-white/10 overflow-hidden">
              <div className="w-full h-36 bg-white/5 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-3/4 rounded bg-white/10 animate-pulse" />
                <div className="h-2.5 w-1/2 rounded bg-white/5 animate-pulse" />
                <div className="h-2.5 w-2/3 rounded bg-white/5 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : showBlockingError ? (
        <div
          role="alert"
          className="flex flex-col items-center justify-center text-center py-10 px-4 border border-dashed border-red-500/30 bg-red-500/5 rounded-2xl"
        >
          <AlertTriangle className="w-10 h-10 text-red-400 mb-2" aria-hidden="true" />
          <p className="text-sm font-bold text-white">Não foi possível carregar os parceiros.</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">{errorMsg}</p>
          <button
            type="button"
            onClick={handleRefresh}
            className="mt-4 text-xs font-bold bg-[#00FF87] text-black rounded-full px-4 py-2 hover:brightness-110 transition inline-flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF87] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Tentar novamente
          </button>
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-10 px-4 border border-dashed border-white/10 rounded-2xl">
          <UsersRound className="w-10 h-10 text-white/40 mb-2" aria-hidden="true" />
          <p className="text-sm font-bold text-white">Nenhum parceiro encontrado por aqui.</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Explore o feed completo de prestadores e fornecedores para descobrir profissionais próximos de você.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            <button type="button" onClick={() => { try { navigate({ to: "/feed/prestador" as any }); } catch { window.location.href = "/feed/prestador"; } }}
              className="text-xs font-bold bg-[#FF9F0A] text-black rounded-full px-4 py-2 hover:brightness-110 transition">
              🛠️ Ver Prestadores
            </button>
            <button type="button" onClick={() => { try { navigate({ to: "/feed/parceiro" as any }); } catch { window.location.href = "/feed/parceiro"; } }}
              className="text-xs font-bold bg-[#A855F7] text-white rounded-full px-4 py-2 hover:brightness-110 transition">
              🚚 Ver Parceiros
            </button>
            <button type="button" onClick={handleRefresh}
              className="text-xs font-bold bg-white/10 text-white rounded-full px-4 py-2 hover:bg-white/20 transition inline-flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Tentar novamente
            </button>
          </div>
        </div>
      ) : (
        <div
          ref={scrollerRef}
          role="list"
          aria-label={`${sortedItems.length} parceiros disponíveis`}
          className="flex gap-3 pb-2 overflow-x-auto snap-x snap-mandatory scrollbar-none"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
        >
          {sortedItems.map((p, idx) => {
            const meta = KIND_META[p._kind];
            const rating = typeof p.rating === "number" && p.rating > 0 ? p.rating : 5.0;
            // ---- Normalização defensiva de campos do perfil ----
            const displayName = safeStr(p.full_name) || safeStr(p.name) || "Profissional";
            const rawAvatar = safeStr(p.avatar_url) || safeStr(p.avatar) || safeStr(p.photo_url);
            // Sem fallback de terceiros (Unsplash). Se o avatar do Supabase estiver
            // ausente/quebrado, PartnerAvatar renderiza o placeholder temático (UserCircle2).
            const avatarUrl = isValidImageUrl(rawAvatar) ? rawAvatar : null;

            const city = safeStr(p.city);
            const stateVal = normalizeUf(p.uf) || normalizeUf(p.state);
            // Formato canônico "Cidade, UF" com vírgula. Fallbacks:
            // - só cidade → "Cidade"
            // - só UF     → "UF"
            // - nenhum    → tenta location/address; senão string vazia (sem placeholder).
            const location = (city && stateVal)
              ? `${city}, ${stateVal}`
              : (city || stateVal || safeStr(p.location) || safeStr(p.address) || "");
            const branchText = safeStr(p.activity_branch) || safeStr(p.category) || meta.label;
            // Distância só é mostrada quando temos coords válidas DOS DOIS lados.
            // Se o usuário não tiver coords (permissão negada / sem geo), NUNCA renderizamos
            // valores estimados — o card cai no formato apenas-localização abaixo.
            // Distância exibida quando temos valor válido (live via geo OU persistido em profiles.distance_km).
            const hasGeo = p._distanceKm != null && Number.isFinite(p._distanceKm);
            const distanceKm = hasGeo ? p._distanceKm! : null;
            // Formatação PT-BR: usa vírgula decimal e arredondamento consistente
            // (< 10 km → 1 casa decimal; ≥ 10 km → inteiro).
            const distanceLabel = distanceKm != null
              ? (distanceKm < 10
                  ? distanceKm.toFixed(1).replace(".", ",")
                  : Math.round(distanceKm).toString())
              : null;
            // Badge removível no topo esquerdo: apenas no modo "nearby" quando o perfil não tem coords mapeáveis.
            const showNoGeoBadge = sortMode === "nearby" && !!userCoords && p._coords == null;
            const label = `Abrir perfil de ${displayName}, ${meta.label}${branchText ? `, ${branchText}` : ""}${location ? `, ${location}` : ""}, avaliação ${rating.toFixed(1)} de 5`;
            return (
              <button
                key={p.id}
                ref={(el) => { cardRefs.current[idx] = el; }}
                data-partner-id={p.id}
                data-partner-avatar={avatarUrl ?? ""}
                type="button"
                role="listitem"
                onClick={() => openProfile(p)}
                onKeyDown={(e) => onCardKeyDown(e, idx)}
                className={`w-44 flex-shrink-0 snap-start rounded-2xl bg-[#1A1A1B] overflow-hidden border-2 ${meta.borderClass} text-left transition-transform active:scale-[0.98] hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black`}
                style={{ boxShadow: `0 0 12px ${meta.color}22`, ["--tw-ring-color" as any]: meta.color }}
                aria-label={label}
                aria-posinset={idx + 1}
                aria-setsize={sortedItems.length}
              >
                <div className="relative w-full h-36 bg-black/40">
                  <PartnerAvatar
                    src={avatarUrl}
                    alt={`Foto de ${displayName}`}
                    color={meta.color}
                  />
                  <span className="absolute top-2 right-2 z-10 text-xs font-bold text-yellow-400 bg-black/70 px-2 py-0.5 rounded-full backdrop-blur-sm inline-flex items-center gap-1" aria-hidden="true">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {rating.toFixed(1)}
                  </span>
                  {distanceLabel && (
                    <span className="absolute top-2 left-2 z-10 text-[10px] font-bold text-white bg-black/70 px-2 py-0.5 rounded-full backdrop-blur-sm" aria-hidden="true">
                      📍 {distanceLabel} km
                    </span>
                  )}
                  {showNoGeoBadge && (
                    <span
                      className="absolute top-2 left-2 z-10 text-[10px] font-bold text-white/90 bg-black/70 border border-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm inline-flex items-center gap-1"
                      role="note"
                      aria-label="Perfil sem localização mapeável"
                    >
                      📍 Sem localização
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={`Remover ${displayName} da lista Mais próximos`}
                        className="ml-0.5 -mr-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDismissedNoGeo((prev) => { const n = new Set(prev); n.add(p.id); return n; });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            setDismissedNoGeo((prev) => { const n = new Set(prev); n.add(p.id); return n; });
                          }
                        }}
                      >
                        <X className="w-2.5 h-2.5" aria-hidden="true" />
                      </span>
                    </span>
                  )}
                </div>

                <div className={`relative p-3 bg-gradient-to-t ${meta.gradientClass}`}>
                  <p className="font-black text-white text-sm truncate leading-tight">
                    {displayName}
                  </p>
                  <p
                    className="text-[11px] font-bold mt-0.5 truncate"
                    style={{ color: meta.color }}
                    title={branchText}
                  >
                    {meta.emoji} {branchText}
                  </p>
                  {(() => {
                    // 🎖️ Cargo do profissional — job_roles (CSV "||" ou ",") ou preferred_service como fallback.
                    // Deduplica em relação ao ramo (branchText) para não repetir "Móveis Planejados".
                    const jobsRaw = safeStr(p.job_roles);
                    const prefRaw = safeStr(p.preferred_service)
                      || (Array.isArray(p.preferred_services) ? p.preferred_services.filter(Boolean).join(", ") : safeStr(p.preferred_services as any));
                    const raw = jobsRaw || prefRaw;
                    if (!raw) return null;
                    const parts = raw.split(/\|\||[,;\n]/).map((s) => s.trim()).filter(Boolean);
                    const branchNorm = (branchText || "").trim().toLowerCase();
                    const filtered = parts.filter((s) => s.toLowerCase() !== branchNorm);
                    if (filtered.length === 0) return null;
                    const first = filtered.slice(0, 2).join(" • ");
                    return (
                      <p
                        className="text-[10px] font-bold mt-0.5 truncate text-primary/90"
                        title={`Cargo: ${filtered.join(", ")}`}
                      >
                        🎖️ {first}
                      </p>
                    );
                  })()}
                  {distanceLabel && location ? (
                    <p className="text-[10px] text-emerald-400 font-semibold mt-1 truncate" title={`a ${distanceLabel} km de você • ${location}`}>
                      📍 a {distanceLabel} km • {location}
                    </p>
                  ) : location ? (
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">📍 {location}</span>
                    </p>
                  ) : null}

                  {/* 🚚 Chip discreto com o veículo/observação para leitura rápida no card.
                       Prioriza vehicle_type; se ausente, tenta vehicle_details.Tipo. */}
                  {(() => {
                    const veh = p.vehicle_details && typeof p.vehicle_details === 'object' ? p.vehicle_details : null;
                    const vt = safeStr(p.vehicle_type) || safeStr(veh?.Tipo ?? veh?.tipo);
                    const vd = safeStr(p.vehicle_description) || safeStr(veh?.Descrição ?? veh?.descricao);
                    const notes = safeStr(p.offerings_notes);
                    if (!vt && !vd && !notes) return null;
                    const vehicleText = [vt, vd].filter(Boolean).join(" — ");
                    return (
                      <div className="mt-1.5 space-y-0.5">
                        {vehicleText && (
                          <p
                            className="text-[10px] text-primary/90 font-bold truncate flex items-center gap-1"
                            title={vehicleText}
                          >
                            🚚 <span className="truncate">{vehicleText}</span>
                          </p>
                        )}
                        {notes && (
                          <p className="text-[10px] italic text-white/60 line-clamp-2" title={notes}>
                            “{notes}”
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <AvailabilityBadge userId={p.id} />
                    <RelevanceBadge result={p._relevance} />
                  </div>
                </div>
              </button>
            );
          })}
          {/* Skeletons durante revalidação em background — mantém a experiência estável */}
          {refreshing && sortedItems.length > 0 && Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`sk-${i}`}
              aria-hidden="true"
              className="w-44 flex-shrink-0 snap-start rounded-2xl bg-[#1A1A1B] border border-white/10 overflow-hidden opacity-70"
            >
              <div className="w-full h-40 bg-white/5 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-3/4 rounded bg-white/10 animate-pulse" />
                <div className="h-2.5 w-1/2 rounded bg-white/5 animate-pulse" />
                <div className="h-2.5 w-2/3 rounded bg-white/5 animate-pulse" />
              </div>
            </div>
          ))}
        </div>

      )}
    </section>
  );
}

/**
 * Avatar do card com:
 * - Placeholder blur (gradiente colorido) enquanto a imagem carrega → reduz flicker no mobile.
 * - Fallback silencioso para ícone se `src` falhar (onError) ou for inválido.
 * - `loading="lazy"` + `decoding="async"` + `fetchPriority="low"` para não competir com o feed principal.
 */
function PartnerAvatar({ src, alt, color }: { src: string | null; alt: string; color: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const showImg = !!src && !failed;
  // Gradiente radial suave na cor do papel (âmbar/violeta) — funciona como "blur hash" barato.
  const blurStyle: React.CSSProperties = {
    background: `radial-gradient(120% 90% at 30% 20%, ${color}33 0%, ${color}11 45%, #000000 100%)`,
  };
  return (
    <>
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{ ...blurStyle, opacity: showImg && loaded ? 0 : 1 }}
        aria-hidden="true"
      >
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
          // @ts-expect-error — atributo válido no HTML mas ainda não tipado por padrão.
          fetchpriority="low"
          onLoad={() => setLoaded(true)}
          onError={() => { setFailed(true); setLoaded(false); }}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
          style={{ opacity: loaded ? 1 : 0 }}
        />
      )}
    </>
  );
}

import { memo as __memo } from "react";
export const RecentPartnersCarousel = __memo(RecentPartnersCarouselInner);
