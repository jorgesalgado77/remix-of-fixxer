import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Star, MapPin, UserCircle2, RefreshCw, UsersRound, AlertTriangle, ArrowUpDown } from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { cityCoords, useUserCoords } from "@/lib/geo-distance";
import { haversineKm } from "@/lib/activity-branches";

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
  name?: string | null;
  avatar_url: string | null;
  avatar?: string | null;
  photo_url?: string | null;
  role: string | null;
  activity_branch: string | null;
  category?: string | null;
  city: string | null;
  uf: string | null;
  state?: string | null;
  location?: string | null;
  address?: string | null;
  rating: number | null;
  created_at: string | null;
};


type PartnerKind = "prestador" | "fornecedor";
type PartnerCard = PartnerRow & { _kind: PartnerKind };
type SortMode = "recent" | "rating" | "nearby";
type KindFilter = "all" | PartnerKind;

const CACHE_KEY = "fixxer_recent_partners_v1";
const CACHE_TTL = 10 * 60 * 1000; // 10 min (stale-while-revalidate)
const SORT_KEY = "fixxer_recent_partners_sort_v1";
const FILTER_KEY = "fixxer_recent_partners_filter_v1";

// ---- URL query-string sync (compartilhável / restaurável em reload) ----
const URL_SORT_PARAM = "partnersSort";
const URL_FILTER_PARAM = "partnersKind";
const VALID_SORTS: SortMode[] = ["recent", "rating", "nearby"];
const VALID_FILTERS: KindFilter[] = ["all", "prestador", "fornecedor"];
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
  { id: "mock-jorge-salgado", full_name: "Jorge Salgado", avatar_url: null, role: "prestador", activity_branch: "Conferente Técnico", city: "Votorantim", uf: "SP", rating: 5.0, created_at: null, _kind: "prestador" },
  { id: "mock-carlos-silva", full_name: "Carlos Silva", avatar_url: null, role: "prestador", activity_branch: "Montador de Móveis", city: "Sorocaba", uf: "SP", rating: 4.9, created_at: null, _kind: "prestador" },
  { id: "mock-mdf-cia", full_name: "Mdf & Cia Atacado", avatar_url: null, role: "fornecedor", activity_branch: "Insumos e Ferragens", city: "Sorocaba", uf: "SP", rating: 4.8, created_at: null, _kind: "fornecedor" },
  { id: "mock-ana-paula", full_name: "Ana Paula", avatar_url: null, role: "prestador", activity_branch: "Designer de Interiores", city: "Votorantim", uf: "SP", rating: 5.0, created_at: null, _kind: "prestador" },
  { id: "mock-ferragens-real", full_name: "Ferragens Real", avatar_url: null, role: "fornecedor", activity_branch: "Ferragens B2B", city: "Osasco", uf: "SP", rating: 4.9, created_at: null, _kind: "fornecedor" },
  { id: "mock-rodrigo-marques", full_name: "Rodrigo Marques", avatar_url: null, role: "prestador", activity_branch: "Marcenaria Fina", city: "Campinas", uf: "SP", rating: 4.7, created_at: null, _kind: "prestador" },
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
    return v === "prestador" || v === "fornecedor" ? v : "all";
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

