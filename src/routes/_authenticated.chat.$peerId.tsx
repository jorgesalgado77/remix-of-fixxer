import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Send,
  MailOpen,
  Archive,
  BellOff,
  Bell,
  ArchiveRestore,
  Paperclip,
  Loader2,
  X,
  FileText,
  Image as ImageIcon,
  RotateCcw,
  AlertCircle,
  Download,
  Check,
  CheckCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { toast } from "sonner";
import {
  hydrateChatPreferences,
  isConversationArchived,
  isConversationMuted,
  markConversationReadLocal,
  setConversationArchived,
  setConversationMuted,
  fetchPeerLastReadAt,
  subscribePeerReadReceipts,
} from "@/lib/chat-preferences";
import { enqueueMarkConversationRead } from "@/lib/chat-read-queue";
import { uploadWithProgress } from "@/lib/upload-with-progress";
import { downloadAttachment } from "@/lib/attachment-download";

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
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  client_message_id?: string | null;
  // Cliente apenas:
  _pending?: boolean;
  _failed?: boolean;
  _clientId?: string;
  _draftText?: string;
  _draftFile?: File | null;
};

const PAGE_SIZE = 30;

function isImageType(t?: string | null) {
  return !!t && t.startsWith("image/");
}

function newClientId(): string {
  const g: any = typeof globalThis !== "undefined" ? globalThis : {};
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return `cmid-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}


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
  const [markingRead, setMarkingRead] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [muted, setMuted] = useState(false);
  const [archived, setArchived] = useState(false);
  const [peerLastReadAt, setPeerLastReadAt] = useState<string | null>(null);

  // Anexos + progresso
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const [downloads, setDownloads] = useState<Record<string, { pct: number; loading: boolean }>>({});

  // Presença + typing
  const [peerOnline, setPeerOnline] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const presenceRef = useRef<any>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const stopTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const idSetRef = useRef<Set<string>>(new Set());

  const selectCols =
    "id, sender_id, recipient_id, content, created_at, read, attachment_url, attachment_type, attachment_name, client_message_id";


  const loadPage = useCallback(
    async (uid: string, beforeIso?: string): Promise<MessageRow[]> => {
      const runQuery = async (cols: string) => {
        let q = supabaseExternal
          .from("messages")
          .select(cols)
          .or(
            `and(sender_id.eq.${uid},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${uid})`,
          )
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE);
        if (beforeIso) q = q.lt("created_at", beforeIso);
        return q;
      };
      try {
        const { data, error } = await runQuery(selectCols);
        if (error) throw error;
        return ((data as unknown as MessageRow[]) ?? []).reverse();
      } catch {
        const { data } = await runQuery("id, sender_id, recipient_id, content, created_at, read");
        return ((data as unknown as MessageRow[]) ?? []).reverse();
      }
    },
    [peerId],
  );

  const markIncomingRead = async (uid: string) => {
    setMarkingRead(true);
    try {
      enqueueMarkConversationRead(uid, peerId);
      markConversationReadLocal(uid, peerId);
      window.dispatchEvent(new CustomEvent("fixxer:messages-read"));
    } finally {
      setMarkingRead(false);
    }
  };

  const sendTypingStop = () => {
    if (!presenceRef.current || !userId) return;
    try {
      presenceRef.current.send({ type: "broadcast", event: "typing-stop", payload: { from: userId } });
    } catch {}
  };

  useEffect(() => {
    let cancelled = false;
    let channel: any = null;
    let presenceChannel: any = null;
    let expireTimer: ReturnType<typeof setInterval> | null = null;
    let lastPeerHeartbeat = 0;

    (async () => {
      const { data } = await supabaseExternal.auth.getUser();
      const uid = data?.user?.id ?? null;
      if (cancelled) return;
      setUserId(uid);
      if (!uid) { setLoading(false); return; }

      await hydrateChatPreferences(uid);

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
      idSetRef.current = new Set(first.map((m) => m.id));
      if (!cancelled) {
        setMessages(first);
        setHasMore(first.length === PAGE_SIZE);
        setLoading(false);
      }
      await markIncomingRead(uid);

      // Read receipts do peer (quando o outro lado visualizou minhas mensagens)
      const initialPeerRead = await fetchPeerLastReadAt(uid, peerId);
      if (!cancelled) setPeerLastReadAt(initialPeerRead);
      const unsubPeerRead = subscribePeerReadReceipts(uid, peerId, (at) => {
        setPeerLastReadAt((prev) => (!prev || new Date(at) > new Date(prev) ? at : prev));
      });
      // guarda no closure para cleanup abaixo
      (channel as any)?.__unsubPeerRead && (channel as any).__unsubPeerRead();
      (globalThis as any).__fixxerUnsubPeerRead = unsubPeerRead;


      // Canal de INSERT/UPDATE de mensagens
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
              const inConv =
                (m.sender_id === uid && m.recipient_id === peerId) ||
                (m.sender_id === peerId && m.recipient_id === uid);
              if (!inConv) return;
              if (idSetRef.current.has(m.id)) return;
              idSetRef.current.add(m.id);
              setMessages((prev) => [...prev, m]);
              if (m.recipient_id === uid) markIncomingRead(uid);
            },
          )
          .subscribe();
      } catch {}

      // Canal de presença + typing (broadcast) — chave estável por par
      try {
        const key = [uid, peerId].sort().join(":");
        const room = `chat-presence-${key}`;
        presenceChannel = supabaseExternal.channel(room, {
          config: { presence: { key: uid }, broadcast: { self: false } },
        });
        presenceChannel
          .on("presence", { event: "sync" }, () => {
            const state = presenceChannel.presenceState();
            setPeerOnline(!!state?.[peerId]);
          })
          .on("presence", { event: "join" }, ({ key }: any) => {
            if (key === peerId) setPeerOnline(true);
          })
          .on("presence", { event: "leave" }, ({ key }: any) => {
            if (key === peerId) { setPeerOnline(false); setPeerTyping(false); }
          })
          .on("broadcast", { event: "typing" }, ({ payload }: any) => {
            if (payload?.from !== peerId) return;
            lastPeerHeartbeat = Date.now();
            setPeerTyping(true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => setPeerTyping(false), 4000);
          })
          .on("broadcast", { event: "typing-stop" }, ({ payload }: any) => {
            if (payload?.from !== peerId) return;
            setPeerTyping(false);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          })
          .subscribe(async (status: string) => {
            if (status === "SUBSCRIBED") {
              try { await presenceChannel.track({ online_at: Date.now() }); } catch {}
            }
          });
        presenceRef.current = presenceChannel;

        // Watchdog: se não recebemos "typing" há > 5s, desliga
        expireTimer = setInterval(() => {
          if (Date.now() - lastPeerHeartbeat > 5000) setPeerTyping(false);
        }, 1500);
      } catch {}
    })();

    // Ao trocar de rota / recarregar / esconder aba: envia typing-stop e derruba presença
    const onHide = () => { sendTypingStop(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
      if (expireTimer) clearInterval(expireTimer);
      try { sendTypingStop(); } catch {}
      if (channel) { try { supabaseExternal.removeChannel(channel); } catch {} }
      if (presenceChannel) { try { supabaseExternal.removeChannel(presenceChannel); } catch {} }
      presenceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerId, loadPage]);

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
  }, [messages, peerTyping]);

  const loadOlder = async () => {
    if (!userId || messages.length === 0 || !hasMore) return;
    const oldest = messages[0].created_at;
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const older = await loadPage(userId, oldest);
    const dedup = older.filter((m) => !idSetRef.current.has(m.id));
    dedup.forEach((m) => idSetRef.current.add(m.id));
    if (dedup.length === 0) { setHasMore(false); return; }
    setHasMore(older.length === PAGE_SIZE);
    setMessages((prev) => [...dedup, ...prev]);
    requestAnimationFrame(() => {
      if (!el) return;
      el.scrollTop = el.scrollHeight - prevHeight;
    });
  };

  const sendTyping = () => {
    if (!presenceRef.current || !userId) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current >= 1500) {
      lastTypingSentRef.current = now;
      try {
        presenceRef.current.send({ type: "broadcast", event: "typing", payload: { from: userId } });
      } catch {}
    }
    // agenda "typing-stop" após 3s de inatividade
    if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
    stopTypingTimerRef.current = setTimeout(sendTypingStop, 3000);
  };

  const doUpload = async (file: File) => {
    if (!userId) return null;
    setUploading(true);
    setUploadPct(0);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `chat/${userId}/${peerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { publicUrl } = await uploadWithProgress("media", path, file, (p) => setUploadPct(p.percent));
      return { url: publicUrl, type: file.type || "application/octet-stream", name: file.name };
    } catch (e: any) {
      toast.error("Falha no upload do anexo", { description: e?.message });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const persistMessage = async (
    tmpId: string,
    text: string,
    attachment: { url: string; type: string; name: string } | null,
  ) => {
    const payload: any = { sender_id: userId, recipient_id: peerId, content: text || null, read: false };
    if (attachment) {
      payload.attachment_url = attachment.url;
      payload.attachment_type = attachment.type;
      payload.attachment_name = attachment.name;
    }
    const { data, error } = await supabaseExternal
      .from("messages")
      .insert(payload)
      .select(selectCols)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      const row = data as unknown as MessageRow;
      idSetRef.current.add(row.id);
      setMessages((prev) => prev.map((m) => (m.id === tmpId ? row : m)));
    }
  };

  const send = async () => {
    const text = content.trim();
    if ((!text && !pendingFile) || !userId || sending) return;
    setSending(true);
    sendTypingStop();

    const draftFile = pendingFile;
    const tmpId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic: MessageRow = {
      id: tmpId,
      sender_id: userId,
      recipient_id: peerId,
      content: text || null,
      created_at: new Date().toISOString(),
      read: false,
      _pending: true,
      _draftText: text,
      _draftFile: draftFile,
    };
    setMessages((prev) => [...prev, optimistic]);
    setContent("");
    setPendingFile(null);

    try {
      let attachment: { url: string; type: string; name: string } | null = null;
      if (draftFile) {
        attachment = await doUpload(draftFile);
        if (!attachment) throw new Error("Upload cancelado");
      }
      await persistMessage(tmpId, text, attachment);
    } catch (e: any) {
      toast.error("Falha ao enviar", { description: e?.message });
      setMessages((prev) =>
        prev.map((m) => (m.id === tmpId ? { ...m, _pending: false, _failed: true } : m)),
      );
    } finally {
      setSending(false);
    }
  };

  const retrySend = async (m: MessageRow) => {
    if (!userId) return;
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, _pending: true, _failed: false } : x)));
    try {
      let attachment: { url: string; type: string; name: string } | null = null;
      if (m._draftFile) {
        attachment = await doUpload(m._draftFile);
        if (!attachment) throw new Error("Upload cancelado");
      }
      await persistMessage(m.id, m._draftText || "", attachment);
    } catch (e: any) {
      toast.error("Retentativa falhou", { description: e?.message });
      setMessages((prev) =>
        prev.map((x) => (x.id === m.id ? { ...x, _pending: false, _failed: true } : x)),
      );
    }
  };

  const discardFailed = (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const markAsUnread = async () => {
    if (!userId) return;
    const lastIncoming = [...messages].reverse().find((m) => m.recipient_id === userId && !m.id.startsWith("tmp-"));
    if (!lastIncoming) { toast.info("Sem mensagens recebidas"); return; }
    try {
      const { error } = await supabaseExternal.from("messages").update({ read: false }).eq("id", lastIncoming.id);
      if (error) throw error;
      setMessages((prev) => prev.map((m) => (m.id === lastIncoming.id ? { ...m, read: false } : m)));
      markConversationReadLocal(userId, peerId, new Date(0).toISOString());
      window.dispatchEvent(new CustomEvent("fixxer:messages-read"));
      toast.success("Marcada como não lida");
      navigate({ to: "/chat" as any });
    } catch (e: any) {
      toast.error("Falha ao marcar como não lida", { description: e?.message });
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

  const statusLine = peerTyping ? "Digitando..." : peerOnline ? "Online" : muted ? "Silenciada" : archived ? "Arquivada" : "Offline";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col pb-32">
      <header className="sticky top-0 z-10 bg-black/85 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/chat" as any })}
          className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0 relative">
          {peerAvatar ? (
            <img src={peerAvatar} alt={peerName} className="w-full h-full object-cover" />
          ) : (
            <span className="font-black italic text-primary">{peerName.slice(0, 1).toUpperCase()}</span>
          )}
          {peerOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-black" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black uppercase italic text-sm truncate">{peerName}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-1">
            {markingRead && <Loader2 className="w-3 h-3 animate-spin" />}
            {statusLine}
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

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
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
          <div className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando conversa...
          </div>
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
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm relative ${
                        mine
                          ? m._failed
                            ? "bg-red-500/20 border border-red-500/40 text-white rounded-br-sm"
                            : "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-[#1A1A1B] border border-white/10 text-white rounded-bl-sm"
                      } ${m._pending ? "opacity-70" : ""}`}
                    >
                      {m.attachment_url && (
                        <div className="mb-1">
                          {isImageType(m.attachment_type) ? (
                            <a href={m.attachment_url} target="_blank" rel="noreferrer">
                              <img src={m.attachment_url} alt={m.attachment_name || "Anexo"} className="rounded-lg max-h-64 object-cover" />
                            </a>
                          ) : (
                            <a
                              href={m.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${
                                mine ? "bg-black/20" : "bg-white/5 border border-white/10"
                              }`}
                            >
                              <FileText className="w-4 h-4" />
                              <span className="truncate max-w-[200px]">{m.attachment_name || "Anexo"}</span>
                            </a>
                          )}
                        </div>
                      )}
                      {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                      {m._pending && uploading && m._draftFile && (
                        <div className="mt-2 w-full bg-black/30 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full bg-white/80 transition-all" style={{ width: `${uploadPct}%` }} />
                        </div>
                      )}
                      <p className={`text-[9px] mt-1 flex items-center gap-1 ${mine ? "opacity-70" : "text-muted-foreground"}`}>
                        {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        {mine && !m._pending && !m._failed && (m.read ? " · Lida" : " · Enviada")}
                        {m._pending && <> · <Loader2 className="w-2.5 h-2.5 animate-spin inline" /> enviando</>}
                        {m._failed && (
                          <>
                            {" · "}
                            <AlertCircle className="w-3 h-3 inline" />
                            <button
                              onClick={() => retrySend(m)}
                              className="ml-1 inline-flex items-center gap-1 underline text-white/90 hover:text-white"
                            >
                              <RotateCcw className="w-2.5 h-2.5" /> Reenviar
                            </button>
                            <button
                              onClick={() => discardFailed(m.id)}
                              className="ml-2 underline text-white/70 hover:text-white"
                            >
                              Descartar
                            </button>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}

        {peerTyping && (
          <div className="flex justify-start">
            <div className="bg-[#1A1A1B] border border-white/10 rounded-2xl px-4 py-2 text-xs text-muted-foreground italic flex items-center gap-2">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
              </span>
              digitando
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-[76px] left-0 right-0 z-[90] bg-black/85 backdrop-blur-xl border-t border-white/10 px-4 py-3">
        <div className="max-w-3xl mx-auto">
          {pendingFile && (
            <div className="mb-2 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs">
              {pendingFile.type.startsWith("image/") ? (
                <ImageIcon className="w-4 h-4 text-primary" />
              ) : (
                <FileText className="w-4 h-4 text-primary" />
              )}
              <span className="truncate flex-1">{pendingFile.name}</span>
              <span className="text-muted-foreground">{Math.round(pendingFile.size / 1024)} KB</span>
              <button onClick={() => setPendingFile(null)} className="w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center" aria-label="Remover">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {uploading && (
            <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Enviando anexo · {uploadPct}%
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${uploadPct}%` }} />
              </div>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  if (f.size > 15 * 1024 * 1024) {
                    toast.error("Arquivo muito grande", { description: "Limite de 15MB por anexo." });
                    return;
                  }
                  setPendingFile(f);
                }
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || sending}
              className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center disabled:opacity-40"
              aria-label="Anexar arquivo"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            </button>
            <textarea
              value={content}
              onChange={(e) => { setContent(e.target.value); sendTyping(); }}
              onBlur={sendTypingStop}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              rows={1}
              placeholder="Escreva uma mensagem..."
              className="flex-1 bg-[#1A1A1B] border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:border-primary/50 resize-none max-h-32"
            />
            <button
              onClick={send}
              disabled={sending || uploading || (!content.trim() && !pendingFile)}
              className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_15px_rgba(0,255,135,0.3)] disabled:opacity-40 disabled:shadow-none"
              aria-label="Enviar"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
