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
import { usePerformanceMode } from "@/hooks/use-performance-mode";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { getCategoryTheme } from "@/lib/category-colors";
import {
  FEED_STATUS_COLOR,
  FEED_STATUS_LABEL,
  STATUS_FILTERS,
  getFeedStatus,
  type StatusFilterKey,
} from "@/lib/feed-status";
import { FeedDetailsModal, type FeedDetailsData } from "@/components/FeedDetailsModal";
import { MacroBranchChips, getMacroSearchTerms } from "@/components/MacroBranchChips";
import { FeedEmptyState } from "@/components/FeedEmptyState";
import { usePostUnlock } from "@/hooks/use-post-unlock";
import { useUserCoords, formatDistanceFromCity } from "@/lib/geo-distance";
import { PullToRefresh } from "@/components/PullToRefresh";
import { FeedErrorState } from "@/components/FeedErrorState";
import { useFeedPreload } from "@/hooks/use-feed-preload";
import { usePersistedState } from "@/lib/feed-persist";
import {
  useUserBranchContext,
  scoreRelevanceDetailed,
  relevanceRank,
  applyRelevanceFallback,
} from "@/lib/branch-relevance";
import { RelevanceBadge } from "@/components/RelevanceBadge";
import { AdMetaBadges, URGENCY_META, type UrgencyTag } from "@/components/AdMetaBadges";
import { matchesAdFilters, coerceUrgency } from "@/lib/ad-filters";
import { useAdFilterSearchState } from "@/lib/use-ad-filter-search";
import FeedAdMenu from "@/components/FeedAdMenu";

import {
  ArrowLeft,
  Search,
  MessageSquare,
  Bookmark,
  Star,
  Zap,
  MapPin,
  Clock,
  Wrench,
  Ruler,
  Hammer,
  ClipboardList,
  PenTool,
  X,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Play,
  User,
  Store,
  Flame,
  Lock,
  Coins,
  Loader2,
} from "lucide-react";

// =============================================================================
// TIPOS
// =============================================================================

type Subcategory =
  | "Conferência Técnica"
  | "Medição Fina"
  | "Montagem de Móveis"
  | "Instalação"
  | "Projetos/Desenho";

type ContractType = "lojista" | "cliente_final";

type MediaItem = { type: "image" | "video"; url: string; poster?: string };

type JobPost = {
  id: string;
  type: ContractType;
  contractor: {
    id: string;
    name: string;
    initials: string;
    isVerified?: boolean;
  };
  city: string;
  state: string;
  rating: number;
  postedAt: string;
  urgency: "normal" | "urgente" | "critica";
  subcategory: Subcategory;
  title: string;
  description: string;
  requirements: string[];
  tools: string[];
  value: string;
  valueType: "fixo" | "percentual" | "total";
  media: MediaItem[];
};

// =============================================================================
// MOCK DATA
// =============================================================================

// MOCK_JOBS removido conforme Prompt 17.


const FILTERS: { key: "todas" | Subcategory; label: string; icon: React.ReactNode }[] = [
  { key: "todas", label: "Todas as Vagas", icon: null },
  {
    key: "Conferência Técnica",
    label: "Conferência Técnica",
    icon: <ClipboardList className="w-3 h-3" />,
  },
  { key: "Medição Fina", label: "Medição Fina", icon: <Ruler className="w-3 h-3" /> },
  { key: "Montagem de Móveis", label: "Montagem de Móveis", icon: <Hammer className="w-3 h-3" /> },
  { key: "Instalação", label: "Instalação", icon: <Wrench className="w-3 h-3" /> },
  { key: "Projetos/Desenho", label: "Projetos/Desenho", icon: <PenTool className="w-3 h-3" /> },
];

const SAVES_STORAGE_KEY = "fixxer_prestador_saves_v1";
const PAGE_SIZE = 10;

// =============================================================================
// COMPONENTES AUXILIARES
// =============================================================================

