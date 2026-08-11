import { useState, useEffect } from "react";
import { X, Bookmark, MessageSquare, MapPin, Clock, Star, Play, Lock, Coins, Loader2, Zap, User, Trash2, CheckCircle2 } from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { useOSWorkflow } from "@/hooks/use-os-workflow";
import { toast } from "sonner";
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
  isOwner?: boolean;
};

export function FeedDetailsModal({
  data,
  isSaved,
  onSave,
  onChat,
  onClose,
  locked = false,
  unlockCost = 5,
  onUnlock,
  onCandidatar,
}: {
  data: FeedDetailsData | null;
  isSaved: boolean;
  onSave: () => void;
  onChat: () => void;
  onClose: () => void;
  /** Se true, oculta descrição, contato e chat até desbloquear (custa `unlockCost` moedas). */
  locked?: boolean;
  unlockCost?: number;
  onUnlock?: () => Promise<boolean> | boolean;
  /** Aparece quando desbloqueado — botão "⚡ Candidatar-se". */
  onCandidatar?: () => void;
}) {
  const [unlocking, setUnlocking] = useState(false);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const { acceptProposal: acceptOSProposal, isAccepting } = useOSWorkflow();

  const loadProposals = async () => {
    if (!data || !data.isOwner) return;
    setLoadingProposals(true);
    try {
      const { data: list, error } = await supabaseExternal
        .from("proposals")
        .select(`
          *,
          prestador:profiles(id, display_name, name, avatar_url)
        `)
        .eq("os_id", data.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProposals(list || []);
    } catch (err) {
      console.error("[FeedDetails] Erro ao carregar propostas:", err);
    } finally {
      setLoadingProposals(false);
    }
  };

  useEffect(() => {
    if (data?.isOwner) loadProposals();
  }, [data?.id, data?.isOwner]);

  if (!data) return null;
  const theme = getCategoryTheme(data.category);
  const statusColor = data.status ? FEED_STATUS_COLOR[data.status] : null;

  const doUnlock = async () => {
    if (!onUnlock) return;
    try {
      setUnlocking(true);
      await onUnlock();
    } finally {
      setUnlocking(false);
    }
  };

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
          <div className="relative">
            <h2 className="text-lg sm:text-xl font-black text-white uppercase italic tracking-tight leading-tight">
              {data.title}
            </h2>
            <p
              className={`mt-2 text-sm text-white/75 leading-relaxed whitespace-pre-line ${
                locked ? "blur-sm select-none pointer-events-none max-h-24 overflow-hidden" : ""
              }`}
            >
              {data.description}
            </p>
            {locked && (
              <div className="mt-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-center space-y-2">
                <div className="inline-flex items-center gap-2 text-amber-300 text-[11px] font-black uppercase tracking-widest">
                  <Lock className="w-3.5 h-3.5" /> Dados completos bloqueados
                </div>
                <p className="text-[11px] text-white/70">
                  Desbloqueie por <b className="text-amber-300">{unlockCost} moedas</b> para ver descrição
                  completa, contato direto e liberar o chat.
                </p>
                <button
                  onClick={doUnlock}
                  disabled={unlocking || !onUnlock}
                  className="w-full py-2.5 rounded-xl bg-amber-500 text-black text-[11px] font-black uppercase tracking-widest disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {unlocking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Coins className="w-3.5 h-3.5" />}
                  Ver Detalhes (−{unlockCost} moedas)
                </button>
              </div>
            )}
          </div>

          {/* Meta rows */}
          {!locked && data.metaRows && data.metaRows.length > 0 && (
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
          {!locked && data.media && data.media.length > 0 && (
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

          {/* Seção de Propostas para o Dono */}
          {data.isOwner && (
            <div className="mt-6 border-t border-white/10 pt-6">
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#00FF87]" /> Propostas Recebidas
              </h3>
              
              {loadingProposals ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-white/30" />
                </div>
              ) : proposals.length === 0 ? (
                <div className="text-center py-8 rounded-2xl border-2 border-dashed border-white/5 bg-white/2">
                  <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Nenhuma proposta ainda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {proposals.map((p) => (
                    <div 
                      key={p.id} 
                      className="p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/[0.08] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#222] border border-white/10 flex items-center justify-center font-bold text-xs">
                            {p.prestador?.display_name?.[0] || "?"}
                          </div>
                          <div>
                            <div className="text-xs font-black text-white uppercase">{p.prestador?.display_name || "Prestador"}</div>
                            <div className="text-[10px] text-white/50">{new Date(p.created_at).toLocaleDateString("pt-BR")}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-[#00FF87]">R$ {Number(p.value).toLocaleString("pt-BR")}</div>
                          <div className={`text-[9px] font-black uppercase tracking-widest ${
                            p.status === 'aceita' ? 'text-[#00FF87]' : 
                            p.status === 'recusada' ? 'text-red-500' : 'text-amber-500'
                          }`}>
                            {p.status}
                          </div>
                        </div>
                      </div>
                      
                      {p.message && (
                        <p className="mt-3 text-xs text-white/70 italic bg-black/20 p-2 rounded-lg border border-white/5">
                          "{p.message}"
                        </p>
                      )}

                      {p.status === 'pendente' && (
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => {
                              acceptOSProposal({ data: { proposalId: p.id } });
                              setTimeout(loadProposals, 1000);
                            }}
                            disabled={isAccepting}
                            className="flex-1 py-2 rounded-xl bg-[#00FF87] text-black text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-transform disabled:opacity-50"
                          >
                            {isAccepting ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "Aceitar Proposta"}
                          </button>
                          <button
                            onClick={async () => {
                              const { error } = await supabaseExternal
                                .from("proposals")
                                .update({ status: 'recusada' })
                                .eq("id", p.id);
                              if (error) toast.error("Erro ao recusar");
                              else {
                                toast.success("Proposta recusada");
                                loadProposals();
                              }
                            }}
                            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {p.status === 'aceita' && (
                        <div className="mt-4 p-2 rounded-xl bg-[#00FF87]/10 border border-[#00FF87]/30 flex items-center justify-center gap-2 text-[#00FF87] text-[10px] font-black uppercase tracking-widest">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Contratação realizada
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
            disabled={locked}
            className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ ...theme.bgSolid, ...theme.glow }}
            title={locked ? "Desbloqueie os detalhes para conversar" : undefined}
          >
            {locked ? <Lock className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
            {locked ? "💬 Chat Direto (bloqueado)" : (data.ctaLabel ?? "💬 Chat Direto")}
          </button>
          {onCandidatar && (
            <button
              onClick={onCandidatar}
              disabled={locked}
              className="py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 bg-[#00FF87] text-black disabled:opacity-40 disabled:cursor-not-allowed"
              title={locked ? "Desbloqueie os detalhes para se candidatar" : "Candidatar-se a esta oportunidade"}
            >
              <Zap className="w-4 h-4" /> Candidatar-se
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
