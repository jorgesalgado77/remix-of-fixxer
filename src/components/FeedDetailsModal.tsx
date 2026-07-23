import { X, Bookmark, MessageSquare, MapPin, Clock, Star, Play } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getCategoryTheme, type CategoryKey } from "@/lib/category-colors";
import {
  FEED_STATUS_COLOR,
  FEED_STATUS_LABEL,
  type FeedStatus,
} from "@/lib/feed-status";

export type DetailsMedia = { type: "image" | "video"; url: string; poster?: string };

export type FeedDetailsData = {
  id: string;
  title: string;
  description: string;
  category: CategoryKey;
  status?: FeedStatus;
  author: { id: string; name: string; initials: string };
  authorHref?: string; // ex: "/lojista/u-loja-123"
  city?: string;
  postedAt?: string;
  rating?: number;
  badges?: string[];       // labels adicionais (subcategoria, tools…)
  metaRows?: { label: string; value: string }[];
  media?: DetailsMedia[];
  ctaLabel?: string;       // padrão: "Entrar em contato"
};

export function FeedDetailsModal({
  data,
  isSaved,
  onSave,
  onChat,
  onClose,
}: {
  data: FeedDetailsData | null;
  isSaved: boolean;
  onSave: () => void;
  onChat: () => void;
  onClose: () => void;
}) {
  if (!data) return null;
  const theme = getCategoryTheme(data.category);
  const statusColor = data.status ? FEED_STATUS_COLOR[data.status] : null;

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-2 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col bg-[#111] rounded-3xl border-2 shadow-2xl"
        style={{ ...theme.borderStrong, ...theme.glowStrong }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {data.authorHref ? (
              <Link
                to={data.authorHref}
                onClick={onClose}
                className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center font-black text-sm bg-[#0A0A0B] border-2 hover:scale-105 transition-transform"
                style={{ ...theme.borderStrong, ...theme.color }}
                aria-label={`Ver perfil de ${data.author.name}`}
              >
                {data.author.initials}
              </Link>
            ) : (
              <div
                className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center font-black text-sm bg-[#0A0A0B] border-2"
                style={{ ...theme.borderStrong, ...theme.color }}
              >
                {data.author.initials}
              </div>
            )}
            <div className="min-w-0">
              {data.authorHref ? (
                <Link
                  to={data.authorHref}
                  onClick={onClose}
                  className="text-sm font-black text-white uppercase tracking-tight truncate hover:opacity-80 block"
                >
                  {data.author.name}
                </Link>
              ) : (
                <h4 className="text-sm font-black text-white uppercase tracking-tight truncate">
                  {data.author.name}
                </h4>
              )}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-white/60 mt-0.5">
                {typeof data.rating === "number" && (
                  <span className="inline-flex items-center gap-1 font-bold" style={theme.color}>
                    <Star className="w-3 h-3" style={theme.fill} />
                    {data.rating.toFixed(1)}
                  </span>
                )}
                {data.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {data.city}
                  </span>
                )}
                {data.postedAt && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {data.postedAt}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 shrink-0 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/70"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo com scroll */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Badges topo: status + extras */}
          <div className="flex flex-wrap gap-2">
            {data.status && statusColor && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border"
                style={{
                  color: statusColor,
                  borderColor: `${statusColor}55`,
                  backgroundColor: `${statusColor}18`,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: statusColor }}
                />
                {FEED_STATUS_LABEL[data.status]}
              </span>
            )}
            {data.badges?.map((b, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border"
                style={{ ...theme.bgSoft, ...theme.borderSoft, ...theme.color }}
              >
                {b}
              </span>
            ))}
          </div>

          {/* Título + descrição */}
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white uppercase italic tracking-tight leading-tight">
              {data.title}
            </h2>
            <p className="mt-2 text-sm text-white/75 leading-relaxed whitespace-pre-line">
              {data.description}
            </p>
          </div>

          {/* Meta rows */}
          {data.metaRows && data.metaRows.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {data.metaRows.map((m, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/50">
                    {m.label}
                  </div>
                  <div className="text-xs font-bold text-white mt-0.5">{m.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Mídia */}
          {data.media && data.media.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {data.media.map((m, i) =>
                m.type === "video" ? (
                  <div
                    key={i}
                    className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black"
                  >
                    <video
                      src={m.url}
                      poster={m.poster}
                      controls
                      className="w-full h-full object-cover"
                    />
                    <div
                      className="absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ ...theme.bgSolid }}
                    >
                      <Play className="w-3.5 h-3.5" fill="currentColor" />
                    </div>
                  </div>
                ) : (
                  <img
                    key={i}
                    src={m.url}
                    alt={data.title}
                    loading="lazy"
                    className="w-full aspect-video object-cover rounded-2xl border border-white/10"
                  />
                ),
              )}
            </div>
          )}
        </div>

        {/* Footer com ações */}
        <div className="flex items-center gap-2 p-3 border-t border-white/10 bg-[#0A0A0B]/60">
          <button
            onClick={onSave}
            aria-pressed={isSaved}
            className="p-3 rounded-xl border transition-colors"
            style={
              isSaved
                ? { ...theme.bgSoft, ...theme.borderSoft, ...theme.color }
                : {
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderColor: "rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.7)",
                  }
            }
            aria-label={isSaved ? "Remover dos salvos" : "Salvar"}
          >
            <Bookmark className="w-4 h-4" style={isSaved ? theme.fill : undefined} />
          </button>
          <button
            onClick={onChat}
            className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:opacity-90"
            style={{ ...theme.bgSolid, ...theme.glow }}
          >
            <MessageSquare className="w-4 h-4" />
            {data.ctaLabel ?? "Entrar em contato"}
          </button>
        </div>
      </div>
    </div>
  );
}
