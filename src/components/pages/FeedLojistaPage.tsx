import { FeedFiltersBar } from "@/components/FeedFiltersButton";
import { UniversalSearchPanel } from "@/components/UniversalSearchPanel";
import { RadiusFilter } from "@/components/RadiusFilter";
import { B2BSuggestionsCard } from "@/components/B2BSuggestionsCard";
import { OpportunitiesBadge } from "@/components/OpportunitiesBadge";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FeedCardSkeletonList } from "@/components/FeedCardSkeleton";
import { thumbSrc } from "@/lib/feed-thumb";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { getCategoryTheme } from "@/lib/category-colors";
import { AdMetaBadges, URGENCY_META, type UrgencyTag } from "@/components/AdMetaBadges";
import {
  FEED_STATUS_COLOR,
  FEED_STATUS_LABEL,
  STATUS_FILTERS,
  getFeedStatus,
  type StatusFilterKey,
} from "@/lib/feed-status";
import { FeedDetailsModal, type FeedDetailsData } from "@/components/FeedDetailsModal";
import { FeedEmptyState } from "@/components/FeedEmptyState";
import { CurrencyInputBRL } from "@/components/CurrencyInputBRL";
import { assertCurrencyIntegrity, parseCurrencyBRL } from "@/lib/currency-brl";
import { MacroBranchChips, getMacroSearchTerms } from "@/components/MacroBranchChips";
import { usePostUnlock } from "@/hooks/use-post-unlock";
import { useUserCoords, formatDistanceFromCity } from "@/lib/geo-distance";
import { PullToRefresh } from "@/components/PullToRefresh";
import { FeedErrorState } from "@/components/FeedErrorState";
import { useFeedPreload } from "@/hooks/use-feed-preload";
import { usePersistedState } from "@/lib/feed-persist";
import { Lock, Coins, Loader2 } from "lucide-react";
import {
  useUserBranchContext,
  scoreRelevanceDetailed,
  relevanceRank,
  applyRelevanceFallback,
} from "@/lib/branch-relevance";
import { RelevanceBadge } from "@/components/RelevanceBadge";
import { useAdFilterSearchState } from "@/lib/use-ad-filter-search";
import { useOSWorkflow } from "@/hooks/use-os-workflow";


import {
  ArrowLeft,
  Search,
  MessageSquare,
  Send,
  Bookmark,
  MoreVertical,
  Star,
  Flame,
  Image as ImageIcon,
  Play,
  X,
  Edit3,
  Trash2,
  Flag,
  MapPin,
  Clock,
  Shield,
  Truck,
  Wrench,
  Store,
  User,
} from "lucide-react";

type FeedCategory = "cliente" | "prestador" | "fornecedor" | "lojista";
type MediaItem = { type: "image" | "video"; url: string; poster?: string };

type FeedPost = {
  id: string;
  category: FeedCategory;
  author: {
    id: string;
    name: string;
    avatarInitials: string;
    isMine?: boolean;
    gold?: boolean;
  };
  rating: number;
  city: string;
  postedAt: string; // ex: "há 10 min"
  title: string;
  description: string;
  budget?: string;
  specialty?: string;
  radiusKm?: number;
  urgency?: UrgencyTag;
  serviceRadiusKm?: number;
  tags?: string[];
  media: MediaItem[];
  keywords: string[];
};

// MOCK_POSTS removido conforme Prompt 17.


const FILTERS: { key: "todos" | FeedCategory; label: string; icon: React.ReactNode }[] = [
  { key: "todos", label: "Todos os Anúncios", icon: null },
  { key: "cliente", label: "Clientes Finais", icon: <Flame className="w-3 h-3" /> },
  { key: "prestador", label: "Prestadores", icon: <Wrench className="w-3 h-3" /> },
  { key: "fornecedor", label: "Fornecedores", icon: <Truck className="w-3 h-3" /> },
  { key: "lojista", label: "Lojistas", icon: <Store className="w-3 h-3" /> },
];

function categoryBadge(cat: FeedCategory) {
  switch (cat) {
    case "cliente":
      return { label: "Cliente Final", icon: <User className="w-3 h-3" /> };
    case "prestador":
      return { label: "Prestador", icon: <Wrench className="w-3 h-3" /> };
    case "fornecedor":
      return { label: "Fornecedor", icon: <Truck className="w-3 h-3" /> };
    case "lojista":
      return { label: "Lojista", icon: <Store className="w-3 h-3" /> };
  }
}