function UrgencyBadge({ urgency }: { urgency: JobPost["urgency"] }) {
  if (urgency === "critica") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[8px] font-black uppercase tracking-widest">
        <Flame className="w-2.5 h-2.5" /> Urgente
      </span>
    );
  }
  if (urgency === "urgente") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[8px] font-black uppercase tracking-widest">
        <Clock className="w-2.5 h-2.5" /> Rápido
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground text-[8px] font-black uppercase tracking-widest">
      <Clock className="w-2.5 h-2.5" /> Normal
    </span>
  );
}

function TypeBadge({ type }: { type: ContractType }) {
  const cat = type === "lojista" ? "lojista" : "cliente";
  const theme = getCategoryTheme(cat);
  const Icon = type === "lojista" ? Store : User;
  const label = type === "lojista" ? "Lojista" : "Cliente Final";
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest"
      style={{ ...theme.bgSoft, ...theme.borderSoft, ...theme.color }}
    >
      <Icon className="w-2.5 h-2.5" /> {label}
    </span>
  );
}

function RatingStars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1">
      <Star className="w-3 h-3 text-amber-400 fill-current" />
      <span className="text-[10px] font-black text-white">{value.toFixed(1)}</span>
    </div>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF9F0A]/20 to-[#FF9F0A]/5 border border-[#FF9F0A]/20 flex items-center justify-center text-[11px] font-black text-[#FF9F0A] italic">
      {initials}
    </div>
  );
}

// =============================================================================
// MODAL DE CANDIDATURA
// =============================================================================

