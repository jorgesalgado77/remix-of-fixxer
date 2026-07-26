import { memo } from "react";
import {
  Archive,
  ArchiveRestore,
  Bell,
  BellOff,
  ChevronRight,
  Loader2,
  MailOpen,
  MoreVertical,
  Paperclip,
  CheckCheck,
  AlertCircle,
  UserCircle2,
} from "lucide-react";

type LastStatus = "pending" | "failed" | "sent" | null;

export type ThreadCardConversation = {
  peerId: string;
  peerName: string;
  peerAvatar: string | null;
  peerRole: string | null;
  peerIsFallback: boolean;
  peerInitials: string;
  lastMessage: string;
  lastAttachmentType: string | null;
  lastMessageId: string | null;
  lastAt: string;
  lastMine: boolean;
  lastStatus: LastStatus;
  unread: number;
  archived: boolean;
  muted: boolean;
  linkedAd?: { title?: string; category?: string; distanceKm?: number | null } | null | any;
};

export type ThreadCardTheme = { hex: string; rgb: string; label: string };

type Props = {
  c: ThreadCardConversation;
  theme: ThreadCardTheme;
  activeTerms: string[];
  historySnippet: string | null;
  isTyping: boolean;
  isOnline: boolean;
  menuOpen: boolean;
  HighlightComponent: React.ComponentType<{ text: string; terms: string[]; className?: string }>;
  onOpen: (peerId: string) => void;
  onToggleMenu: (peerId: string) => void;
  onViewProfile: (c: ThreadCardConversation) => void;
  onMarkUnread: (c: ThreadCardConversation) => void;
  onToggleMute: (c: ThreadCardConversation) => void;
  onToggleArchive: (c: ThreadCardConversation) => void;
};

