import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  MessageCircle,
  Search,
  ChevronRight,
  Archive,
  ArchiveRestore,
  BellOff,
  Bell,
  MailOpen,
  MoreVertical,
  Loader2,
  Paperclip,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { toast } from "sonner";
import {
  canSeeConversationWith,
  getArchivedSet,
  getLastReadAt,
  getMutedSet,
  hydrateChatPreferences,
  markConversationReadLocal,
  setCachedPeerRoles,
  setConversationArchived,
  setConversationMuted,
} from "@/lib/chat-preferences";
import { enqueueMarkAllRead, enqueueMarkConversationRead } from "@/lib/chat-read-queue";
import { MOCK_CONVERSATIONS, mockMessageIsoAt } from "@/lib/mock-chat";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatInboxPage,
});

type MessageRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string | null;
  created_at: string;
  read: boolean | null;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
};

type PeerInfo = { name: string; avatar: string | null; role: string | null };

type Conversation = {
  peerId: string;
  peerName: string;
  peerAvatar: string | null;
  peerRole: string | null;
  lastMessage: string;
  lastAttachmentType: string | null;
  lastMessageId: string | null;
  lastAt: string;
  unread: number;
  archived: boolean;
  muted: boolean;
};

const PAGE_SIZE = 100;

function getStoredRole(): string {
  if (typeof window === "undefined") return "";
  return (localStorage.getItem("fixxer_user_role") || "").toLowerCase();
}

function ChatInboxPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string>(getStoredRole);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [peers, setPeers] = useState<Record<string, PeerInfo>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [prefsVersion, setPrefsVersion] = useState(0);
  const idSetRef = useRef<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const cols = "id, sender_id, recipient_id, content, created_at, read, attachment_url, attachment_type, attachment_name";

  const runQuery = useCallback(
    async (uid: string, beforeIso?: string) => {
      const attempt = async (selectCols: string) => {
        let q = supabaseExternal
          .from("messages")
          .select(selectCols)
          .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE);
        if (beforeIso) q = q.lt("created_at", beforeIso);
        return q;
      };
      try {
        const { data, error } = await attempt(cols);
        if (error) throw error;
        return (data as unknown as MessageRow[]) ?? [];
      } catch {
        const { data } = await attempt("id, sender_id, recipient_id, content, created_at, read");
        return (data as unknown as MessageRow[]) ?? [];
      }
    },
    [],
  );

  const loadFirstPage = useCallback(
    async (uid: string) => {
      setLoading(true);
      const data = await runQuery(uid);
      idSetRef.current = new Set(data.map((m) => m.id));
      setMessages(data);
      setHasMore(data.length === PAGE_SIZE);
      setLoading(false);
    },
    [runQuery],
  );

  const loadMore = useCallback(
    async (uid: string) => {
      if (loadingMore || !hasMore || messages.length === 0) return;
      setLoadingMore(true);
      const oldest = messages[messages.length - 1].created_at;
      const older = await runQuery(uid, oldest);
      const dedup = older.filter((m) => !idSetRef.current.has(m.id));
      dedup.forEach((m) => idSetRef.current.add(m.id));
      if (dedup.length === 0) setHasMore(false);
      else {
        setMessages((prev) => [...prev, ...dedup]);
        setHasMore(older.length === PAGE_SIZE);
      }
      setLoadingMore(false);
    },
    [hasMore, loadingMore, messages, runQuery],
  );

  const markAllAsRead = async (uid: string) => {
    setMarkingRead(true);
    try {
      enqueueMarkAllRead(uid);
      window.dispatchEvent(new CustomEvent("fixxer:messages-read"));
    } finally {
      setMarkingRead(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let channel: any = null;

    (async () => {
      const { data } = await supabaseExternal.auth.getUser();
      const uid = data?.user?.id ?? null;
      if (cancelled) return;
      setUserId(uid);
      if (!uid) { setLoading(false); return; }
      await hydrateChatPreferences(uid);
      await loadFirstPage(uid);
      await markAllAsRead(uid);

      try {
        const channelName = `chat-inbox-${Math.random().toString(36).slice(2)}`;
        channel = supabaseExternal
          .channel(channelName)
          .on(
            "postgres_changes" as any,
            { event: "*", schema: "public", table: "messages" },
            async (payload: any) => {
              const m = payload?.new as MessageRow | undefined;
              if (m && !idSetRef.current.has(m.id)) {
                idSetRef.current.add(m.id);
                setMessages((prev) => [m, ...prev]);
              } else {
                // atualização (read flag etc.) — refaz primeira página
                await loadFirstPage(uid);
              }
              await markAllAsRead(uid);
            },
          )
          .subscribe();
      } catch {}
    })();

    const syncRole = () => setRole(getStoredRole());
    window.addEventListener("storage", syncRole);
    window.addEventListener("fixxer:role-changed", syncRole as any);
    const onPrefs = () => setPrefsVersion((v) => v + 1);
    window.addEventListener("fixxer:chat-prefs-changed", onPrefs as any);

    const { data: authSub } = supabaseExternal.auth.onAuthStateChange(async (_evt, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        await hydrateChatPreferences(uid);
        setPrefsVersion((v) => v + 1);
      } else {
        setMessages([]);
        idSetRef.current.clear();
      }
    });

    return () => {
      cancelled = true;
      window.removeEventListener("storage", syncRole);
      window.removeEventListener("fixxer:role-changed", syncRole as any);
      window.removeEventListener("fixxer:chat-prefs-changed", onPrefs as any);
      try { authSub?.subscription?.unsubscribe(); } catch {}
      if (channel) { try { supabaseExternal.removeChannel(channel); } catch {} }
    };
  }, [loadFirstPage]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current || !userId) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) void loadMore(userId);
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [userId, loadMore]);

  // Peers
  useEffect(() => {
    if (!userId || messages.length === 0) return;
    const peerIds = Array.from(
      new Set(messages.map((m) => (m.sender_id === userId ? m.recipient_id : m.sender_id)).filter(Boolean)),
    );
    if (peerIds.length === 0) return;
    (async () => {
      try {
        const { data } = await supabaseExternal
          .from("profiles")
          .select("id, full_name, avatar_url, role")
          .in("id", peerIds);
        if (data) {
          const map: Record<string, PeerInfo> = {};
          const roleCache: Record<string, string> = {};
          for (const p of data as any[]) {
            map[p.id] = {
              name: p.full_name || "Usuário",
              avatar: p.avatar_url ?? null,
              role: (p.role as string) ?? null,
            };
            if (p.role) roleCache[p.id] = p.role;
          }
          setPeers((prev) => ({ ...prev, ...map }));
          setCachedPeerRoles(roleCache);
        }
      } catch {}
    })();
  }, [messages, userId]);

  const conversations: Conversation[] = useMemo(() => {
    if (!userId) return [];
    const archivedSet = getArchivedSet(userId);
    const mutedSet = getMutedSet(userId);
    const byPeer = new Map<string, Conversation>();
    for (const m of messages) {
      const peerId = m.sender_id === userId ? m.recipient_id : m.sender_id;
      if (!peerId) continue;
      const info = peers[peerId];
      const lastReadAt = getLastReadAt(userId, peerId);
      const existing = byPeer.get(peerId);
      // Não-lida: incoming, não lida no DB E posterior ao last_read_at local
      const afterLastRead = !lastReadAt || new Date(m.created_at) > new Date(lastReadAt);
      const isUnreadIncoming = m.recipient_id === userId && !m.read && afterLastRead;
      if (!existing) {
        byPeer.set(peerId, {
          peerId,
          peerName: info?.name || "Usuário",
          peerAvatar: info?.avatar ?? null,
          peerRole: info?.role ?? null,
          lastMessage: m.content || "",
          lastAttachmentType: m.attachment_type ?? null,
          lastMessageId: m.id,
          lastAt: m.created_at,
          unread: isUnreadIncoming ? 1 : 0,
          archived: archivedSet.has(peerId),
          muted: mutedSet.has(peerId),
        });
      } else {
        if (isUnreadIncoming) existing.unread += 1;
        if (new Date(m.created_at) > new Date(existing.lastAt)) {
          existing.lastMessage = m.content || "";
          existing.lastAttachmentType = m.attachment_type ?? null;
          existing.lastMessageId = m.id;
          existing.lastAt = m.created_at;
        }
      }
    }
    return Array.from(byPeer.values()).sort(
      (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, peers, userId, prefsVersion]);

  const conversationsWithMock: Conversation[] = useMemo(() => {
    if (!userId) return conversations;
    const archivedSet = getArchivedSet(userId);
    const mutedSet = getMutedSet(userId);
    const mock: Conversation[] = MOCK_CONVERSATIONS.map((c) => {
      const last = c.messages[c.messages.length - 1];
      const lastAt = mockMessageIsoAt(last?.minutesAgo ?? 0);
      const unread = c.messages.filter(
        (m) => !m.fromMe && (m.minutesAgo <= 60), // "novas" na última hora
      ).length;
      return {
        peerId: c.peerId,
        peerName: c.peerName,
        peerAvatar: c.peerAvatar,
        peerRole: c.peerRole,
        lastMessage: last?.content ?? "",
        lastAttachmentType: null,
        lastMessageId: null,
        lastAt,
        unread,
        archived: archivedSet.has(c.peerId),
        muted: mutedSet.has(c.peerId),
      };
    });
    // Evita duplicar caso o peerId já exista nas reais
    const existing = new Set(conversations.map((c) => c.peerId));
    const merged = [...conversations, ...mock.filter((m) => !existing.has(m.peerId))];
    return merged.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
  }, [conversations, userId, prefsVersion]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);
    const base = conversationsWithMock
      .filter((c) => (showArchived ? c.archived : !c.archived))
      .filter((c) => c.peerId.startsWith("mock-") || canSeeConversationWith(role, c.peerRole));
    if (!q) return base;
    type Scored = Conversation & { _score: number };
    const scored: Scored[] = [];
    for (const c of base) {
      const name = c.peerName.toLowerCase();
      const msg = (c.lastMessage || "").toLowerCase();
      let score = 0;
      for (const t of terms) {
        if (name.includes(t)) score += name.startsWith(t) ? 6 : 4;
        if (msg.includes(t)) score += 2;
      }
      if (score === 0) continue;
      const ageH = (Date.now() - new Date(c.lastAt).getTime()) / 36e5;
      if (ageH < 24) score += 1;
      scored.push({ ...c, _score: score });
    }
    return scored.sort((a, b) =>
      b._score - a._score || new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
    );
  }, [conversationsWithMock, query, showArchived, role]);

  const totalUnread = conversationsWithMock.reduce((s, c) => s + (c.muted ? 0 : c.unread), 0);
  const archivedCount = conversationsWithMock.filter((c) => c.archived).length;

  const handleMarkUnread = async (c: Conversation) => {
    if (!userId) return;
    const lastIncoming = [...messages]
      .filter((m) => m.sender_id === c.peerId && m.recipient_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    if (!lastIncoming) { toast.info("Sem mensagens recebidas"); return; }
    try {
      const { error } = await supabaseExternal.from("messages").update({ read: false }).eq("id", lastIncoming.id);
      if (error) throw error;
      setMessages((prev) => prev.map((m) => (m.id === lastIncoming.id ? { ...m, read: false } : m)));
      // "desmarca" localmente o last_read_at para essa conversa (usa ontem)
      markConversationReadLocal(userId, c.peerId, new Date(0).toISOString());
      toast.success("Marcada como não lida");
    } catch (e: any) {
      toast.error("Falha ao marcar como não lida", { description: e?.message });
    } finally {
      setOpenMenu(null);
    }
  };

  const handleToggleArchive = (c: Conversation) => {
    if (!userId) return;
    setConversationArchived(userId, c.peerId, !c.archived);
    toast.success(!c.archived ? "Conversa arquivada" : "Conversa desarquivada");
    setOpenMenu(null);
  };

  const handleToggleMute = (c: Conversation) => {
    if (!userId) return;
    setConversationMuted(userId, c.peerId, !c.muted);
    toast.success(!c.muted ? "Notificações silenciadas" : "Notificações reativadas");
    setOpenMenu(null);
  };

  const openConversation = (peerId: string) => {
    if (userId) {
      enqueueMarkConversationRead(userId, peerId);
      markConversationReadLocal(userId, peerId);
      window.dispatchEvent(new CustomEvent("fixxer:messages-read"));
    }
    navigate({ to: "/chat/$peerId" as any, params: { peerId } as any });
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-32" onClick={() => setOpenMenu(null)}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="font-black uppercase italic text-xl tracking-tight">Chat</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest flex items-center gap-2">
              {markingRead && <Loader2 className="w-3 h-3 animate-spin" />}
              {totalUnread > 0 ? `${totalUnread} não lida${totalUnread > 1 ? "s" : ""}` : "Tudo em dia"}
            </p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setShowArchived((v) => !v); }}
            className={`px-3 h-9 rounded-xl border text-[10px] font-black uppercase italic tracking-widest flex items-center gap-2 ${
              showArchived ? "bg-primary/10 border-primary/40 text-primary" : "bg-white/5 border-white/10 text-muted-foreground hover:text-white"
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            {showArchived ? "Ativas" : `Arquivadas${archivedCount ? ` · ${archivedCount}` : ""}`}
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="Buscar por contato ou palavras-chave..."
            className="w-full bg-[#1A1A1B] border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm outline-none focus:border-primary/50"
          />
        </div>

        {loading ? (
          <div className="bg-[#1A1A1B] border border-white/10 rounded-3xl p-10 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando conversas...
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-[#1A1A1B] border border-white/10 rounded-3xl p-10 text-center">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="font-black uppercase italic text-lg mb-2">
              {showArchived ? "Nenhuma conversa arquivada" : query ? "Nada encontrado" : "Nenhuma conversa ainda"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {query ? "Tente outro termo." : showArchived ? "Conversas arquivadas aparecem aqui." : "Quando iniciar um contato, as mensagens aparecem aqui."}
            </p>
          </div>
        ) : (
          <>
            <ul className="space-y-2">
              {visible.map((c) => (
                <li key={c.peerId} className="relative">
                  <button
                    onClick={() => openConversation(c.peerId)}
                    className="w-full flex items-center gap-3 bg-[#1A1A1B] border border-white/10 hover:border-primary/40 rounded-2xl p-4 text-left transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 relative">
                      {c.peerAvatar ? (
                        <img src={c.peerAvatar} alt={c.peerName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-black italic text-primary">{c.peerName.slice(0, 1).toUpperCase()}</span>
                      )}
                      {c.muted && (
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-black border border-white/20 flex items-center justify-center">
                          <BellOff className="w-3 h-3 text-muted-foreground" />
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold uppercase italic text-sm truncate">{c.peerName}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(c.lastAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        {c.lastAttachmentType && <Paperclip className="w-3 h-3 shrink-0" />}
                        {c.lastMessage || (c.lastAttachmentType ? "Anexo" : "—")}
                      </p>
                    </div>
                    {c.unread > 0 && !c.muted && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                        {c.unread > 99 ? "99+" : c.unread}
                      </span>
                    )}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpenMenu(openMenu === c.peerId ? null : c.peerId); }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10"
                      aria-label="Ações"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>

                  {openMenu === c.peerId && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-4 top-full mt-1 z-20 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[220px]"
                    >
                      <button onClick={() => handleMarkUnread(c)} className="w-full flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase italic tracking-widest hover:bg-white/5">
                        <MailOpen className="w-4 h-4" /> Marcar como não lida
                      </button>
                      <button onClick={() => handleToggleMute(c)} className="w-full flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase italic tracking-widest hover:bg-white/5">
                        {c.muted ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                        {c.muted ? "Reativar notificações" : "Silenciar notificações"}
                      </button>
                      <button onClick={() => handleToggleArchive(c)} className="w-full flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase italic tracking-widest hover:bg-white/5 border-t border-white/5">
                        {c.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                        {c.archived ? "Desarquivar" : "Arquivar conversa"}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <div ref={sentinelRef} className="h-16 flex items-center justify-center mt-4">
              {loadingMore ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" /> Carregando mais...
                </div>
              ) : !hasMore ? (
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">Fim do histórico</span>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