function ApplyModal({
  job,
  isOpen,
  alreadyApplied,
  onClose,
  onApplied,
}: {
  job: JobPost | null;
  isOpen: boolean;
  alreadyApplied: boolean;
  onClose: () => void;
  onApplied: (jobId: string) => void;
}) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !job) return null;

  const handleSubmit = async () => {
    if (alreadyApplied) {
      toast.info("Você já se candidatou a esta O.S.");
      onClose();
      return;
    }
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabaseExternal.auth.getUser();
      if (!user) {
        toast.error("Faça login para se candidatar.");
        setLoading(false);
        return;
      }
      const payload = {
        provider_id: user.id,
        job_id: job.id,
        contractor_id: job.contractor.id,
        message: message.trim() || null,
        status: "pendente",
      };
      const { error } = await supabaseExternal
        .from("service_applications")
        .upsert(payload, { onConflict: "provider_id,job_id", ignoreDuplicates: true });
      if (error) {
        // Fallback silencioso: se a tabela ainda não existir, apenas marca localmente.
        console.warn("[feed] service_applications indisponível:", error.message);
        toast.warning("Candidatura registrada localmente", {
          description: "Sincronização com o banco pendente.",
        });
      } else {
        toast.success("Candidatura enviada!", {
          description: `Você se candidatou à O.S. de ${job.contractor.name}.`,
        });
      }
      onApplied(job.id);
      setMessage("");
      onClose();
    } catch (err) {
      console.warn("[feed] erro ao candidatar:", err);
      toast.error("Não foi possível enviar sua candidatura.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#1A1A1B] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1">
          <h3 className="text-sm font-black text-white uppercase italic tracking-tight">
            {alreadyApplied ? "Candidatura já enviada" : "Candidatar-se à O.S."}
          </h3>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{job.title}</p>
        </div>

        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">
              Contratante
            </span>
            <span className="text-[10px] font-black text-white">{job.contractor.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Valor</span>
            <span className="text-[10px] font-black text-[#FF9F0A]">{job.value}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Cidade</span>
            <span className="text-[10px] font-black text-white">
              {job.city}/{job.state}
            </span>
          </div>
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={alreadyApplied}
          placeholder="Escreva uma mensagem breve para o contratante..."
          className="w-full min-h-[100px] bg-black/30 border border-white/10 rounded-2xl p-4 text-xs text-white placeholder:text-muted-foreground outline-none focus:border-[#FF9F0A]/50 resize-none disabled:opacity-50"
        />

        <button
          onClick={handleSubmit}
          disabled={loading || alreadyApplied}
          className="w-full py-3.5 rounded-xl bg-[#FF9F0A] text-black font-black uppercase italic text-xs tracking-widest hover:shadow-[0_0_20px_rgba(255,159,10,0.4)] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Enviando...
            </>
          ) : alreadyApplied ? (
            <>
              <CheckCircle2 className="w-4 h-4" /> Candidatura já enviada
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" /> Confirmar Candidatura
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// LIGHTBOX
// =============================================================================

function Lightbox({ job, index, onClose }: { job: JobPost; index: number; onClose: () => void }) {
  const [current, setCurrent] = useState(index);

  const next = useCallback(() => {
    setCurrent((i) => (i + 1) % job.media.length);
  }, [job.media.length]);

  const prev = useCallback(() => {
    setCurrent((i) => (i - 1 + job.media.length) % job.media.length);
  }, [job.media.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, next, prev]);

  const item = job.media[current];

  return (
    <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="relative w-full max-w-4xl max-h-[80vh] flex items-center justify-center">
        {job.media.length > 1 && (
          <button
            onClick={prev}
            className="absolute left-2 md:left-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {item.type === "video" ? (
          <video
            src={item.url}
            poster={item.poster}
            controls
            className="max-w-full max-h-[80vh] rounded-2xl border border-white/10"
          />
        ) : (
          <img
            src={item.url}
            alt={`Mídia ${current + 1}`}
            className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-white/10"
          />
        )}

        {job.media.length > 1 && (
          <button
            onClick={next}
            className="absolute right-2 md:right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {job.media.length > 1 && (
        <div className="flex items-center gap-2 mt-4">
          {job.media.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-colors ${i === current ? "bg-[#FF9F0A]" : "bg-white/20"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CARD DE O.S.
// =============================================================================

function JobCardImpl({
  job,
  saved,
  applied,
  onToggleSave,
  onApply,
  onChat,
  onLightbox,
  onOpenDetails,
  locked = false,
  unlockCost = 5,
  unlockBusy = false,
  onUnlock,
  currentUserId,
  onEdit,
  onDelete,
  onTogglePause,
  isPaused,
}: {
  job: JobPost;
  saved: boolean;
  applied: boolean;
  onToggleSave: (id: string) => void;
  onApply: (job: JobPost) => void;
  onChat: (job: JobPost) => void;
  onLightbox: (job: JobPost, index: number) => void;
  onOpenDetails: (job: JobPost) => void;
  locked?: boolean;
  unlockCost?: number;
  unlockBusy?: boolean;
  onUnlock?: () => void | Promise<void>;
  currentUserId?: string | null;
  onEdit?: (job: JobPost) => void;
  onDelete?: (job: JobPost) => void;
  onTogglePause?: (job: JobPost) => void;
  isPaused?: boolean;
}) {
  const navigate = useNavigate();
  const isClientFinal = job.type === "cliente_final";
  const cardTheme = getCategoryTheme(isClientFinal ? "cliente" : "lojista");
  const status = getFeedStatus(job.id);
  const statusColor = FEED_STATUS_COLOR[status];
  const contractorHref = isClientFinal ? "/cliente/$id" : "/lojista/$id";
  const userCoords = useUserCoords();
  const distanceLabel = formatDistanceFromCity(job.city, userCoords);


  return (
    <article
      className="relative rounded-3xl border-2 bg-[#1A1A1B] overflow-hidden transition-all group"
      style={{ ...cardTheme.borderStrong, ...cardTheme.glow }}
    >
      <div
        className="absolute top-0 inset-x-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${cardTheme.hex}, transparent)` }}
      />

      <div className="p-4 space-y-4">
        {/* CABEÇALHO */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to={contractorHref}
              params={{ id: job.contractor.id }}
              className="hover:scale-105 transition-transform"
            >
              <Avatar initials={job.contractor.initials} />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to={contractorHref}
                  params={{ id: job.contractor.id }}
                  className="text-[11px] font-black text-white uppercase italic truncate hover:opacity-80"
                >
                  {job.contractor.name}
                </Link>
                {job.contractor.isVerified && <CheckCircle2 className="w-3 h-3" style={{ color: cardTheme.hex }} />}
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border"
                  style={{
                    color: statusColor,
                    borderColor: `${statusColor}55`,
                    backgroundColor: `${statusColor}18`,
                  }}
                >
                  <span className="w-1 h-1 rounded-full" style={{ backgroundColor: statusColor }} />
                  {FEED_STATUS_LABEL[status]}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" style={{ color: cardTheme.hex }} /> {job.city}/{job.state}
                  {distanceLabel && <span className="text-white/40 normal-case ml-1">• {distanceLabel}</span>}
                </span>
                <RatingStars value={job.rating} />
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <TypeBadge type={job.type} />
                <UrgencyBadge urgency={job.urgency} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">
              {job.postedAt}
            </span>
            <FeedAdMenu
              ownerId={job.contractor.id}
              currentUserId={currentUserId ?? null}
              adId={job.id}
              ownerName={job.contractor.name}
              isPaused={isPaused}
              onEdit={onEdit ? () => onEdit(job) : undefined}
              onDelete={onDelete ? () => onDelete(job) : undefined}
              onTogglePause={onTogglePause ? () => onTogglePause(job) : undefined}
              accent={cardTheme.hex}
            />
          </div>
        </div>

        {/* ESPECIFICAÇÕES */}
        <div className="space-y-2">
          <h4
            className="text-[13px] font-black text-white uppercase italic leading-tight transition-colors group-hover:[color:var(--card-accent)]"
            style={{ ["--card-accent" as any]: cardTheme.hex }}
          >
            {job.title}
          </h4>
          <p
            className={`text-[10px] text-muted-foreground font-medium leading-relaxed line-clamp-3 ${
              locked ? "blur-sm select-none pointer-events-none" : ""
            }`}
            aria-hidden={locked || undefined}
          >
            {job.description}
          </p>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {job.subcategory && (
              <span
                className="px-2 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-widest"
                style={{ ...cardTheme.bgSoft, ...cardTheme.borderSoft, color: cardTheme.hex }}
              >
                {job.subcategory}
              </span>
            )}
            {job.requirements.slice(0, 2).map((req, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-muted-foreground text-[8px] font-bold uppercase tracking-widest"
              >
                {req}
              </span>
            ))}
          </div>
          {/* Badges de urgência/raio/tags derivados do JobPost */}
          <AdMetaBadges
            urgency={coerceUrgency(job.urgency) ?? "normal"}
            radiusKm={job.urgency === "critica" ? 5 : job.urgency === "urgente" ? 15 : 30}
            tags={[job.subcategory, ...(job.tools ?? []).slice(0, 2)]
              .map((s) => s.toLowerCase().replace(/\s+/g, "-"))
              .filter(Boolean)}
            theme={cardTheme}
            compact
          />

          {job.tools.length > 0 && (
            <div className="text-[9px] text-muted-foreground">
              <span className="font-bold text-white/70 uppercase">Ferramentas:</span>{" "}
              {job.tools.join(", ")}
            </div>
          )}
        </div>

        {/* MÍDIA */}
        {job.media.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {job.media.map((item, i) => (
              <button
                key={i}
                onClick={() => (locked ? onUnlock?.() : onLightbox(job, i))}
                className={`relative shrink-0 w-28 h-20 rounded-xl overflow-hidden border border-white/10 bg-black/40 group/media focus:outline-none focus:ring-2 ${
                  locked ? "pointer-events-none" : ""
                }`}
                style={{ outlineColor: `${cardTheme.hex}80` } as any}
                aria-label={locked ? "Mídia bloqueada" : undefined}
              >
                {item.type === "video" ? (
                  <>
                    <img
                      src={thumbSrc(item.poster || item.url, 640)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className={`w-full h-full object-cover opacity-80 group-hover/media:opacity-100 transition-opacity ${
                        locked ? "blur-md" : ""
                      }`}
                    />
                    {!locked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="w-6 h-6 text-white fill-current" />
                      </div>
                    )}
                  </>
                ) : (
                  <img
                    src={thumbSrc(item.url, 640)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className={`w-full h-full object-cover group-hover/media:scale-105 transition-transform duration-500 ${
                      locked ? "blur-md" : ""
                    }`}
                  />
                )}
                {locked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Lock className="w-4 h-4 text-white/80" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* VALOR E AÇÕES */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <div className="flex flex-col">
            <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">
              Remuneração
            </span>
            <span className="text-xs font-black" style={{ color: cardTheme.hex }}>{job.value}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleSave(job.id)}
              className={`p-2.5 rounded-xl border transition-all ${
                saved
                  ? ""
                  : "bg-white/5 border-white/10 text-white hover:bg-white/10"
              }`}
              style={
                saved
                  ? { ...cardTheme.bgSoft, ...cardTheme.borderSoft, color: cardTheme.hex }
                  : undefined
              }
              aria-label={saved ? "Remover dos salvos" : "Salvar vaga"}
            >
              <Bookmark className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
            </button>

            {locked ? (
              <button
                onClick={() => onUnlock?.()}
                disabled={unlockBusy}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FFD600] text-black font-black uppercase italic text-[9px] tracking-widest hover:shadow-[0_0_20px_rgba(255,214,0,0.45)] active:scale-[0.98] transition-all disabled:opacity-60"
                aria-label={`Desbloquear por ${unlockCost} moedas`}
              >
                {unlockBusy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Coins className="w-3.5 h-3.5" />
                    🔍 Ver Detalhes ({unlockCost} 🪙)
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={() => onChat(job)}
                  className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white transition-all hover:[background-color:color-mix(in_oklab,var(--card-accent)_12%,transparent)] hover:[border-color:color-mix(in_oklab,var(--card-accent)_35%,transparent)]"
                  style={{ ["--card-accent" as any]: cardTheme.hex }}
                  aria-label="Chat direto"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onOpenDetails(job)}
                  className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 text-[9px] font-black uppercase tracking-widest transition-all"
                >
                  Detalhes
                </button>

                <button
                  onClick={() => onApply(job)}
                  disabled={applied}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black uppercase italic text-[9px] tracking-widest active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ backgroundColor: cardTheme.hex, color: "#0A0A0B", boxShadow: `0 0 20px rgba(${cardTheme.rgb}, 0.4)` }}
                >
                  {applied ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Candidatado
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" /> Candidatar-se
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* GLOW DECORATIVO */}
      <div className="absolute -right-4 -bottom-4 w-24 h-24 blur-3xl rounded-full pointer-events-none" style={{ backgroundColor: `rgba(${cardTheme.rgb}, 0.08)` }} />
    </article>
  );
}

const JobCard = memo(JobCardImpl);

// =============================================================================
// PÁGINA PRINCIPAL
// =============================================================================

export default function FeedPrestadorPage() {
  const navigate = useNavigate();
  const { glassClass } = usePerformanceMode();
  const postUnlock = usePostUnlock();

  const [filter, setFilter] = usePersistedState<"todas" | Subcategory>("fixxer_feed_prestador_filter", "todas");
  const [statusFilter, setStatusFilter] = usePersistedState<StatusFilterKey>("fixxer_feed_prestador_status", "todos");
  const {
    urgency: urgencyFilter,
    distance: distanceFilter,
    tag: tagFilter,
    setUrgency: setUrgencyFilter,
    setDistance: setDistanceFilter,
    setTag: setTagFilter,
  } = useAdFilterSearchState("/_authenticated/feed/prestador");
  const [detailsFor, setDetailsFor] = useState<JobPost | null>(null);
  const [search, setSearch] = usePersistedState<string>("fixxer_feed_prestador_search", "");
  useEffect(() => {
    const h = (e: Event) => {
      const q = (e as CustomEvent<{ query?: string }>).detail?.query ?? "";
      setSearch(q);
    };
    window.addEventListener("fixxer:universal-search", h as EventListener);
    return () => window.removeEventListener("fixxer:universal-search", h as EventListener);
  }, [setSearch]);
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [applyFor, setApplyFor] = useState<JobPost | null>(null);
  const [lightbox, setLightbox] = useState<{ job: JobPost; index: number } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [savesRemote, setSavesRemote] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Debounce de busca
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 220);
    return () => clearTimeout(t);
  }, [search]);

  // Carregar salvos (localStorage instantâneo + sync Supabase)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVES_STORAGE_KEY);
      if (raw) setSaved(new Set(JSON.parse(raw)));
    } catch {
      // ignore
    }

    (async () => {
      try {
        const {
          data: { user },
        } = await supabaseExternal.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        // Salvos remotos (reusa feed_post_saves)
        const { data: savesData, error: savesErr } = await supabaseExternal
          .from("feed_post_saves")
          .select("post_id")
          .eq("user_id", user.id);
        if (!savesErr && savesData) {
          setSavesRemote(true);
          const remote = new Set<string>(savesData.map((r: { post_id: string }) => r.post_id));
          setSaved((prev) => {
            const merged = new Set([...prev, ...remote]);
            const missing = [...prev].filter((id) => !remote.has(id));
            if (missing.length > 0) {
              void supabaseExternal.from("feed_post_saves").upsert(
                missing.map((post_id) => ({ user_id: user.id, post_id })),
                { onConflict: "user_id,post_id" },
              );
            }
            return merged;
          });
        } else if (savesErr) {
          console.warn(
            "[feed] feed_post_saves indisponível, usando localStorage.",
            savesErr.message,
          );
        }

        // Candidaturas do usuário
        const { data: appsData, error: appsErr } = await supabaseExternal
          .from("service_applications")
          .select("job_id")
          .eq("provider_id", user.id);
        if (!appsErr && appsData) {
          setApplied(new Set(appsData.map((r: { job_id: string }) => r.job_id)));
        } else if (appsErr) {
          console.warn("[feed] service_applications indisponível:", appsErr.message);
        }
      } catch (err) {
        console.warn("[feed] falha ao sincronizar dados do prestador:", err);
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

  const [posts, setPosts] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
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
        category: "prestador",
        type: filter === "todas" ? "todos" : (filter as any),
        query: debouncedSearch,
        status: statusFilter,
        offset: isRefresh ? 0 : offset,
        limit: 10
      });

      const mapped: JobPost[] = results.map(p => ({
        id: p.id,
        type: p.category === "lojista" ? "lojista" : "cliente_final",
        contractor: {
          id: p.authorId,
          name: p.author?.presentation.name || "Contratante",
          initials: p.author?.presentation.initials || "??",
          isVerified: p.author?.identity.isVerified
        },
        city: p.location.city || "Região",
        state: p.location.state || "",
        rating: p.author?.identity.karmaScore || 5,
        postedAt: new Date(p.createdAt).toLocaleDateString("pt-BR"),
        urgency: p.urgency as any,
        subcategory: (p.metadata?.subcategory || "Montagem de Móveis") as Subcategory,
        title: p.title,
        description: p.description,
        value: p.price ? `R$ ${p.price.toLocaleString("pt-BR")}` : "A combinar",
        valueType: "total", // Adicionado para satisfazer o tipo JobPost
        requirements: (p.metadata?.requirements || []) as string[],
        tools: (p.metadata?.tools || []) as string[],
        media: p.media as any,
        keywords: []
      }));


      setPosts(prev => isRefresh ? mapped : [...prev, ...mapped]);
      setHasMoreResult(results.length === 10);
      setOffset(prev => isRefresh ? 10 : prev + 10);
    } catch (err: any) {
      setLoadError(err.message || "Erro ao carregar vagas.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, debouncedSearch, statusFilter, offset]);

  useEffect(() => {
    loadFeed(true);
  }, [filter, debouncedSearch, statusFilter]);

  const filtered = posts;


  const branchCtx = useUserBranchContext();
  const rankedFiltered = useMemo(() => {
    const decorated = filtered.map((job) => ({
      job,
      _relevance: scoreRelevanceDetailed([job.subcategory, job.title], branchCtx),
    }));
    if (!branchCtx.hasContext) return decorated;
    const sorted = [...decorated].sort(
      (a, b) => relevanceRank(a._relevance.level) - relevanceRank(b._relevance.level),
    );
    return applyRelevanceFallback(sorted, 3);
  }, [filtered, branchCtx]);

  // Paginação por scroll infinito
  const paged = rankedFiltered.map(x => x.job);
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

  const toggleSave = useCallback(
    (id: string) => {
      setSaved((prev) => {
        const next = new Set(prev);
        const willSave = !next.has(id);
        if (willSave) {
          next.add(id);
          toast.success("Vaga salva", {
            description: savesRemote
              ? "Disponível em qualquer dispositivo."
              : "Faça login para sincronizar entre dispositivos.",
          });
        } else {
          next.delete(id);
          toast("Vaga removida dos salvos");
        }
        void persistSave(id, willSave);
        return next;
      });
    },
    [persistSave, savesRemote],
  );

  const openChatWith = useCallback(
    (job: JobPost) => {
      const peerId = job.contractor.id;
      if (!peerId) {
        toast.error("Contratante sem canal de chat disponível.");
        return;
      }
      try {
        const { setAdChatContext } = require("@/lib/ad-chat-context") as typeof import("@/lib/ad-chat-context");
        setAdChatContext(peerId, {
          adId: job.id,
          title: job.title,
          category: String(job.subcategory),
          cover: job.media?.[0]?.type === "image" ? job.media[0].url : null,
          priceLabel: job.value || null,
          urgency: job.urgency || null,
          cta: "orcamento",
        });
      } catch { /* silencioso */ }
      navigate({ to: "/chat/$peerId", params: { peerId } }).catch(() => {
        navigate({ to: "/chat" }).catch(() => undefined);
      });
    },
    [navigate],
  );

  const searching = search !== debouncedSearch;

  return (
    <PullToRefresh onRefresh={handleRefresh} accent="#FF9F0A">
    <div className="min-h-screen bg-[#0A0A0B] text-foreground pb-24 animate-in fade-in duration-500">
      <UniversalSearchPanel defaultPill="prestador" />

      {/* TOPBAR FIXO */}
      <header className="sticky top-0 z-50 bg-[#0A0A0B]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-3 space-y-2">
          <div className="min-w-0 px-3 sm:px-4">
            <h1 className="text-base font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#FF9F0A]" /> Feed do Prestador
            </h1>
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest truncate">
              Mural de Oportunidades e O.S.
            </p>
          </div>

          <FeedFiltersBar
            accent="#FF9F0A"
            category="prestador"
            resultCount={filtered.length}
            resultLabel="vaga"
            backSlot={
              <button
                onClick={() => navigate({ to: "/dashboard/prestador" })}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center justify-center shrink-0"
                aria-label="Voltar para dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            }
            onMacroSearchTerm={(term) => setSearch(term ?? "")}
            pillLabel="Especialidade"
            pillOptions={FILTERS.map((f) => ({ key: f.key, label: f.label, icon: f.icon }))}
            pillValue={filter}
            onPillChange={(k) => setFilter(k as typeof filter)}
            statusValue={statusFilter}
            onStatusChange={setStatusFilter}
            urgencyValue={urgencyFilter}
            onUrgencyChange={setUrgencyFilter}
            distanceValue={distanceFilter}
            onDistanceChange={setDistanceFilter}
            badgeSlot={<OpportunitiesBadge category="prestador" />}
          />
        </div>
      </header>

      {/* CONTEÚDO */}
      <main className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {loadError && (
          <FeedErrorState
            accent="#FF9F0A"
            busy={refreshing}
            error={loadError}
            onRetry={handleRefresh}
          />
        )}
        <B2BSuggestionsCard />
        {/* Skeleton de busca */}
        {searching && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 rounded-3xl bg-[#1A1A1B] border border-white/5 animate-pulse"
              />
            ))}
          </div>
        )}

        {!searching && filtered.length === 0 && (
          <FeedEmptyState
            accent="#FF9F0A"
            title="Nenhuma vaga encontrada"
            searchTerm={debouncedSearch}
            filterLabel={filter !== "todas" ? FILTERS.find((f) => f.key === filter)?.label : undefined}
            hasActiveFilters={!!debouncedSearch || filter !== "todas" || statusFilter !== "todos"}
            onReset={() => {
              setFilter("todas");
              setSearch("");
              setStatusFilter("todos");
            }}
            suggestions={["montagem", "medição", "cozinha", "sorocaba", "planejados"]}
            onSuggestion={(term) => setSearch(term)}
          />
        )}

        {!searching &&
          paged.map((job) => {
            const _relevance = scoreRelevanceDetailed([job.subcategory, job.title], branchCtx);
            return (
            <div key={job.id} className="feed-item-cv relative">
              {_relevance.level !== "none" && (
                <div className="absolute right-3 top-3 z-10">
                  <RelevanceBadge result={_relevance} compact />
                </div>
              )}
              <JobCard
                job={job}
                saved={saved.has(job.id)}
                applied={applied.has(job.id)}
                onToggleSave={toggleSave}
                onApply={setApplyFor}
                onChat={openChatWith}
                onLightbox={(job, index) => setLightbox({ job, index })}
                onOpenDetails={setDetailsFor}
                locked={job.contractor.id !== postUnlock.userId && !postUnlock.isUnlocked(job.id)}
                unlockCost={postUnlock.cost}
                unlockBusy={postUnlock.busy === job.id}
                onUnlock={() => { void postUnlock.unlock(job.id); }}
                currentUserId={postUnlock.userId}
                onEdit={(j) => toast(`Abrindo editor do anúncio "${j.title}"...`)}
                onDelete={(j) => toast.error(`Excluir "${j.title}"? Confirme em Meus Anúncios.`)}
                onTogglePause={(j) => toast(`Alternando pausa para "${j.title}"...`)}
              />
            </div>
            );
          })}

        {/* Sentinel de scroll infinito */}
        {!searching && filtered.length > 0 && (
          <>
            {hasMore ? (
              <>
                <div ref={sentinelRef} aria-hidden className="h-1 w-full" />
                <FeedCardSkeletonList count={2} accent="rgba(255,159,10,0.25)" />
              </>
            ) : (
              <div className="py-4 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                — Fim do feed —
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAIS */}
      <ApplyModal
        job={applyFor}
        isOpen={!!applyFor}
        alreadyApplied={applyFor ? applied.has(applyFor.id) : false}
        onClose={() => setApplyFor(null)}
        onApplied={(jobId) =>
          setApplied((prev) => {
            const next = new Set(prev);
            next.add(jobId);
            return next;
          })
        }
      />

      {lightbox && (
        <Lightbox job={lightbox.job} index={lightbox.index} onClose={() => setLightbox(null)} />
      )}

      <FeedDetailsModal
        data={
          detailsFor
            ? ({
                id: detailsFor.id,
                title: detailsFor.title,
                description: detailsFor.description,
                category: detailsFor.type === "cliente_final" ? "cliente" : "lojista",
                status: getFeedStatus(detailsFor.id),
                author: {
                  id: detailsFor.contractor.id,
                  name: detailsFor.contractor.name,
                  initials: detailsFor.contractor.initials,
                },
                authorHref:
                  detailsFor.type === "cliente_final"
                    ? `/cliente/${detailsFor.contractor.id}`
                    : `/lojista/${detailsFor.contractor.id}`,
                city: `${detailsFor.city}/${detailsFor.state}`,
                postedAt: detailsFor.postedAt,
                rating: detailsFor.rating,
                badges: [detailsFor.subcategory],
                metaRows: [
                  { label: "Valor", value: detailsFor.value },
                  { label: "Local", value: `${detailsFor.city}/${detailsFor.state}` },
                  { label: "Publicado", value: detailsFor.postedAt },
                ],
                media: detailsFor.media,
                ctaLabel: applied.has(detailsFor.id) ? "Candidatado" : "Candidatar-se",
              } satisfies FeedDetailsData)
            : null
        }
        isSaved={detailsFor ? saved.has(detailsFor.id) : false}
        onSave={() => detailsFor && toggleSave(detailsFor.id)}
        onChat={() => {
          if (detailsFor) {
            const j = detailsFor;
            setDetailsFor(null);
            openChatWith(j);
          }
        }}
        onClose={() => setDetailsFor(null)}
        locked={detailsFor ? detailsFor.contractor.id !== postUnlock.userId && !postUnlock.isUnlocked(detailsFor.id) : false}
        unlockCost={postUnlock.cost}
        onUnlock={async () => {
          if (!detailsFor) return false;
          return await postUnlock.unlock(detailsFor.id);
        }}
      />
    </div>
    </PullToRefresh>
  );
}
