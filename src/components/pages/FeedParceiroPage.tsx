import { FeedFiltersBar } from "@/components/FeedFiltersButton";
import { UniversalSearchPanel } from "@/components/UniversalSearchPanel";
import { RadiusFilter } from "@/components/RadiusFilter";
import { B2BSuggestionsCard } from "@/components/B2BSuggestionsCard";
import { OpportunitiesBadge } from "@/components/OpportunitiesBadge";
import { FeedEmptyState } from "@/components/FeedEmptyState";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  FEED_STATUS_COLOR,
  FEED_STATUS_LABEL,
  STATUS_FILTERS,
  getFeedStatus,
  type StatusFilterKey,
} from "@/lib/feed-status";
import { FeedDetailsModal, type FeedDetailsData } from "@/components/FeedDetailsModal";
import { CurrencyInputBRL } from "@/components/CurrencyInputBRL";
import { assertCurrencyIntegrity } from "@/lib/currency-brl";
import { useUserCoords, formatDistanceFromCity } from "@/lib/geo-distance";
import { PullToRefresh } from "@/components/PullToRefresh";
import { FeedErrorState } from "@/components/FeedErrorState";
import { useFeedPreload } from "@/hooks/use-feed-preload";
import { usePersistedState } from "@/lib/feed-persist";
import { toast } from "sonner";
import {
  ArrowLeft,
  Search,
  MessageSquare,
  Bookmark,
  Star,
  MapPin,
  Clock,
  Package,
  X,
  Building2,
  Truck,
  FileText,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { MacroBranchChips, getMacroSearchTerms } from "@/components/MacroBranchChips";
import {
  useUserBranchContext,
  scoreRelevanceDetailed,
  relevanceRank,
  applyRelevanceFallback,
} from "@/lib/branch-relevance";
import { RelevanceBadge } from "@/components/RelevanceBadge";
import FeedAdMenu from "@/components/FeedAdMenu";
import { useAdFilterSearchState } from "@/lib/use-ad-filter-search";
import { matchesAdFilters, coerceUrgency } from "@/lib/ad-filters";

// =============================================================================
// TIPOS
// =============================================================================

type Sector =
  | "Marmoria & Pedras"
  | "Vidraçaria & Espelhos"
  | "Ferragens & Insumos"
  | "Iluminação LED"
  | "Softwares & Maquinário";

type B2BStatus = "aberto" | "urgente" | "negociando" | "em_andamento";
type RequesterType = "lojista" | "prestador";

type B2BRequest = {
  id: string;
  store: {
    id: string;
    name: string;
    initials: string;
    verified?: boolean;
  };
  requesterType?: RequesterType;
  city: string;
  state: string;
  rating: number;
  postedAt: string;
  status: B2BStatus;
  sector: Sector;
  title: string;
  description: string;
  specs: string[];
  quantity: string;
  deadline: string;
  paymentTerms: string;
  attachment?: string;
};

type QuoteStatus = "pendente" | "aceita" | "recusada";

const SAVES_STORAGE_KEY = "fixxer_parceiro_saves_v1";

// =============================================================================
// MOCK DATA — DEMANDAS B2B
// =============================================================================

const SECTORS: Array<"Todas as Demandas" | Sector> = [
  "Todas as Demandas",
  "Marmoria & Pedras",
  "Vidraçaria & Espelhos",
  "Ferragens & Insumos",
  "Iluminação LED",
  "Softwares & Maquinário",
];

// MOCK_REQUESTS removido conforme Prompt 17.


const PAGE_SIZE = 10;

// =============================================================================
// PÁGINA
// =============================================================================

export default function FeedParceiroPage() {
  const navigate = useNavigate();
  const userCoords = useUserCoords();
  const [search, setSearch] = usePersistedState<string>("fixxer_feed_parceiro_search", "");
  useEffect(() => {
    const h = (e: Event) => {
      const q = (e as CustomEvent<{ query?: string }>).detail?.query ?? "";
      setSearch(q);
    };
    window.addEventListener("fixxer:universal-search", h as EventListener);
    return () => window.removeEventListener("fixxer:universal-search", h as EventListener);
  }, [setSearch]);
  const [activeSector, setActiveSector] = usePersistedState<(typeof SECTORS)[number]>("fixxer_feed_parceiro_sector", "Todas as Demandas");
  const [saved, setSaved] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem(SAVES_STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });
  const [savesRemote, setSavesRemote] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [quotesByRequest, setQuotesByRequest] = useState<Record<string, QuoteStatus>>({});
  const [quotesRemote, setQuotesRemote] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [quoteOpen, setQuoteOpen] = useState<B2BRequest | null>(null);
  const [statusFilter, setStatusFilter] = usePersistedState<StatusFilterKey>("fixxer_feed_parceiro_status", "todos");
  const [detailsFor, setDetailsFor] = useState<B2BRequest | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const sentinelRef = useRef<HTMLDivElement | null>(null);



  // Persistência local imediata dos favoritos
  useEffect(() => {
    try {
      window.localStorage.setItem(SAVES_STORAGE_KEY, JSON.stringify(Array.from(saved)));
    } catch {
      /* ignore */
    }
  }, [saved]);

  // Sincronizar com Supabase (favoritos + cotações)
  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabaseExternal.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        // Favoritos
        const { data: savesData, error: savesErr } = await supabaseExternal
          .from("feed_post_saves")
          .select("post_id")
          .eq("user_id", user.id);
        if (!savesErr && savesData) {
          setSavesRemote(true);
          const remote = new Set<string>(savesData.map((r: { post_id: string }) => r.post_id));
          setSaved((prev) => {
            const missing = [...prev].filter((id) => !remote.has(id));
            if (missing.length > 0) {
              void supabaseExternal.from("feed_post_saves").upsert(
                missing.map((post_id) => ({ user_id: user.id, post_id })),
                { onConflict: "user_id,post_id" },
              );
            }
            return new Set([...prev, ...remote]);
          });
        } else if (savesErr) {
          console.warn("[feed] feed_post_saves indisponível:", savesErr.message);
        }

        // Cotações B2B enviadas
        const { data: quotesData, error: quotesErr } = await supabaseExternal
          .from("b2b_quotes")
          .select("request_id,status")
          .eq("supplier_id", user.id);
        if (!quotesErr && quotesData) {
          setQuotesRemote(true);
          const map: Record<string, QuoteStatus> = {};
          for (const q of quotesData as Array<{ request_id: string; status: QuoteStatus }>) {
            map[q.request_id] = q.status ?? "pendente";
          }
          setQuotesByRequest(map);
        } else if (quotesErr) {
          console.warn("[feed] b2b_quotes indisponível:", quotesErr.message);
        }
      } catch (err) {
        console.warn("[feed] falha ao sincronizar dados B2B:", err);
        setLoadError(err instanceof Error ? err.message : "Falha de conexão");
      }
    })();
  }, [reloadKey]);

  const handleGlobalRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setReloadKey((k) => k + 1);
    await new Promise((r) => setTimeout(r, 400));
    setIsRefreshing(false);
    toast.success("Feed atualizado");
  }, []);


  const {
    urgency: urgencyFilter,
    distance: distanceFilter,
    tag: tagFilter,
    setUrgency: setUrgencyFilter,
    setDistance: setDistanceFilter,
    setTag: setTagFilter,
  } = useAdFilterSearchState("/_authenticated/feed/parceiro");

  const [posts, setPosts] = useState<B2BRequest[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMoreResult, setHasMoreResult] = useState(true);

  const loadFeed = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setOffset(0);
      } else {
        setLoading(true);
      }
      setLoadError(null);

      const { feedService } = await import("@/lib/feed-service");
      const results = await feedService.getFeed({
        category: "fornecedor",
        type: "solicitacao_b2b",
        query: search,
        status: statusFilter,
        offset: isRefresh ? 0 : offset,
        limit: 10
      });

      const mapped: B2BRequest[] = results.map(p => ({
        id: p.id,
        store: {
          id: p.authorId,
          name: p.author?.presentation.name || "Lojista",
          initials: p.author?.presentation.initials || "??",
          verified: p.author?.identity.isVerified
        },
        requesterType: p.category === "lojista" ? "lojista" : "prestador",
        city: p.location.city || "Região",
        state: p.location.state || "",
        rating: p.author?.identity.karmaScore || 5,
        postedAt: new Date(p.createdAt).toLocaleDateString("pt-BR"),
        status: p.urgency === "urgente" ? "urgente" : "aberto",
        sector: (p.metadata?.sector || "Ferragens & Insumos") as Sector,
        title: p.title,
        description: p.description,
        specs: (p.metadata?.specs || []) as string[],
        quantity: String(p.metadata?.quantity || "Consultar"),
        deadline: p.metadata?.deadline || "A combinar",
        paymentTerms: p.metadata?.paymentTerms || "A combinar",
        attachment: p.media?.[0]?.url
      }));

      setPosts(prev => isRefresh ? mapped : [...prev, ...mapped]);
      setHasMoreResult(results.length === 10);
      setOffset(prev => isRefresh ? 10 : prev + 10);
    } catch (err: any) {
      setLoadError(err.message || "Erro ao carregar demandas.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter, offset]);

  useEffect(() => {
    loadFeed(true);
  }, [search, activeSector, statusFilter]);

  const filtered = posts;



  const branchCtx = useUserBranchContext();
  const rankedFiltered = useMemo(() => {
    if (!branchCtx.hasContext) return filtered;
    const decorated = filtered.map((r) => ({
      r,
      _relevance: scoreRelevanceDetailed([r.sector, r.title], branchCtx),
    }));
    const sorted = [...decorated].sort(
      (a, b) => relevanceRank(a._relevance.level) - relevanceRank(b._relevance.level),
    );
    return applyRelevanceFallback(sorted, 3).map((x) => x.r);
  }, [filtered, branchCtx]);

  const paged = rankedFiltered;
  const hasMore = hasMoreResult;



  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadFeed();
        }
      },
      { rootMargin: "800px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadFeed]);


  const persistSave = useCallback(
    async (postId: string, willSave: boolean) => {
      if (!userId || !savesRemote) return;
      try {
        if (willSave) {
          await supabaseExternal
            .from("feed_post_saves")
            .upsert({ user_id: userId, post_id: postId }, { onConflict: "user_id,post_id" });
        } else {
          await supabaseExternal
            .from("feed_post_saves")
            .delete()
            .eq("user_id", userId)
            .eq("post_id", postId);
        }
      } catch (err) {
        console.warn("[feed] falha ao persistir favorito:", err);
      }
    },
    [userId, savesRemote],
  );

  const toggleSaved = (id: string) => {
    setSaved((prev) => {
      const next = new Set(prev);
      const willSave = !next.has(id);
      if (willSave) {
        next.add(id);
        toast.success("Oportunidade salva no seu mural", {
          description: savesRemote
            ? "Disponível em qualquer dispositivo."
            : "Faça login para sincronizar entre dispositivos.",
        });
      } else {
        next.delete(id);
        toast("Oportunidade removida dos salvos");
      }
      void persistSave(id, willSave);
      return next;
    });
  };

  const openChat = (r: B2BRequest) => {
    const peerId = r.store.id;
    if (!peerId) {
      toast.error("Loja sem canal B2B disponível.");
      return;
    }
    toast(`Abrindo canal B2B com ${r.store.name}...`);
    navigate({ to: "/chat/$peerId", params: { peerId } }).catch(() => {
      navigate({ to: "/chat" }).catch(() => undefined);
    });
  };

  const handleQuoteSubmit = async (
    request: B2BRequest,
    payload: { price: string; payment: string; delivery: string; notes: string },
  ) => {
    // Otimista
    setQuotesByRequest((prev) => ({ ...prev, [request.id]: "pendente" }));

    try {
      const {
        data: { user },
      } = await supabaseExternal.auth.getUser();
      if (!user) {
        toast.warning("Cotação registrada localmente", {
          description: "Faça login para enviar ao lojista.",
        });
        return;
      }
      const row = {
        supplier_id: user.id,
        request_id: request.id,
        store_id: request.store.id,
        price: payload.price,
        payment_terms: payload.payment,
        delivery_terms: payload.delivery,
        notes: payload.notes || null,
        status: "pendente" as QuoteStatus,
      };
      const { error } = await supabaseExternal
        .from("b2b_quotes")
        .upsert(row, { onConflict: "supplier_id,request_id" });
      if (error) {
        console.warn("[feed] b2b_quotes indisponível:", error.message);
        toast.warning("Cotação registrada localmente", {
          description: "Sincronização com o banco pendente.",
        });
      } else {
        setQuotesRemote(true);
        toast.success(`Cotação enviada para ${request.store.name}`);
      }
    } catch (err) {
      console.warn("[feed] falha ao enviar cotação:", err);
      toast.error("Não foi possível enviar a cotação agora.");
    }
  };

  return (
    <PullToRefresh onRefresh={handleGlobalRefresh} accent="#A855F7">
    <div className="min-h-screen bg-[#0A0A0B] text-white pb-32">
      <UniversalSearchPanel defaultPill="fornecedor" />
      {/* HEADER FIXO */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0A0A0B]/95 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <FeedFiltersBar
            accent="#A855F7"
            category="fornecedor"
            resultCount={filtered.length}
            resultLabel="demanda"
            backSlot={
              <button
                type="button"
                onClick={() => navigate({ to: "/parceiro" as any }).catch(() => undefined)}
                className="w-10 h-10 rounded-xl border border-white/10 bg-[#1A1A1B] text-white/80 transition hover:border-[#A855F7]/40 hover:text-[#A855F7] flex items-center justify-center shrink-0"
                aria-label="Voltar para Dashboard do Fornecedor"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            }
            onMacroSearchTerm={(term) => setSearch(term ?? "")}
            pillLabel="Setor B2B"
            pillOptions={SECTORS.map((s) => ({ key: s, label: s }))}
            pillValue={activeSector}
            onPillChange={(k) => setActiveSector(k as typeof activeSector)}
            statusValue={statusFilter}
            onStatusChange={setStatusFilter}
            urgencyValue={urgencyFilter}
            onUrgencyChange={setUrgencyFilter}
            distanceValue={distanceFilter}
            onDistanceChange={setDistanceFilter}
            badgeSlot={<OpportunitiesBadge category="fornecedor" />}
          />
        </div>
      </header>

      {/* FEED */}
      <main className="mx-auto max-w-3xl px-4 py-4">
        <div className="mb-4">
          <B2BSuggestionsCard />
        </div>
        {loadError && (
          <div className="mb-4">
            <FeedErrorState
              accent="#A855F7"
              busy={refreshing}
              error={loadError}
              onRetry={handleGlobalRefresh}
            />
          </div>
        )}
        <div className="mb-4 flex items-center justify-between text-xs text-white/50">
          <span>
            {filtered.length} demanda{filtered.length === 1 ? "" : "s"} B2B
          </span>
          <span className="inline-flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5 text-[#A855F7]" />
            Feed do Fornecedor
          </span>
        </div>

        {filtered.length === 0 ? (
          <FeedEmptyState
            accent="#A855F7"
            title="Nenhuma demanda B2B encontrada"
            searchTerm={search}
            filterLabel={activeSector !== "Todas as Demandas" ? activeSector : undefined}
            hasActiveFilters={!!search || activeSector !== "Todas as Demandas" || statusFilter !== "todos"}
            onReset={() => {
              setSearch("");
              setActiveSector("Todas as Demandas");
              setStatusFilter("todos");
            }}
            suggestions={["mármore", "vidro", "ferragem", "sorocaba", "atacado"]}
            onSuggestion={(term) => setSearch(term)}
          />
        ) : (
          <ul className="space-y-4">
            {paged.map((r) => {
              const quoteStatus = quotesByRequest[r.id];
              const isPrestador = r.requesterType === "prestador";
              const accent = isPrestador ? "#FF9F0A" : "#00E5FF";
              const accentRgba = (a: number) =>
                isPrestador ? `rgba(255, 159, 10, ${a})` : `rgba(0, 229, 255, ${a})`;
              const roleLabel = isPrestador ? "✓ Prestador" : "✓ Lojista";
              const _relevance = scoreRelevanceDetailed([r.sector, r.title], branchCtx);
              return (
                <li
                  key={r.id}
                  className="feed-item-cv overflow-hidden rounded-2xl border-2 bg-[#1A1A1B] relative"
                  style={{
                    borderColor: accentRgba(0.35),
                    boxShadow: `0 0 18px ${accentRgba(0.1)}`,
                  }}
                >
                  {_relevance.level !== "none" && (
                    <div className="absolute right-12 top-3 z-10">
                      <RelevanceBadge result={_relevance} compact />
                    </div>
                  )}
                  <div className="absolute right-3 top-3 z-20">
                    <FeedAdMenu
                      ownerId={r.store.id}
                      currentUserId={userId}
                      adId={r.id}
                      ownerName={r.store.name}
                      onEdit={() => toast(`Abrindo editor de "${r.title}"...`)}
                      onDelete={() => toast.error(`Excluir "${r.title}"? Confirme em Meus Anúncios.`)}
                      onTogglePause={() => toast(`Alternando pausa para "${r.title}"...`)}
                      accent={accent}
                    />
                  </div>
                  {/* Cabeçalho */}
                  <div className="flex items-start gap-3 p-4">
                    <Link
                      to={isPrestador ? "/prestador/$id" : "/lojista/$id"}
                      params={{ id: r.store.id }}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-[#0A0A0B] text-sm font-semibold hover:scale-105 transition-transform"
                      style={{ borderColor: accent, color: accent }}
                    >
                      {r.store.initials}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-sm font-semibold flex-wrap">
                        <Link
                          to={isPrestador ? "/prestador/$id" : "/lojista/$id"}
                          params={{ id: r.store.id }}
                          className="truncate hover:opacity-80"
                        >
                          {r.store.name}
                        </Link>
                        {r.store.verified && (
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                            style={{ backgroundColor: accentRgba(0.15), color: accent }}
                          >
                            {roleLabel}
                          </span>
                        )}
                        {(() => {
                          const st = getFeedStatus(r.id);
                          const c = FEED_STATUS_COLOR[st];
                          return (
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border"
                              style={{ color: c, borderColor: `${c}55`, backgroundColor: `${c}18` }}
                            >
                              <span
                                className="w-1 h-1 rounded-full"
                                style={{ backgroundColor: c }}
                              />
                              {FEED_STATUS_LABEL[st]}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-white/50">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {r.city}/{r.state}
                          {formatDistanceFromCity(r.city, userCoords) && (
                            <span className="text-white/40">• {formatDistanceFromCity(r.city, userCoords)}</span>
                          )}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {r.rating.toFixed(1)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {r.postedAt}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>

                  {/* Título + descrição */}
                  <div className="px-4 pb-3">
                    <button
                      type="button"
                      onClick={() => setDetailsFor(r)}
                      className="text-left w-full"
                    >
                      <h3 className="text-base font-semibold leading-snug hover:opacity-80 transition-opacity">
                        {r.title}
                      </h3>
                    </button>
                    <p className="mt-1 text-sm text-white/70">{r.description}</p>
                  </div>

                  {/* Anexo/desenho técnico */}
                  {r.attachment && (
                    <button
                      type="button"
                      onClick={() => setLightbox(r.attachment!)}
                      className="group relative block w-full overflow-hidden border-y border-white/10 bg-black"
                    >
                      <img
                        src={r.attachment}
                        alt="Anexo técnico"
                        loading="lazy"
                        decoding="async"
                        className="h-56 w-full object-cover transition group-hover:opacity-90"
                      />
                      <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-medium text-white/80">
                        Ver ampliado
                      </span>
                    </button>
                  )}

                  {/* Especificações */}
                  <div className="border-t border-white/5 px-4 py-3">
                    <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#A855F7]">
                      <FileText className="h-3.5 w-3.5" />
                      Especificações
                    </div>
                    <ul className="space-y-1 text-sm text-white/80">
                      {r.specs.map((s, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#A855F7]/70" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Meta B2B */}
                  <div className="grid grid-cols-3 gap-2 border-t border-white/5 px-4 py-3 text-[11px]">
                    <MetaCell
                      icon={<Package className="h-3.5 w-3.5" />}
                      label="Quantidade"
                      value={r.quantity}
                    />
                    <MetaCell
                      icon={<Truck className="h-3.5 w-3.5" />}
                      label="Prazo"
                      value={r.deadline}
                    />
                    <MetaCell
                      icon={<DollarSign className="h-3.5 w-3.5" />}
                      label="Pagamento"
                      value={r.paymentTerms}
                    />
                  </div>

                  {/* Status da cotação */}
                  {quoteStatus && (
                    <div className="border-t border-white/5 px-4 py-2">
                      <QuoteStatusPill status={quoteStatus} />
                    </div>
                  )}

                  {/* Barra de ações */}
                  <div className="flex items-center gap-2 border-t border-white/10 bg-[#0F0F10] p-3">
                    <button
                      type="button"
                      onClick={() => setQuoteOpen(r)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                        quoteStatus
                          ? "border border-[#A855F7]/40 bg-[#A855F7]/10 text-[#A855F7] hover:bg-[#A855F7]/15"
                          : "bg-[#A855F7] text-black shadow-[0_0_20px_rgba(168,85,247,0.35)] hover:brightness-110"
                      }`}
                    >
                      {quoteStatus ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Revisar cotação
                        </>
                      ) : (
                        <>
                          <Package className="h-4 w-4" />
                          Enviar cotação B2B
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openChat(r)}
                      className="rounded-full border border-white/10 bg-[#1A1A1B] p-2.5 text-white/80 transition hover:border-[#A855F7]/40 hover:text-[#A855F7]"
                      aria-label="Chat direto B2B"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSaved(r.id)}
                      className={`rounded-full border p-2.5 transition ${
                        saved.has(r.id)
                          ? "border-[#A855F7]/50 bg-[#A855F7]/10 text-[#A855F7]"
                          : "border-white/10 bg-[#1A1A1B] text-white/80 hover:border-[#A855F7]/40 hover:text-[#A855F7]"
                      }`}
                      aria-label="Salvar oportunidade"
                    >
                      <Bookmark className={`h-4 w-4 ${saved.has(r.id) ? "fill-current" : ""}`} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Sentinela do scroll infinito */}
        {filtered.length > 0 && (
          <div ref={sentinelRef} className="py-6 text-center">
            {loading && (
              <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest text-white/50">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#A855F7] border-t-transparent" />
                Carregando mais demandas...
              </div>
            )}
            {!hasMore && !loading && (
              <span className="text-[11px] uppercase tracking-widest text-white/40">
                — Fim das demandas —
              </span>
            )}
          </div>
        )}
      </main>

      {/* LIGHTBOX */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightbox}
            alt="Anexo ampliado"
            className="max-h-full max-w-full rounded-xl object-contain"
          />
        </div>
      )}

      {/* MODAL COTAÇÃO */}
      {quoteOpen && (
        <QuoteModal
          request={quoteOpen}
          existingStatus={quotesByRequest[quoteOpen.id]}
          onClose={() => setQuoteOpen(null)}
          onSubmit={async (payload) => {
            const req = quoteOpen;
            setQuoteOpen(null);
            await handleQuoteSubmit(req, payload);
          }}
        />
      )}

      {/* MODAL DE DETALHES */}
      <FeedDetailsModal
        data={
          detailsFor
            ? ({
                id: detailsFor.id,
                title: detailsFor.title,
                description: detailsFor.description,
                category: "fornecedor",
                status: getFeedStatus(detailsFor.id),
                author: {
                  id: detailsFor.store.id,
                  name: detailsFor.store.name,
                  initials: detailsFor.store.initials,
                },
                authorHref:
                  detailsFor.requesterType === "prestador"
                    ? `/prestador/${detailsFor.store.id}`
                    : `/lojista/${detailsFor.store.id}`,
                city: `${detailsFor.city}/${detailsFor.state}`,
                postedAt: detailsFor.postedAt,
                rating: detailsFor.rating,
                badges: [detailsFor.sector],
                metaRows: [
                  { label: "Setor", value: detailsFor.sector },
                  { label: "Local", value: `${detailsFor.city}/${detailsFor.state}` },
                  { label: "Publicado", value: detailsFor.postedAt },
                ],
                media: detailsFor.attachment
                  ? [{ type: "image" as const, url: detailsFor.attachment }]
                  : [],
                ctaLabel: "Enviar cotação",
              } satisfies FeedDetailsData)
            : null
        }
        isSaved={detailsFor ? saved.has(detailsFor.id) : false}
        onSave={() =>
          detailsFor &&
          setSaved((prev) => {
            const next = new Set(prev);
            if (next.has(detailsFor.id)) next.delete(detailsFor.id);
            else next.add(detailsFor.id);
            return next;
          })
        }
        onChat={() => {
          if (detailsFor) {
            const req = detailsFor;
            setDetailsFor(null);
            setQuoteOpen(req);
          }
        }}
        onClose={() => setDetailsFor(null)}
      />
    </div>
    </PullToRefresh>
  );
}

// =============================================================================
// SUBCOMPONENTES
// =============================================================================

function StatusBadge({ status }: { status: B2BStatus }) {
  const map: Record<B2BStatus, { label: string; className: string }> = {
    aberto: {
      label: "Aberto",
      className: "border-white/15 bg-white/5 text-white/70",
    },
    urgente: {
      label: "Urgente",
      className:
        "border-red-500/40 bg-red-500/10 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.25)]",
    },
    negociando: {
      label: "Negociando",
      className: "border-amber-400/40 bg-amber-400/10 text-amber-300",
    },
    em_andamento: {
      label: "Em Andamento",
      className:
        "border-emerald-400/40 bg-emerald-400/10 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.25)]",
    },
  };
  const s = map[status];
  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${s.className}`}
    >
      {s.label}
    </span>
  );
}

function QuoteStatusPill({ status }: { status: QuoteStatus }) {
  const map: Record<QuoteStatus, { label: string; className: string }> = {
    pendente: {
      label: "Cotação enviada — aguardando lojista",
      className: "border-[#A855F7]/40 bg-[#A855F7]/10 text-[#A855F7]",
    },
    aceita: {
      label: "Cotação aceita",
      className: "border-emerald-400/50 bg-emerald-400/10 text-emerald-200",
    },
    recusada: {
      label: "Cotação recusada",
      className: "border-red-500/40 bg-red-500/10 text-red-300",
    },
  };
  const s = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${s.className}`}
    >
      <CheckCircle2 className="h-3 w-3" />
      {s.label}
    </span>
  );
}

function MetaCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-[#0F0F10] p-2">
      <div className="mb-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-white/40">
        {icon}
        {label}
      </div>
      <div className="text-[11px] font-medium leading-tight text-white/90">{value}</div>
    </div>
  );
}

function QuoteModal({
  request,
  existingStatus,
  onClose,
  onSubmit,
}: {
  request: B2BRequest;
  existingStatus?: QuoteStatus;
  onClose: () => void;
  onSubmit: (payload: {
    price: string;
    payment: string;
    delivery: string;
    notes: string;
  }) => void | Promise<void>;
}) {
  const [price, setPrice] = useState("");
  const [payment, setPayment] = useState("");
  const [delivery, setDelivery] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const perr = assertCurrencyIntegrity("Preço total", price, {
      required: true,
      min: 0.01,
    });
    if (perr) {
      setPriceError(perr);
      toast.error(perr);
      return;
    }
    if (!payment.trim() || !delivery.trim()) {
      toast.error("Preencha condições e prazo.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ price, payment, delivery, notes });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-t-2xl border border-white/10 bg-[#1A1A1B] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#A855F7]">Cotação B2B</div>
            <div className="text-sm font-semibold">{request.store.name}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-white/70 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {existingStatus && (
          <div className="border-b border-white/10 bg-[#0F0F10] px-4 py-2 text-[11px] text-white/70">
            Você já possui uma cotação{" "}
            <span className="font-semibold text-[#A855F7]">{existingStatus}</span> para esta
            demanda. Enviar novamente irá atualizar os valores.
          </div>
        )}
        <form onSubmit={submit} className="space-y-3 p-4">
          <CurrencyInputBRL
            label="Preço total (R$)"
            value={price}
            onChange={(v) => {
              setPrice(v);
              if (priceError) setPriceError(null);
            }}
            error={priceError}
            accentColor="#A855F7"
            placeholder="12.480,00"
          />
          <Field
            label="Condições de pagamento"
            value={payment}
            onChange={setPayment}
            placeholder="Ex.: 30/60/90 boleto"
          />
          <Field
            label="Prazo de entrega"
            value={delivery}
            onChange={setDelivery}
            placeholder="Ex.: 10 dias úteis"
          />
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-white/50">
              Observações
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Detalhes adicionais, garantias, frete..."
              className="w-full rounded-lg border border-white/10 bg-[#0F0F10] px-3 py-2 text-sm outline-none focus:border-[#A855F7]/50"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#A855F7] px-4 py-3 text-sm font-semibold text-black shadow-[0_0_20px_rgba(168,85,247,0.35)] transition hover:brightness-110 disabled:opacity-70"
          >
            {submitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                Enviando...
              </>
            ) : (
              "Enviar cotação"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] uppercase tracking-wider text-white/50">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-[#0F0F10] px-3 py-2 text-sm outline-none focus:border-[#A855F7]/50"
      />
    </div>
  );
}