const PAGE_SIZE = 10;
const SAVES_STORAGE_KEY = "fixxer_feed_saves_v1";

const AUTHOR_ROUTE: Record<FeedCategory, string> = {
  lojista: "/lojista",
  prestador: "/prestador",
  fornecedor: "/parceiro",
  cliente: "/cliente",
};

function authorHref(post: FeedPost) {
  return `${AUTHOR_ROUTE[post.category]}/${post.author.id}`;
}

export default function FeedLojistaPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = usePersistedState<"todos" | FeedCategory>("fixxer_feed_lojista_filter", "todos");
  const [statusFilter, setStatusFilter] = usePersistedState<StatusFilterKey>("fixxer_feed_lojista_status", "todos");
  const {
    urgency: urgencyFilter,
    distance: distanceKey,
    tag: tagFilter,
    setUrgency: setUrgencyFilter,
    setDistance: setDistanceKey,
    setTag: setTagFilter,
  } = useAdFilterSearchState("/_authenticated/feed/lojista");
  const distanceFilter = distanceKey; // alias para compatibilidade com o filtro existente
  const [detailsFor, setDetailsFor] = useState<FeedPost | null>(null);
  const [search, setSearch] = usePersistedState<string>("fixxer_feed_lojista_search", "");
  // Sincroniza com a Barra Universal Superior — único input de busca.
  useEffect(() => {
    const h = (e: Event) => {
      const q = (e as CustomEvent<{ query?: string }>).detail?.query ?? "";
      setSearch(q);
    };
    window.addEventListener("fixxer:universal-search", h as EventListener);
    return () => window.removeEventListener("fixxer:universal-search", h as EventListener);
  }, [setSearch]);
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  
  // Debounce da busca
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
    }, 220);
    return () => clearTimeout(t);
  }, [search]);

  
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [savesLoaded, setSavesLoaded] = useState(false);
  const [savesRemote, setSavesRemote] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ post: FeedPost; index: number } | null>(null);
  const [proposalFor, setProposalFor] = useState<FeedPost | null>(null);
  const [reportFor, setReportFor] = useState<FeedPost | null>(null);
  const [deleteFor, setDeleteFor] = useState<FeedPost | null>(null);
  const [proposalValue, setProposalValue] = useState("");
  const [proposalMsg, setProposalMsg] = useState("");
  const [proposalError, setProposalError] = useState<string | null>(null);

  // Desbloqueio pago (5 moedas) para ver detalhes completos
  const postUnlock = usePostUnlock();

  // Paginação por scroll infinito
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const loadFeed = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setOffset(0);
      } else {
        setLoading(true);
      }
      setLoadError(null);

      const currentOffset = isRefresh ? 0 : offset;
      const { feedService } = await import("@/lib/feed-service");
      
      const results = await feedService.getFeed({
        category: "lojista",
        type: filter === "todos" ? "todos" : (filter as any),
        query: debouncedSearch,
        status: statusFilter,
        offset: currentOffset,
        limit: 10
      });

      const mappedPosts: FeedPost[] = results.map(p => ({
        id: p.id,
        category: p.category as any,
        author: {
          id: p.authorId,
          name: p.author?.presentation.name || "Usuário",
          avatarInitials: p.author?.presentation.initials || "?",
          isMine: p.authorId === userId,
          gold: p.author?.identity.planId === "premium"
        },
        rating: p.author?.identity.karmaScore ? Number(p.author.identity.karmaScore) : 5,
        city: p.location.city || "Região",
        postedAt: new Date(p.createdAt).toLocaleDateString("pt-BR"),
        title: p.title,
        description: p.description,
        budget: p.price ? `R$ ${p.price.toLocaleString("pt-BR")}` : undefined,
        urgency: p.urgency as any,
        media: p.media as any,
        keywords: []
      }));

      setPosts(prev => isRefresh ? mappedPosts : [...prev, ...mappedPosts]);
      setHasMore(results.length === 10);
      setOffset(prev => isRefresh ? 10 : prev + 10);
    } catch (err: any) {
      setLoadError(err.message || "Erro ao carregar feed.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, debouncedSearch, statusFilter, offset, userId]);

  useEffect(() => {
    loadFeed(true);
  }, [filter, debouncedSearch, statusFilter]);

  // Realtime
  useEffect(() => {
    let sub: any;
    (async () => {
      const { feedService } = await import("@/lib/feed-service");
      sub = feedService.subscribeToFeed((newPost) => {
        if (newPost.category === "lojista") {
          loadFeed(true);
        }
      });
    })();
    return () => sub?.unsubscribe();
  }, [loadFeed]);

  const handleRefresh = () => loadFeed(true);

  const branchCtx = useUserBranchContext();
  const visible = posts;
  const paged = posts;
  const searching = loading && posts.length === 0;



  // Persiste local sempre que muda
  useEffect(() => {
    if (!savesLoaded) return;
    try {
      localStorage.setItem(SAVES_STORAGE_KEY, JSON.stringify([...saved]));
    } catch {}
  }, [saved, savesLoaded]);


  const persistSave = useCallback(
    async (postId: string, nextSaved: boolean) => {
      if (!userId || !savesRemote) return;
      try {
        if (nextSaved) {
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
        toast.success("Publicação salva", {
          description: savesRemote
            ? "Disponível em qualquer dispositivo."
            : "Faça login para sincronizar entre dispositivos.",
        });
      } else {
        next.delete(id);
        toast("Publicação removida dos salvos");
      }
      persistSave(id, willSave);
      return next;
    });
  };

  const openChat = (post: FeedPost) => {
    // Abre a conversa direta com o autor. Empacota o card como contexto
    // (título/mídia/urgência/preço) — o composer prefilla automaticamente.
    try {
      const { setAdChatContext } = require("@/lib/ad-chat-context") as typeof import("@/lib/ad-chat-context");
      setAdChatContext(post.author.id, {
        adId: post.id,
        title: post.title,
        category: String(post.category),
        cover: post.media?.[0]?.type === "image" ? post.media[0].url : null,
        priceLabel: post.budget || null,
        urgency: post.urgency || null,
        cta: "orcamento",
      });
    } catch { /* silencioso */ }
    navigate({ to: "/chat/$peerId", params: { peerId: post.author.id } });
  };

  const { transitionStatus } = useOSWorkflow();

  const submitProposal = async () => {
    if (!proposalFor) return;
    const err = assertCurrencyIntegrity("Valor da proposta", proposalValue, {
      required: true,
      min: 0.01,
    });
    if (err) {
      setProposalError(err);
      toast.error(err);
      return;
    }
    const n = parseCurrencyBRL(proposalValue);
    const target = proposalFor;

    try {
      const { data: auth } = await supabaseExternal.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) {
        toast.error("Você precisa estar logado para enviar uma proposta.");
        return;
      }

      const { data: proposal, error } = await supabaseExternal
        .from("proposals")
        .insert({
          os_id: target.id,
          prestador_id: uid,
          value: n,
          notes: proposalMsg,
          status: "pendente",
        })
        .select("id")
        .single();

      if (error) throw error;

      // Ao enviar a primeira proposta, a OS entra em RECEBENDO_PROPOSTAS
      // Envolve o payload no objeto 'data' esperado pelo middleware do TanStack Start
      transitionStatus({ 
        data: {
          osId: target.id, 
          newStatus: "RECEBENDO_PROPOSTAS", 
          notes: "Nova proposta recebida via Feed"
        }
      });

      toast.success("Proposta enviada!", {
        description: `${target?.author.name} receberá sua oferta de R$ ${n.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        })}.`,
      });

      // Dispara push ao autor da O.S. (best-effort)
      if (target?.author?.id) {
        try {
          const { sendPushToUser } = await import("@/lib/push-client");
          void sendPushToUser({
            userId: target.author.id,
            title: "💰 Nova proposta recebida",
            body: `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} — ${target.title}`,
            url: "/dashboard",
            tag: `proposal-${target.id}`,
          });
        } catch { /* ignore */ }
      }
    } catch (err: any) {
      console.error("[FeedLojista] Erro ao enviar proposta:", err);
      toast.error("Falha ao enviar proposta.");
    }

    setProposalFor(null);
    setProposalValue("");
    setProposalMsg("");
    setProposalError(null);
  };


  const submitReport = () => {
    toast.success("Denúncia registrada", {
      description: "Nossa equipe irá analisar o conteúdo em até 24h.",
    });
    setReportFor(null);
  };

  const confirmDelete = () => {
    toast.success("Publicação removida");
    setDeleteFor(null);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh} accent="#00E5FF">
    <div
      className="min-h-screen bg-[#0A0A0B] text-white flex flex-col font-sans pb-32"
      onClick={() => setOpenMenu(null)}
    >
      <UniversalSearchPanel defaultPill="lojista" />
      {/* Topbar Fixa */}
      <header className="border-b border-white/10 bg-[#0A0A0B]/95 backdrop-blur-md sticky top-0 z-[60]">
        <div className="max-w-3xl mx-auto">
          <FeedFiltersBar
            accent="#00E5FF"
            category="lojista"
            resultCount={visible.length}
            resultLabel="publicação"
            backSlot={
              <Link
                to="/lojista"
                aria-label="Voltar para a Dashboard do Lojista"
                className="w-10 h-10 shrink-0 bg-[#1A1A1B] border border-white/10 rounded-xl flex items-center justify-center text-white/70 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
            }
            onMacroSearchTerm={(term) => setSearch(term ?? "")}
            pillLabel="Tipo de Anúncio"
            pillOptions={FILTERS.map((f) => ({ key: f.key, label: f.label, icon: f.icon }))}
            pillValue={filter}
            onPillChange={(k) => setFilter(k as typeof filter)}
            statusValue={statusFilter}
            onStatusChange={setStatusFilter}
            urgencyValue={urgencyFilter}
            onUrgencyChange={setUrgencyFilter}
            distanceValue={distanceKey}
            onDistanceChange={setDistanceKey}
            badgeSlot={<OpportunitiesBadge category="lojista" />}
          />
        </div>
      </header>

      {/* Feed com coluna lateral fixa (desktop) */}
      <div className="w-full flex-1 lg:max-w-6xl lg:mx-auto lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-6 lg:px-4">
        <aside className="hidden lg:block">
          <div className="sticky top-[168px] space-y-3">
            <div className="p-4 rounded-2xl bg-[#1A1A1B] border border-white/10">
              <div className="text-[10px] font-black uppercase tracking-widest text-[#00E5FF] mb-3">
                Atalhos do Lojista
              </div>
              <nav className="space-y-1.5">
                <Link
                  to="/lojista"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Store className="w-4 h-4 text-[#00E5FF]" /> Dashboard
                </Link>
                <Link
                  to="/chat"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-[#00E5FF]" /> Chat
                </Link>
                <Link
                  to="/profile" search={{ focus: "" } as any}

                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <User className="w-4 h-4 text-[#00E5FF]" /> Meu Perfil
                </Link>
              </nav>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#00E5FF]/10 to-transparent border border-[#00E5FF]/20">
              <div className="text-[10px] font-black uppercase tracking-widest text-[#00E5FF] mb-2">
                Dica Rápida
              </div>
              <p className="text-[11px] text-white/70 leading-relaxed">
                Filtre por status para acompanhar propostas, andamentos e finalizações em tempo
                real.
              </p>
            </div>
          </div>
        </aside>

        <main className="max-w-3xl mx-auto w-full p-3 sm:p-4 space-y-4 flex-1 lg:mx-0 lg:max-w-none">
          <B2BSuggestionsCard />
          {loading && posts.length === 0 ? (
            <div className="space-y-4" aria-live="polite">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-[#1A1A1B] border border-white/10 rounded-3xl p-4 animate-pulse"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-full bg-white/5" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/3 bg-white/5 rounded" />
                      <div className="h-2 w-1/4 bg-white/5 rounded" />
                    </div>
                  </div>
                  <div className="h-3 w-3/4 bg-white/5 rounded mb-2" />
                  <div className="h-2 w-full bg-white/5 rounded mb-1" />
                  <div className="h-2 w-5/6 bg-white/5 rounded" />
                  <div className="h-40 w-full bg-white/5 rounded-2xl mt-3" />
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <FeedEmptyState
              accent="#00E5FF"
              title="Nenhuma publicação encontrada"
              searchTerm={debouncedSearch}
              filterLabel={filter !== "todos" ? FILTERS.find((f) => f.key === filter)?.label : undefined}
              hasActiveFilters={!!debouncedSearch || filter !== "todos" || statusFilter !== "todos"}
              onReset={() => {
                setSearch("");
                setFilter("todos");
                setStatusFilter("todos");
              }}
              suggestions={["guarda-roupa", "cozinha", "montagem", "sorocaba", "urgente"]}
              onSuggestion={(term) => setSearch(term)}
            />
          ) : (
            <>
              {loadError && (
                <FeedErrorState
                  accent="#00E5FF"
                  busy={refreshing}
                  error={loadError}
                  onRetry={handleRefresh}
                />
              )}
              {paged.map((post) => {
                const locked = !post.author.isMine && !postUnlock.isUnlocked(post.id);
                const _relevance = scoreRelevanceDetailed(
                  [post.specialty ?? "", ...(post.keywords ?? []), post.title],
                  branchCtx,
                );

                return (
                  <div key={post.id} className="feed-item-cv relative">
                    {_relevance.level !== "none" && (
                      <div className="absolute right-3 top-3 z-10">
                        <RelevanceBadge result={_relevance} compact />
                      </div>
                    )}
                    <PostCard
                      post={post}
                      isSaved={saved.has(post.id)}
                      menuOpen={openMenu === post.id}
                      onToggleMenu={(e) => {
                        e.stopPropagation();
                        setOpenMenu((v) => (v === post.id ? null : post.id));
                      }}
                      onCloseMenu={() => setOpenMenu(null)}
                      onSave={() => toggleSaved(post.id)}
                      onChat={() => openChat(post)}
                      onPropose={() => setProposalFor(post)}
                      onReport={() => setReportFor(post)}
                      onDelete={() => setDeleteFor(post)}
                      onEdit={() => toast("Abrindo editor da publicação...")}
                      onOpenMedia={(index) => setLightbox({ post, index })}
                      onOpenDetails={() => setDetailsFor(post)}
                      locked={locked}
                      unlockCost={postUnlock.cost}
                      unlockBusy={postUnlock.busy === post.id}
                      onUnlock={async () => {
                        const ok = await postUnlock.unlock(post.id);
                        if (ok) setDetailsFor(post);
                      }}
                    />
                  </div>
                );
              })}

              {hasMore ? (
                <>
                  <div ref={sentinelRef} aria-hidden className="h-1 w-full" />
                  <button 
                    onClick={() => loadFeed()}
                    className="w-full py-4 text-xs font-bold text-[#00E5FF]/50 uppercase hover:text-[#00E5FF] transition-colors"
                  >
                    Carregar mais
                  </button>
                </>
              ) : (
                <div className="py-6 text-center text-[11px] font-bold uppercase tracking-wide text-white/30">
                  — Fim do feed —
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          <div
            className="max-w-4xl w-full max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const m = lightbox.post.media[lightbox.index];
              if (!m) return null;
              if (m.type === "video") {
                return (
                  <video
                    src={m.url}
                    poster={m.poster}
                    controls
                    autoPlay
                    className="max-h-[85vh] max-w-full rounded-2xl"
                  />
                );
              }
              return (
                <img
                  src={m.url}
                  alt={lightbox.post.title}
                  className="max-h-[85vh] max-w-full rounded-2xl object-contain"
                />
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal Enviar Proposta */}
      {proposalFor && (
        <ModalShell onClose={() => setProposalFor(null)} title="Enviar Proposta">
          <p className="text-xs text-white/60 mb-4">
            Para: <span className="text-white font-bold">{proposalFor.author.name}</span> ·{" "}
            <span className="text-[#00E5FF]">{proposalFor.title}</span>
          </p>
          <div className="mb-3">
            <CurrencyInputBRL
              label="Valor da proposta"
              value={proposalValue}
              onChange={(v) => {
                setProposalValue(v);
                if (proposalError) setProposalError(null);
              }}
              error={proposalError}
              accentColor="#00E5FF"
              placeholder="0,00"
            />
          </div>
          <label className="block text-[10px] uppercase tracking-widest font-black text-white/60 mb-1">
            Mensagem (opcional)
          </label>
          <textarea
            value={proposalMsg}
            onChange={(e) => setProposalMsg(e.target.value)}
            rows={3}
            placeholder="Prazo, condições, escopo..."
            className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#00E5FF] resize-none mb-4"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setProposalFor(null)}
              className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/70 text-xs font-bold uppercase"
            >
              Cancelar
            </button>
            <button
              onClick={submitProposal}
              className="flex-1 py-2.5 rounded-xl bg-[#00E5FF] text-black text-xs font-black uppercase shadow-[0_0_12px_rgba(0,229,255,0.35)]"
            >
              Enviar
            </button>
          </div>
        </ModalShell>
      )}

      {/* Modal Denúncia */}
      {reportFor && (
        <ModalShell onClose={() => setReportFor(null)} title="Denunciar Publicação">
          <p className="text-xs text-white/70 mb-4">
            Confirma a denúncia da publicação{" "}
            <span className="text-white font-bold">"{reportFor.title}"</span> de{" "}
            <span className="text-white font-bold">{reportFor.author.name}</span>? Nossa equipe irá
            revisar o conteúdo.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setReportFor(null)}
              className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/70 text-xs font-bold uppercase"
            >
              Cancelar
            </button>
            <button
              onClick={submitReport}
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-black uppercase"
            >
              Denunciar
            </button>
          </div>
        </ModalShell>
      )}

      {/* Modal Excluir */}
      {deleteFor && (
        <ModalShell onClose={() => setDeleteFor(null)} title="Excluir Publicação">
          <p className="text-xs text-white/70 mb-4">
            Tem certeza que deseja excluir{" "}
            <span className="text-white font-bold">"{deleteFor.title}"</span>? Esta ação não pode
            ser desfeita.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setDeleteFor(null)}
              className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/70 text-xs font-bold uppercase"
            >
              Cancelar
            </button>
            <button
              onClick={confirmDelete}
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-black uppercase"
            >
              Excluir
            </button>
          </div>
        </ModalShell>
      )}
      {/* Modal de Detalhes do Post */}
      <FeedDetailsModal
        data={
          detailsFor
            ? ({
                id: detailsFor.id,
                title: detailsFor.title,
                description: detailsFor.description,
                category: detailsFor.category,
                status: getFeedStatus(detailsFor.id),
                author: {
                  id: detailsFor.author.id,
                  name: detailsFor.author.name,
                  initials: detailsFor.author.avatarInitials,
                },
                authorHref: authorHref(detailsFor),
                city: detailsFor.city,
                postedAt: detailsFor.postedAt,
                rating: detailsFor.rating,
                badges: [
                  categoryBadge(detailsFor.category).label,
                  ...(detailsFor.specialty ? [detailsFor.specialty] : []),
                  ...(detailsFor.radiusKm ? [`Raio ${detailsFor.radiusKm} km`] : []),
                ],
                metaRows: [
                  ...(detailsFor.budget ? [{ label: "Orçamento", value: detailsFor.budget }] : []),
                  { label: "Publicado", value: detailsFor.postedAt },
                  { label: "Local", value: detailsFor.city },
                ],
                media: detailsFor.media,
                ctaLabel: "Entrar em contato",
              } satisfies FeedDetailsData)
            : null
        }
        isSaved={detailsFor ? saved.has(detailsFor.id) : false}
        onSave={() => detailsFor && toggleSaved(detailsFor.id)}
        onChat={() => {
          if (detailsFor) {
            const p = detailsFor;
            setDetailsFor(null);
            openChat(p);
          }
        }}
        onClose={() => setDetailsFor(null)}
        locked={detailsFor ? !detailsFor.author.isMine && !postUnlock.isUnlocked(detailsFor.id) : false}
        unlockCost={postUnlock.cost}
        onUnlock={async () => {
          if (!detailsFor) return false;
          return await postUnlock.unlock(detailsFor.id);
        }}
        onCandidatar={() => {
          if (detailsFor) {
            const p = detailsFor;
            setDetailsFor(null);
            setProposalFor(p);
          }
        }}
      />
    </div>
    </PullToRefresh>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#1A1A1B] border border-white/10 rounded-3xl p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-black uppercase italic text-sm tracking-tight">{title}</h4>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PostCardImpl({
  post,
  isSaved,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onSave,
  onChat,
  onPropose,
  onReport,
  onDelete,
  onEdit,
  onOpenMedia,
  onOpenDetails,
  locked = false,
  unlockCost = 5,
  unlockBusy = false,
  onUnlock,
}: {
  post: FeedPost;
  isSaved: boolean;
  menuOpen: boolean;
  onToggleMenu: (e: React.MouseEvent) => void;
  onCloseMenu: () => void;
  onSave: () => void;
  onChat: () => void;
  onPropose: () => void;
  onReport: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onOpenMedia: (index: number) => void;
  onOpenDetails: () => void;
  locked?: boolean;
  unlockCost?: number;
  unlockBusy?: boolean;
  onUnlock?: () => void | Promise<void>;
}) {
  const badge = categoryBadge(post.category);
  const theme = getCategoryTheme(post.category);
  const isClient = post.category === "cliente";
  const status = getFeedStatus(post.id);
  const statusColor = FEED_STATUS_COLOR[status];
  const profileHref = authorHref(post);
  const userCoords = useUserCoords();
  const distanceLabel = formatDistanceFromCity(post.city, userCoords);

  return (
    <article
      className="relative bg-[#1A1A1B] rounded-3xl p-4 sm:p-5 space-y-4 transition-all border-2"
      style={{ ...theme.borderStrong, ...theme.glow }}
    >
      {/* Badges de status + highlight */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border"
          style={{
            color: statusColor,
            borderColor: `${statusColor}55`,
            backgroundColor: `${statusColor}18`,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
          {FEED_STATUS_LABEL[status]}
        </span>
        {theme.highlight && (
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-widest"
            style={{ ...theme.bgSoft, ...theme.color, ...theme.borderSoft }}
          >
            <Flame className="w-3.5 h-3.5 animate-pulse" />
            {theme.highlight}
          </div>
        )}
      </div>

      {/* Cabeçalho */}
      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
        <Link
          to={profileHref}
          className="w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center font-black text-sm bg-[#0A0A0B] border hover:scale-105 transition-transform"
          style={{ ...theme.borderStrong, ...theme.color }}
          aria-label={`Ver perfil de ${post.author.name}`}
        >
          {post.author.avatarInitials}
        </Link>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              to={profileHref}
              className="font-bold text-white text-sm truncate hover:opacity-80"
            >
              {post.author.name}
            </Link>
            <span
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-bold border"
              style={{ ...theme.bgSoft, ...theme.color, ...theme.borderSoft }}
            >
              {badge.icon}
              {badge.label}
            </span>
            {post.author.gold && (
              <span className="inline-flex items-center gap-1 text-[10px] bg-yellow-400/10 border border-yellow-400/40 text-yellow-300 px-2 py-0.5 rounded">
                <Shield className="w-3 h-3" /> Ouro
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-white/50 mt-0.5">
            <span className="font-bold flex items-center gap-1" style={theme.color}>
              <Star className="w-3 h-3" style={theme.fill} />
              {post.rating.toFixed(1)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {post.city}
              {distanceLabel && <span className="text-white/40">• {distanceLabel}</span>}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {post.postedAt}
            </span>
            {post.specialty && (
              <span className="inline-flex items-center gap-1 text-white/70">
                <Wrench className="w-3 h-3" />
                {post.specialty}
              </span>
            )}
            {post.radiusKm && <span className="text-white/60">Raio {post.radiusKm} km</span>}
          </div>
        </div>

        {/* Menu 3 pontinhos */}
        <div className="relative shrink-0">
          <button
            onClick={onToggleMenu}
            className="p-2 text-white/50 hover:text-white rounded-lg hover:bg-white/5"
            aria-label="Mais opções"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          {menuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-full mt-1 z-20 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[200px]"
            >
              {post.author.isMine ? (
                <>
                  <button
                    onClick={() => {
                      onCloseMenu();
                      onEdit();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase italic tracking-widest hover:bg-white/5"
                  >
                    <Edit3 className="w-4 h-4" /> Editar
                  </button>
                  <button
                    onClick={() => {
                      onCloseMenu();
                      onDelete();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase italic tracking-widest text-red-400 hover:bg-red-500/10 border-t border-white/5"
                  >
                    <Trash2 className="w-4 h-4" /> Excluir
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    onCloseMenu();
                    onReport();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase italic tracking-widest text-red-400 hover:bg-red-500/10"
                >
                  <Flag className="w-4 h-4" /> Denunciar Publicação
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Conteúdo */}
      <div className="space-y-2">
        <button onClick={onOpenDetails} className="text-left w-full">
          <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight leading-snug hover:opacity-80 transition-opacity">
            {post.title}
          </h3>
        </button>
        <p
          className={`text-xs sm:text-[13px] text-white/70 leading-relaxed ${
            locked ? "blur-sm select-none pointer-events-none line-clamp-2" : ""
          }`}
          aria-hidden={locked || undefined}
        >
          {post.description}
        </p>
        {post.budget && (
          <div
            className="inline-flex items-center gap-1.5 mt-1 px-3 py-1 rounded-full border text-[11px] font-black uppercase tracking-widest"
            style={{ ...theme.bgSoft, ...theme.color, ...theme.borderSoft }}
          >
            {post.budget}
          </div>
        )}
        <AdMetaBadges
          urgency={post.urgency}
          radiusKm={post.serviceRadiusKm ?? post.radiusKm}
          tags={post.tags}
          theme={theme}
          compact
        />
      </div>

      {/* Mídias */}
      {post.media.length > 0 && (
        <div
          className={`grid gap-2 ${post.media.length === 1 ? "grid-cols-1" : "grid-cols-2"} ${
            locked ? "relative" : ""
          }`}
        >
          {post.media.slice(0, 4).map((m, i) => (
            <button
              key={i}
              onClick={() => (locked ? onUnlock?.() : onOpenMedia(i))}
              className={`relative rounded-2xl overflow-hidden border border-white/10 bg-[#0A0A0B] aspect-video group ${
                locked ? "pointer-events-none" : ""
              }`}
              aria-label={locked ? "Mídia bloqueada — desbloqueie para ver" : undefined}
            >
              {m.type === "video" ? (
                <>
                  {m.poster ? (
                    <img
                      src={thumbSrc(m.poster, 640)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className={`w-full h-full object-cover ${locked ? "blur-md scale-105" : ""}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                  {!locked && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ ...theme.bgSolid, ...theme.glowStrong }}
                      >
                        <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <img
                  src={thumbSrc(m.url, 640)}
                  alt={post.title}
                  loading="lazy"
                  decoding="async"
                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform ${
                    locked ? "blur-md scale-110" : ""
                  }`}
                />
              )}
              {locked && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Lock className="w-6 h-6 text-white/80" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Ações */}
      <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
        {locked ? (
          <>
            <button
              onClick={() => onUnlock?.()}
              disabled={unlockBusy}
              className="flex-1 font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: "#FFD600", color: "#0A0A0B", boxShadow: "0 0 18px rgba(255,214,0,0.35)" }}
              aria-label={`Desbloquear detalhes por ${unlockCost} moedas`}
            >
              {unlockBusy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Coins className="w-4 h-4" />
                  🔍 Ver Detalhes Completos ({unlockCost} 🪙)
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onChat}
              className="flex-1 font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all hover:opacity-90"
              style={{ ...theme.bgSolid, ...theme.glow }}
            >
              <MessageSquare className="w-4 h-4" /> {isClient ? "Chat Direto" : "Chat"}
            </button>
            <button
              onClick={() => {
                if (post.author.isMine) {
                  toast.error("Você não pode enviar proposta para seu próprio anúncio");
                  return;
                }
                onPropose();
              }}
              className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <Send className="w-4 h-4" style={theme.color} /> Enviar Proposta
            </button>

          </>
        )}
        <button
          onClick={onSave}
          aria-pressed={isSaved}
          aria-label={isSaved ? "Remover dos salvos" : "Salvar publicação"}
          className="p-2.5 rounded-xl border transition-colors"
          style={
            isSaved
              ? { ...theme.bgSoft, ...theme.borderSoft, ...theme.color }
              : {
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderColor: "rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.6)",
                }
          }
        >
          <Bookmark className="w-4 h-4" style={isSaved ? theme.fill : undefined} />
        </button>
      </div>
    </article>
  );
}

const PostCard = memo(PostCardImpl);

