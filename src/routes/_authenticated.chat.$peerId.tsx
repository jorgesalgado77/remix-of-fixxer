import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Send, MailOpen, Archive, BellOff, Bell, ArchiveRestore } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { toast } from "sonner";
import {
  isConversationArchived,
  isConversationMuted,
  setConversationArchived,
  setConversationMuted,
} from "@/lib/chat-preferences";

export const Route = createFileRoute("/_authenticated/chat/$peerId")({
  component: ConversationPage,
});

type MessageRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string | null;
  created_at: string;
  read: boolean | null;
};

const PAGE_SIZE = 30;

function ConversationPage() {
  const { peerId } = Route.useParams();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [peerName, setPeerName] = useState<string>("Conversa");
  const [peerAvatar, setPeerAvatar] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [muted, setMuted] = useState(false);
  const [archived, setArchived] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);

  const markIncomingRead = async (uid: string) => {
    try {
      await supabaseExternal
        .from("messages")
        .update({ read: true })
        .eq("sender_id", peerId)
        .eq("recipient_id", uid)
        .eq("read", false);
      window.dispatchEvent(new CustomEvent("fixxer:messages-read"));
    } catch {
      /* silencioso */
    }
  };

  const loadPage = async (uid: string, beforeIso?: string) => {
    try {
      let q = supabaseExternal
        .from("messages")
        .select("id, sender_id, recipient_id, content, created_at, read")
        .or(
          `and(sender_id.eq.${uid},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${uid})`,
        )
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      if (beforeIso) q = q.lt("created_at", beforeIso);
      const { data, error } = await q;
      if (error || !data) return [];
      return (data as MessageRow[]).reverse();
    } catch {
      return [];
    }
  };

  // Bootstrap
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

      // Perfil do peer
      try {
        const { data: p } = await supabaseExternal
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("id", peerId)
          .maybeSingle();
        if (p && !cancelled) {
          setPeerName((p as any).full_name || "Conversa");
          setPeerAvatar((p as any).avatar_url ?? null);
        }
      } catch {}

      setMuted(isConversationMuted(uid, peerId));
      setArchived(isConversationArchived(uid, peerId));

      const first = await loadPage(uid);
      if (!cancelled) {
        setMessages(first);
        setHasMore(first.length === PAGE_SIZE);
        setLoading(false);
      }
      await markIncomingRead(uid);

      try {
        const channelName = `chat-conv-${Math.random().toString(36).slice(2)}`;
        channel = supabaseExternal
          .channel(channelName)
          .on(
            "postgres_changes" as any,
            { event: "INSERT", schema: "public", table: "messages" },
            (payload: any) => {
              const m = payload?.new as MessageRow | undefined;
              if (!m) return;
              const isThisConv =
                (m.sender_id === uid && m.recipient_id === peerId) ||
                (m.sender_id === peerId && m.recipient_id === uid);
              if (!isThisConv) return;
              setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
              if (m.recipient_id === uid) markIncomingRead(uid);
            },
          )
          .subscribe();
      } catch {}
    })();

    return () => {
      cancelled = true;
      if (channel) {
        try { supabaseExternal.removeChannel(channel); } catch {}
      }
    };
  }, [peerId]);

  // Auto-scroll para o fim ao carregar/receber nova mensagem
  useEffect(() => {
    if (!scrollRef.current) return;
    if (isInitialLoadRef.current && messages.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      isInitialLoadRef.current = false;
      return;
    }
    const el = scrollRef.current;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const loadOlder = async () => {
    if (!userId || messages.length === 0 || !hasMore) return;
    const oldest = messages[0].created_at;
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const older = await loadPage(userId, oldest);
    if (older.length === 0) {
      setHasMore(false);
      return;
    }
    setHasMore(older.length === PAGE_SIZE);
    setMessages((prev) => [...older, ...prev]);
    requestAnimationFrame(() => {
      if (!el) return;
      el.scrollTop = el.scrollHeight - prevHeight;
    });
  };

  const send = async () => {
    const text = content.trim();
    if (!text || !userId || sending) return;
    setSending(true);
    try {
      const optimistic: MessageRow = {
        id: `tmp-${Date.now()}`,
        sender_id: userId,
        recipient_id: peerId,
        content: text,
        created_at: new Date().toISOString(),
        read: false,
      };
      setMessages((prev) => [...prev, optimistic]);
      setContent("");
      const { data, error } = await supabaseExternal
        .from("messages")
        .insert({ sender_id: userId, recipient_id: peerId, content: text, read: false })
        .select("id, sender_id, recipient_id, content, created_at, read")
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? (data as MessageRow) : m)));
      }
    } catch (e: any) {
      toast.error("Falha ao enviar mensagem", { description: e?.message });
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("tmp-")));
    } finally {
      setSending(false);
    }
  };

  const markAsUnread = async () => {
    if (!userId) return;
    const lastIncoming = [...messages].reverse().find((m) => m.recipient_id === userId);
    if (!lastIncoming) {
      toast.info("Sem mensagens recebidas para marcar como não lida");
      return;
    }
    try {
      await supabaseExternal.from("messages").update({ read: false }).eq("id", lastIncoming.id);
      setMessages((prev) => prev.map((m) => (m.id === lastIncoming.id ? { ...m, read: false } : m)));
      window.dispatchEvent(new CustomEvent("fixxer:messages-read"));
      toast.success("Marcada como não lida");
      navigate({ to: "/chat" as any });
    } catch (e: any) {
      toast.error("Não foi possível marcar como não lida", { description: e?.message });
    }
  };

  const toggleArchive = () => {
    if (!userId) return;
    const next = !archived;
    setConversationArchived(userId, peerId, next);
    setArchived(next);
    toast.success(next ? "Conversa arquivada" : "Conversa desarquivada");
    if (next) navigate({ to: "/chat" as any });
  };

  const toggleMute = () => {
    if (!userId) return;
    const next = !muted;
    setConversationMuted(userId, peerId, next);
    setMuted(next);
    toast.success(next ? "Notificações silenciadas" : "Notificações reativadas");
  };

  const grouped = useMemo(() => {
    const out: { date: string; items: MessageRow[] }[] = [];
    for (const m of messages) {
      const d = new Date(m.created_at).toLocaleDateString("pt-BR");
      const last = out[out.length - 1];
      if (last && last.date === d) last.items.push(m);
      else out.push({ date: d, items: [m] });
    }
    return out;
  }, [messages]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col pb-32">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black/85 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/chat" as any })}
          className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
          {peerAvatar ? (
            <img src={peerAvatar} alt={peerName} className="w-full h-full object-cover" />
          ) : (
            <span className="font-black italic text-primary">{peerName.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black uppercase italic text-sm truncate">{peerName}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            {muted ? "Silenciada" : archived ? "Arquivada" : "Ativa"}
          </p>
        </div>
        <button
          onClick={markAsUnread}
          title="Marcar como não lida"
          className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10"
        >
          <MailOpen className="w-4 h-4" />
        </button>
        <button
          onClick={toggleMute}
          title={muted ? "Reativar notificações" : "Silenciar notificações"}
          className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
            muted ? "bg-primary/10 border-primary/40 text-primary" : "bg-white/5 border-white/10 hover:bg-white/10"
          }`}
        >
          {muted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
        </button>
        <button
          onClick={toggleArchive}
          title={archived ? "Desarquivar" : "Arquivar conversa"}
          className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
            archived ? "bg-primary/10 border-primary/40 text-primary" : "bg-white/5 border-white/10 hover:bg-white/10"
          }`}
        >
          {archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
        </button>
      </header>

      {/* Mensagens */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {hasMore && !loading && messages.length > 0 && (
          <div className="text-center">
            <button
              onClick={loadOlder}
              className="text-[10px] font-black uppercase italic tracking-widest text-primary bg-primary/10 border border-primary/20 rounded-full px-4 py-2 hover:bg-primary/20"
            >
              Carregar mensagens anteriores
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center text-sm text-muted-foreground">Carregando conversa...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-16">
            Nenhuma mensagem ainda. Diga um "olá" para iniciar 👋
          </div>
        ) : (
          grouped.map((g) => (
            <div key={g.date} className="space-y-2">
              <div className="text-center">
                <span className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground bg-white/5 border border-white/10 rounded-full px-3 py-1">
                  {g.date}
                </span>
              </div>
              {g.items.map((m) => {
                const mine = m.sender_id === userId;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                        mine
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-[#1A1A1B] border border-white/10 text-white rounded-bl-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      <p className={`text-[9px] mt-1 ${mine ? "opacity-70" : "text-muted-foreground"}`}>
                        {new Date(m.created_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {mine && (m.read ? " · Lida" : " · Enviada")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <div className="fixed bottom-[76px] left-0 right-0 z-[90] bg-black/85 backdrop-blur-xl border-t border-white/10 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Escreva uma mensagem..."
            className="flex-1 bg-[#1A1A1B] border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:border-primary/50 resize-none max-h-32"
          />
          <button
            onClick={send}
            disabled={sending || !content.trim()}
            className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_15px_rgba(0,255,135,0.3)] disabled:opacity-40 disabled:shadow-none"
            aria-label="Enviar"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
