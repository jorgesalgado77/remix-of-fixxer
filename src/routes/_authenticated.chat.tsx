import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MessageCircle, Search, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabaseExternal } from "@/lib/supabaseExternal";

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
};

type Conversation = {
  peerId: string;
  peerName: string;
  peerAvatar: string | null;
  lastMessage: string;
  lastAt: string;
  unread: number;
};

function ChatInboxPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [peers, setPeers] = useState<Record<string, { name: string; avatar: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  // Marca todas as mensagens do usuário como lidas
  const markAllAsRead = async (uid: string) => {
    try {
      await supabaseExternal
        .from("messages")
        .update({ read: true })
        .eq("recipient_id", uid)
        .eq("read", false);
      // Dispara evento local para o GlobalActionBar zerar o badge imediatamente
      window.dispatchEvent(new CustomEvent("fixxer:messages-read"));
    } catch {
      /* tabela pode não existir; segue silenciosamente */
    }
  };

  const loadMessages = async (uid: string) => {
    try {
      const { data, error } = await supabaseExternal
        .from("messages")
        .select("id, sender_id, recipient_id, content, created_at, read")
        .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!error && data) setMessages(data as MessageRow[]);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  // Setup inicial: pega o usuário, carrega mensagens e marca como lidas
  useEffect(() => {
    let cancelled = false;
    let channel: any = null;

    (async () => {
      const { data } = await supabaseExternal.auth.getUser();
      const uid = data?.user?.id ?? null;
      if (cancelled) return;
      setUserId(uid);
      if (!uid) {
        setLoading(false);
        return;
      }
      await loadMessages(uid);
      await markAllAsRead(uid);

      try {
        const channelName = `chat-inbox-${Math.random().toString(36).slice(2)}`;
        channel = supabaseExternal
          .channel(channelName)
          .on(
            "postgres_changes" as any,
            { event: "*", schema: "public", table: "messages" },
            async () => {
              await loadMessages(uid);
              // se estamos com a caixa aberta, novas mensagens também já são "vistas"
              await markAllAsRead(uid);
            },
          )
          .subscribe();
      } catch {
        /* Realtime indisponível */
      }
    })();

    return () => {
      cancelled = true;
      if (channel) {
        try {
          supabaseExternal.removeChannel(channel);
        } catch {}
      }
    };
  }, []);

  // Carrega dados dos participantes (nomes/avatares) a partir de profiles
  useEffect(() => {
    if (!userId || messages.length === 0) return;
    const peerIds = Array.from(
      new Set(
        messages.map((m) => (m.sender_id === userId ? m.recipient_id : m.sender_id)).filter(Boolean),
      ),
    );
    if (peerIds.length === 0) return;

    (async () => {
      try {
        const { data } = await supabaseExternal
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", peerIds);
        if (data) {
          const map: Record<string, { name: string; avatar: string | null }> = {};
          for (const p of data as any[]) {
            map[p.id] = { name: p.full_name || "Usuário", avatar: p.avatar_url ?? null };
          }
          setPeers(map);
        }
      } catch {
        /* profiles pode não existir com essas colunas; usa fallback */
      }
    })();
  }, [messages, userId]);

  const conversations: Conversation[] = useMemo(() => {
    if (!userId) return [];
    const byPeer = new Map<string, Conversation>();
    for (const m of messages) {
      const peerId = m.sender_id === userId ? m.recipient_id : m.sender_id;
      if (!peerId) continue;
      const info = peers[peerId];
      const existing = byPeer.get(peerId);
      const isUnreadIncoming = m.recipient_id === userId && !m.read;
      if (!existing) {
        byPeer.set(peerId, {
          peerId,
          peerName: info?.name || "Usuário",
          peerAvatar: info?.avatar ?? null,
          lastMessage: m.content || "",
          lastAt: m.created_at,
          unread: isUnreadIncoming ? 1 : 0,
        });
      } else {
        if (isUnreadIncoming) existing.unread += 1;
        if (new Date(m.created_at) > new Date(existing.lastAt)) {
          existing.lastMessage = m.content || "";
          existing.lastAt = m.created_at;
        }
      }
    }
    return Array.from(byPeer.values()).sort(
      (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
    );
  }, [messages, peers, userId]);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  const filtered = query.trim()
    ? conversations.filter(
        (c) =>
          c.peerName.toLowerCase().includes(query.toLowerCase()) ||
          c.lastMessage.toLowerCase().includes(query.toLowerCase()),
      )
    : conversations;

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-32">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="font-black uppercase italic text-xl tracking-tight">Chat</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
              {totalUnread > 0
                ? `${totalUnread} não lida${totalUnread > 1 ? "s" : ""}`
                : "Nenhuma mensagem nova"}
            </p>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar conversas..."
            className="w-full bg-[#1A1A1B] border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm outline-none focus:border-primary/50"
          />
        </div>

        {loading ? (
          <div className="bg-[#1A1A1B] border border-white/10 rounded-3xl p-10 text-center text-sm text-muted-foreground">
            Carregando conversas...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#1A1A1B] border border-white/10 rounded-3xl p-10 text-center">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="font-black uppercase italic text-lg mb-2">
              Nenhuma conversa {query ? "encontrada" : "ainda"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {query
                ? "Tente outro termo de busca."
                : "Quando você iniciar um contato com um lojista, prestador ou parceiro, as mensagens aparecem aqui."}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((c) => (
              <li key={c.peerId}>
                <button
                  onClick={() =>
                    navigate({ to: "/chat" as any, search: { peer: c.peerId } as any })
                  }
                  className="w-full flex items-center gap-3 bg-[#1A1A1B] border border-white/10 hover:border-primary/40 rounded-2xl p-4 text-left transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                    {c.peerAvatar ? (
                      <img src={c.peerAvatar} alt={c.peerName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-black italic text-primary">
                        {c.peerName.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold uppercase italic text-sm truncate">{c.peerName}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(c.lastAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.lastMessage || "—"}</p>
                  </div>
                  {c.unread > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                      {c.unread > 99 ? "99+" : c.unread}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