export function RecentPartnersCarousel() {
  const navigate = useNavigate();
  const userCoords = useUserCoords();

  const cached = useMemo(() => readCache(), []);
  const [items, setItems] = useState<PartnerCard[]>(() => cached?.items ?? []);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>(() => readUrlParam<SortMode>(URL_SORT_PARAM, VALID_SORTS) ?? readSort());
  const [kindFilter, setKindFilter] = useState<KindFilter>(() => readUrlParam<KindFilter>(URL_FILTER_PARAM, VALID_FILTERS) ?? readFilter());
  const [pull, setPull] = useState(0);
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


  const fetchPartners = useCallback(async (): Promise<{ ok: boolean }> => {
    try {
      const { data, error } = await supabaseExternal
        .from("profiles")
        .select("id, full_name, name, avatar_url, avatar, photo_url, role, activity_branch, category, city, uf, state, location, address, rating, created_at")
        .order("created_at", { ascending: false })
        .order("rating", { ascending: false })
        .limit(120);
      if (error) throw error;

      const rows = ((data as unknown as PartnerRow[]) ?? [])
        .map((r) => {
          const kind = classifyRole(r.role);
          return kind ? ({ ...r, _kind: kind } as PartnerCard) : null;
        })
        .filter((x): x is PartnerCard => !!x)
        .slice(0, 30);
      if (rows.length > 0) {
        setItems(rows);
        writeCache(rows);
      } else if (!cached?.items?.length) {
        setItems(FALLBACK_PARTNERS);
      }
      setErrorMsg(null);
      return { ok: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao carregar parceiros.";
      // Só bloqueia com estado de erro quando não temos NADA em memória para exibir.
      if (items.length === 0 && !cached?.items?.length) {
        setErrorMsg(msg);
      } else {
        // Banner leve, mantém o que já está em tela (cache/fallback).
        setErrorMsg(`Não foi possível atualizar agora (${msg}).`);
      }
      return { ok: false };
    }
  }, [cached?.items?.length, items.length]);

  useEffect(() => {
    let cancelled = false;
    // Se não havia cache, mostramos o fallback para não deixar vazio durante a 1ª busca.
    if (!cached && items.length === 0) setItems(FALLBACK_PARTNERS);
    (async () => {
      await fetchPartners();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchPartners, cached, items.length]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setErrorMsg(null);
    await fetchPartners();
    setTimeout(() => setRefreshing(false), 300);
  }, [fetchPartners, refreshing]);

  // ---- Ordenação em memória ----
  const sortedItems = useMemo(() => {
    const arr = [...items];
    if (sortMode === "rating") {
      arr.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (sortMode === "nearby" && userCoords) {
      arr.sort((a, b) => {
        const ca = cityCoords(a.city); const cb = cityCoords(b.city);
        const da = ca ? haversineKm(userCoords, ca) : Number.POSITIVE_INFINITY;
        const db = cb ? haversineKm(userCoords, cb) : Number.POSITIVE_INFINITY;
        return da - db;
      });
    } else {
      arr.sort((a, b) => {
        const ta = a.created_at ? Date.parse(a.created_at) : 0;
        const tb = b.created_at ? Date.parse(b.created_at) : 0;
        return tb - ta;
      });
    }
    return arr;
  }, [items, sortMode, userCoords]);

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
    const path = `/perfil/${encodeURIComponent(p.id)}`;
    try { navigate({ to: path as any }); } catch { window.location.href = path; }
  };

  // ---- Navegação por teclado no carrossel ----
  const onCardKeyDown = (e: React.KeyboardEvent, idx: number) => {
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

      <header className="mb-3 md:mb-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-black italic uppercase text-white text-sm md:text-base tracking-wide">
            👥 Prestadores e Parceiros Recentes
          </h3>
          <p className="text-[11px] md:text-xs text-muted-foreground mt-1">
            Conecte-se com profissionais e fornecedores recomendados na sua região.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <label className="sr-only" htmlFor="partners-sort">Ordenar por</label>
          <div className="relative">
            <ArrowUpDown className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" aria-hidden="true" />
            <select
              id="partners-sort"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="appearance-none text-[11px] md:text-xs font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full pl-7 pr-3 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF87] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              aria-label="Ordenar parceiros"
            >
              <option value="recent" className="bg-[#1A1A1B]">Recentes</option>
              <option value="rating" className="bg-[#1A1A1B]">Melhor avaliados</option>
              <option value="nearby" className="bg-[#1A1A1B]" disabled={!userCoords}>
                Mais próximos {userCoords ? "" : "(ative a localização)"}
              </option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1 text-[11px] md:text-xs font-bold text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1.5 transition disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FF87] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            aria-label="Atualizar lista de parceiros"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            <span className="hidden md:inline">Atualizar</span>
          </button>
        </div>
      </header>

      {/* Banner de erro leve (mantém cards visíveis) */}
      {errorMsg && !showBlockingError && (
        <div
          role="status"
          aria-live="polite"
          className="mb-3 flex items-center gap-2 text-[11px] md:text-xs font-semibold text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className="flex-1 truncate">{errorMsg}</span>
          <button
            type="button"
            onClick={handleRefresh}
            className="shrink-0 underline hover:text-yellow-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 rounded"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {showSkeleton ? (
        <div className="flex gap-3 pb-2 overflow-x-hidden" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-44 flex-shrink-0 rounded-2xl bg-[#1A1A1B] border border-white/10 overflow-hidden">
              <div className="w-full h-40 bg-white/5 animate-pulse" />
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
            // ---- Normalização de campos do perfil (fallback entre chaves do Supabase) ----
            const displayName = p.full_name || p.name || "Profissional";
            const avatarUrl = p.avatar_url || p.avatar || p.photo_url || null;
            const stateVal = p.uf || p.state || null;
            const location = (p.city && stateVal)
              ? `${p.city}, ${stateVal}`
              : (p.location || p.city || p.address || "");
            const branchText = p.activity_branch || p.category || meta.label;
            const distance = sortMode === "nearby" && userCoords

              ? (() => { const c = cityCoords(p.city); if (!c) return null; const km = haversineKm(userCoords, c); return Number.isFinite(km) ? (km < 10 ? km.toFixed(1) : Math.round(km).toString()) : null; })()
              : null;
            const label = `Abrir perfil de ${displayName}, ${meta.label}${branchText ? `, ${branchText}` : ""}${location ? `, ${location}` : ""}, avaliação ${rating.toFixed(1)} de 5`;
            return (
              <button
                key={p.id}
                ref={(el) => { cardRefs.current[idx] = el; }}
                type="button"
                role="listitem"
                onClick={() => openProfile(p)}
                onMouseEnter={() => preloadProfile(p.id)}
                onFocus={() => preloadProfile(p.id)}
                onTouchStart={() => preloadProfile(p.id)}
                onKeyDown={(e) => onCardKeyDown(e, idx)}
                className={`w-44 flex-shrink-0 snap-start rounded-2xl bg-[#1A1A1B] overflow-hidden border-2 ${meta.borderClass} text-left transition-transform active:scale-[0.98] hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black`}
                style={{ boxShadow: `0 0 12px ${meta.color}22`, ["--tw-ring-color" as any]: meta.color }}
                aria-label={label}
                aria-posinset={idx + 1}
                aria-setsize={sortedItems.length}
              >
                <div className="relative w-full h-40 bg-black/40">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={`Foto de ${displayName}`}
                      loading="lazy"
                      decoding="async"
                      className="h-40 w-full object-cover rounded-t-xl"
                      onError={(e) => {
                        const el = e.currentTarget;
                        el.style.display = "none";
                        const fb = el.nextElementSibling as HTMLElement | null;
                        if (fb) fb.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className="absolute inset-0 items-center justify-center bg-gradient-to-br from-black/60 to-black/30"
                    style={{ display: avatarUrl ? "none" : "flex" }}
                    aria-hidden="true"
                  >
                    <UserCircle2 className="w-14 h-14" style={{ color: meta.color, opacity: 0.7 }} />
                  </div>

                  <span className="absolute top-2 right-2 text-xs font-bold text-yellow-400 bg-black/70 px-2 py-0.5 rounded-full backdrop-blur-sm inline-flex items-center gap-1" aria-hidden="true">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {rating.toFixed(1)}
                  </span>
                  {distance && (
                    <span className="absolute top-2 left-2 text-[10px] font-bold text-white bg-black/70 px-2 py-0.5 rounded-full backdrop-blur-sm" aria-hidden="true">
                      📍 {distance} km
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
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">📍 {location || "Votorantim, SP"}</span>
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