function ThreadCardImpl(props: Props) {
  const {
    c,
    theme,
    activeTerms,
    historySnippet,
    isTyping,
    isOnline,
    menuOpen,
    HighlightComponent: Highlight,
    onOpen,
    onToggleMenu,
    onViewProfile,
    onMarkUnread,
    onToggleMute,
    onToggleArchive,
  } = props;

  return (
    <>
      <button
        onClick={() => onOpen(c.peerId)}
        className="w-full flex items-center gap-3 bg-[#1A1A1B] border-2 rounded-2xl p-4 text-left transition-all hover:bg-white/[0.03]"
        style={{ borderColor: `rgba(${theme.rgb}, 0.35)`, boxShadow: `0 0 14px rgba(${theme.rgb}, 0.10)` }}
      >
        <div
          className="w-12 h-12 rounded-full bg-white/5 border-2 flex items-center justify-center overflow-hidden shrink-0 relative"
          style={{ borderColor: theme.hex, boxShadow: `0 0 10px rgba(${theme.rgb}, 0.35)` }}
        >
          {c.peerAvatar && !c.peerIsFallback ? (
            <img src={c.peerAvatar} alt={c.peerName} loading="lazy" decoding="async" className="w-full h-full object-cover" />
          ) : (
            <span className="relative flex h-full w-full items-center justify-center bg-white/5" aria-label="Avatar padrão">
              <UserCircle2 className="h-7 w-7 text-muted-foreground/70" />
              <span
                className="absolute bottom-1 right-1 min-w-4 h-4 px-0.5 rounded-full bg-black/80 border border-white/15 flex items-center justify-center text-[8px] font-black italic"
                style={{ color: theme.hex }}
              >
                {c.peerInitials}
              </span>
            </span>
          )}
          {isOnline && (
            <span
              className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-black"
              aria-label="Online agora"
              title="Online agora"
            />
          )}
          {c.muted && (
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-black border border-white/20 flex items-center justify-center">
              <BellOff className="w-3 h-3 text-muted-foreground" />
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold uppercase italic text-sm truncate">
              <Highlight text={c.peerName} terms={activeTerms} />
            </p>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {new Date(c.lastAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `rgba(${theme.rgb}, 0.15)`, color: theme.hex }}
            >
              <Highlight text={theme.label} terms={activeTerms} />
            </span>
            {c.peerRole && (
              <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                <Highlight text={c.peerRole} terms={activeTerms} />
              </span>
            )}
            {c.linkedAd?.distanceKm != null && (
              <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                📍 {c.linkedAd.distanceKm.toFixed(1).replace(".", ",")} km
              </span>
            )}
          </div>
          {c.linkedAd?.title && (
            <p
              className="text-[10px] font-black italic uppercase tracking-tight truncate mt-0.5"
              style={{ color: theme.hex }}
              title={c.linkedAd.title}
            >
              📌 {c.linkedAd.title}
            </p>
          )}
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
            {isTyping ? (
              <span className="flex items-center gap-1.5 text-primary italic font-bold">
                <span className="flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1 h-1 rounded-full bg-primary animate-bounce" />
                </span>
                digitando…
              </span>
            ) : (
              <>
                {c.lastMine && c.lastStatus === "pending" && (
                  <Loader2 className="w-3 h-3 shrink-0 animate-spin text-muted-foreground/80" aria-label="Enviando" />
                )}
                {c.lastMine && c.lastStatus === "failed" && (
                  <AlertCircle className="w-3 h-3 shrink-0 text-red-400" aria-label="Falha no envio" />
                )}
                {c.lastMine && c.lastStatus === "sent" && (
                  <CheckCheck className="w-3 h-3 shrink-0 text-muted-foreground/80" aria-label="Enviada" />
                )}
                {c.lastAttachmentType && <Paperclip className="w-3 h-3 shrink-0" />}
                {c.lastMessage ? (
                  <Highlight text={c.lastMessage} terms={activeTerms} />
                ) : (
                  <span>{c.lastAttachmentType ? "Anexo" : "—"}</span>
                )}
              </>
            )}
          </p>
          {historySnippet && (
            <p className="text-[10px] italic text-muted-foreground/80 truncate mt-0.5">
              <span className="uppercase font-bold tracking-widest mr-1 text-primary/70">Histórico:</span>
              <Highlight text={historySnippet} terms={activeTerms} />
            </p>
          )}
        </div>
        {c.unread > 0 && !c.muted && (
          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
            {c.unread > 99 ? "99+" : c.unread}
          </span>
        )}
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onToggleMenu(c.peerId);
          }}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10"
          aria-label="Ações"
        >
          <MoreVertical className="w-4 h-4" />
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      {menuOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-4 top-full mt-1 z-20 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[220px]"
        >
          <button
            onClick={() => onViewProfile(c)}
            className="w-full flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase italic tracking-widest hover:bg-white/5 text-primary"
          >
            <UserCircle2 className="w-4 h-4" /> Ver perfil do usuário
          </button>
          <button
            onClick={() => onMarkUnread(c)}
            className="w-full flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase italic tracking-widest hover:bg-white/5 border-t border-white/5"
          >
            <MailOpen className="w-4 h-4" /> Marcar como não lida
          </button>
          <button
            onClick={() => onToggleMute(c)}
            className="w-full flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase italic tracking-widest hover:bg-white/5"
          >
            {c.muted ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            {c.muted ? "Reativar notificações" : "Silenciar notificações"}
          </button>
          <button
            onClick={() => onToggleArchive(c)}
            className="w-full flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase italic tracking-widest hover:bg-white/5 border-t border-white/5"
          >
            {c.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
            {c.archived ? "Desarquivar" : "Arquivar conversa"}
          </button>
        </div>
      )}
    </>
  );
}

export const ThreadCard = memo(ThreadCardImpl, (prev, next) => {
  if (prev.menuOpen !== next.menuOpen) return false;
  if (prev.isTyping !== next.isTyping) return false;
  if (prev.isOnline !== next.isOnline) return false;
  if (prev.historySnippet !== next.historySnippet) return false;
  if (prev.theme !== next.theme && (prev.theme.hex !== next.theme.hex || prev.theme.label !== next.theme.label)) return false;
  if (prev.activeTerms !== next.activeTerms) {
    if (prev.activeTerms.length !== next.activeTerms.length) return false;
    for (let i = 0; i < prev.activeTerms.length; i++) {
      if (prev.activeTerms[i] !== next.activeTerms[i]) return false;
    }
  }
  const a = prev.c;
  const b = next.c;
  if (
    a.peerId !== b.peerId ||
    a.peerName !== b.peerName ||
    a.peerAvatar !== b.peerAvatar ||
    a.peerRole !== b.peerRole ||
    a.peerIsFallback !== b.peerIsFallback ||
    a.peerInitials !== b.peerInitials ||
    a.lastMessage !== b.lastMessage ||
    a.lastAttachmentType !== b.lastAttachmentType ||
    a.lastAt !== b.lastAt ||
    a.lastMine !== b.lastMine ||
    a.lastStatus !== b.lastStatus ||
    a.unread !== b.unread ||
    a.archived !== b.archived ||
    a.muted !== b.muted
  ) return false;
  return true;
});
