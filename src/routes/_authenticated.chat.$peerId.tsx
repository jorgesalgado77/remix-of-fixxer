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
  CalendarPlus,
  Loader2,
  X,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  RotateCcw,
  AlertCircle,
  Download,
  Check,
  CheckCheck,
  UserCircle2,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent as ReactDragEvent } from "react";
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
import { enqueueMarkConversationRead, flushChatReadQueue } from "@/lib/chat-read-queue";
import { uploadWithProgress } from "@/lib/upload-with-progress";
import { downloadAttachment } from "@/lib/attachment-download";
import { sanitizeContactText, CONTACT_GUARD_WARNING } from "@/lib/contact-guard";
import { getMockConversation, isMockPeerId, mockMessageIsoAt, type MockLinkedAd } from "@/lib/mock-chat";
import { getCategoryTheme, type CategoryKey } from "@/lib/category-colors";
import { useCurrentCategory, setContextCategoryOverride } from "@/lib/user-category";
import { ScheduleAppointmentModal } from "@/components/ScheduleAppointmentModal";
import { ChatAppointmentsBanner } from "@/components/ChatAppointmentsBanner";
import { ChatEmojiPicker } from "@/components/Chat/EmojiPicker";
import { ChatVoiceRecorder } from "@/components/Chat/VoiceRecorder";

function roleToCategory(role: string | null | undefined): CategoryKey {
  const r = (role || "").toLowerCase();
  if (r.includes("lojista")) return "lojista";
  if (r.includes("fornec") || r.includes("parceiro")) return "fornecedor";
  if (r.includes("cliente") || r.includes("casual")) return "cliente";
  if (r.includes("admin")) return "admin";
  return "prestador";
}
import {
  clearDraft,
  getDraftFiles,
  getDraftText,
  markMockConversationSeen,
  setDraftFiles,
  setDraftText,
} from "@/lib/chat-drafts";

const MAX_FILES = 6;
const MAX_FILE_MB = 15;
const ACCEPTED_HINT = "image/*,video/*,application/pdf";

export const Route = createFileRoute("/_authenticated/chat/$peerId")({
  component: ConversationPage,
});

/** UID sintético estável quando não há sessão Supabase (fase de construção / bypass admin). */
function getFallbackUid(): string {
  if (typeof window === "undefined") return "local-anon";
  try {
    const cached = localStorage.getItem("fixxer_local_uid");
    if (cached) return cached;
    const email = (localStorage.getItem("fixxer_user_email") || "local").toLowerCase();
    const uid = `local-${btoa(email).replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}`;
    localStorage.setItem("fixxer_local_uid", uid);
    return uid;
  } catch {
    return "local-anon";
  }
}


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
  _delivered?: boolean;
  _clientId?: string;
  _draftText?: string;
  _draftFile?: File | null;
  _uploadPct?: number;
  _uploading?: boolean;
  _batchIndex?: number;
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
  const [peerRole, setPeerRole] = useState<string | null>(null);
  const [content, setContent] = useState<string>(() => getDraftText(peerId));
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [muted, setMuted] = useState(false);
  const [archived, setArchived] = useState(false);
  const [peerLastReadAt, setPeerLastReadAt] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [linkedAd, setLinkedAd] = useState<MockLinkedAd | null>(null);
  const [guardBlocked, setGuardBlocked] = useState(false);
  const [peerAvailable, setPeerAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!peerId || (typeof peerId === "string" && peerId.startsWith("mock-"))) return;
    (async () => {
      try {
        const { guardContactAttempt } = await import("@/lib/availability");
        const res = await guardContactAttempt(peerId);
        if (cancelled) return;
        setPeerAvailable(res.allowed);
        if (!res.allowed) {
          try {
            const { toast } = await import("sonner");
            toast.warning("Usuário indisponível", {
              description: "Ele foi avisado da sua tentativa e você será notificado quando voltar.",
            });
          } catch { /* ignore */ }
        }
      } catch { /* silencioso */ }
    })();
    return () => { cancelled = true; };
  }, [peerId]);

  // Anexos + progresso (multi-arquivo)
  const [pendingFiles, setPendingFiles] = useState<File[]>(() => getDraftFiles(peerId));
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0); // % do arquivo atual
  const [uploadingIndex, setUploadingIndex] = useState(0); // índice do arquivo atual
  const fileRef = useRef<HTMLInputElement>(null);
  const [downloads, setDownloads] = useState<Record<string, { pct: number; loading: boolean }>>({});

  // Miniaturas locais (blob URLs) para imagens/vídeos anexados antes de enviar.
  const pendingPreviews = useMemo(() => {
    const map = new Map<File, string>();
    for (const f of pendingFiles) {
      if (f.type.startsWith("image/") || f.type.startsWith("video/")) {
        try { map.set(f, URL.createObjectURL(f)); } catch {}
      }
    }
    return map;
  }, [pendingFiles]);
  useEffect(() => {
    return () => {
      for (const url of pendingPreviews.values()) {
        try { URL.revokeObjectURL(url); } catch {}
      }
    };
  }, [pendingPreviews]);

  // Confirmação de descarte de rascunho (dois cliques)
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const discardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const [dragActive, setDragActive] = useState(false);
  const dragCounterRef = useRef(0);

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

  // Debounce das marcações de lida + confirmação do servidor via flush da fila.
  // Evita flutuação de status quando o usuário alterna conversas rapidamente.
  const markReadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markReadInflightRef = useRef<Promise<void> | null>(null);
  const markIncomingRead = (uid: string) => {
    if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current);
    markReadTimerRef.current = setTimeout(async () => {
      setMarkingRead(true);
      try {
        enqueueMarkConversationRead(uid, peerId);
        markConversationReadLocal(uid, peerId);
        // Aguarda a confirmação do servidor antes de propagar o evento global.
        const inflight = flushChatReadQueue().catch(() => {});
        markReadInflightRef.current = inflight;
        await inflight;
        window.dispatchEvent(new CustomEvent("fixxer:messages-read"));
      } finally {
        setMarkingRead(false);
        markReadInflightRef.current = null;
      }
    }, 350);
  };

  const sendTypingStop = () => {
    if (!presenceRef.current || !userId) return;
    try {
      presenceRef.current.send({ type: "broadcast", event: "typing-stop", payload: { from: userId } });
    } catch {}
  };
  const acceptIncomingFiles = useCallback((picked: File[]) => {
    if (picked.length === 0) return;
    const remaining = MAX_FILES - pendingFiles.length;
    if (remaining <= 0) {
      toast.error("Limite de anexos atingido", { description: `Máximo ${MAX_FILES} arquivos por mensagem.` });
      return;
    }
    const overflow = picked.length - remaining;
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const f of picked.slice(0, remaining)) {
      if (f.size > MAX_FILE_MB * 1024 * 1024) { rejected.push(`${f.name} (>${MAX_FILE_MB}MB)`); continue; }
      if (f.size === 0) { rejected.push(`${f.name} (vazio)`); continue; }
      accepted.push(f);
    }
    if (rejected.length) toast.error(`${rejected.length} arquivo(s) rejeitado(s)`, { description: rejected.join(" • ") });
    if (overflow > 0) toast.warning(`${overflow} arquivo(s) ignorado(s)`, { description: `Limite de ${MAX_FILES} anexos por mensagem.` });
    if (accepted.length) {
      const merged = [...pendingFiles, ...accepted];
      setPendingFiles(merged);
      setDraftFiles(peerId, merged);
    }
  }, [pendingFiles, peerId]);

  const onDragEnter = (e: ReactDragEvent) => {
    if (!e.dataTransfer?.types?.includes("Files")) return;
    e.preventDefault();
    dragCounterRef.current += 1;
    setDragActive(true);
  };
  const onDragOver = (e: ReactDragEvent) => {
    if (!e.dataTransfer?.types?.includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };
  const onDragLeave = (e: ReactDragEvent) => {
    e.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setDragActive(false);
  };
  const onDrop = (e: ReactDragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setDragActive(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length > 0) acceptIncomingFiles(files);
  };


  useEffect(() => {
    let cancelled = false;
    let channel: any = null;
    let presenceChannel: any = null;
    let unsubPeerRead: (() => void) | null = null;
    let expireTimer: ReturnType<typeof setInterval> | null = null;
    let lastPeerHeartbeat = 0;

    (async () => {
      const { data } = await supabaseExternal.auth.getUser();
      const uid = data?.user?.id ?? getFallbackUid();
      if (cancelled) return;
      setUserId(uid);

      // === MODO MOCK (peerId "mock-*") ===
      if (isMockPeerId(peerId)) {
        const mock = getMockConversation(peerId);
        if (mock) {
          setPeerName(mock.peerName);
          setPeerAvatar(mock.peerAvatar);
          setPeerRole(mock.peerRole);
          setPeerOnline(!!mock.online);
          setLinkedAd(mock.linkedAd ?? null);
          const mockRows: MessageRow[] = mock.messages.map((m) => ({
            id: `${peerId}-${m.id}`,
            sender_id: m.fromMe ? uid : peerId,
            recipient_id: m.fromMe ? peerId : uid,
            content: m.content,
            created_at: mockMessageIsoAt(m.minutesAgo),
            read: true,
            _delivered: true,
            attachment_url: m.attachment?.url ?? null,
            attachment_type: m.attachment?.type ?? null,
            attachment_name: m.attachment?.name ?? null,
          }));
          setMessages(mockRows);
          setHasMore(false);
          setLoading(false);
          markMockConversationSeen(peerId);
          return;
        }
      }



      await hydrateChatPreferences(uid);

      try {
        const { data: p } = await supabaseExternal
          .from("profiles")
          .select("id, full_name, avatar_url, role")
          .eq("id", peerId)
          .maybeSingle();
        if (p && !cancelled) {
          setPeerName((p as any).full_name || "Conversa");
          setPeerAvatar((p as any).avatar_url ?? null);
          setPeerRole((p as any).role ?? null);
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

      // Read receipts do peer (quando ele visualizou minhas mensagens)
      const initialPeerRead = await fetchPeerLastReadAt(uid, peerId);
      if (!cancelled) setPeerLastReadAt(initialPeerRead);
      unsubPeerRead = subscribePeerReadReceipts(uid, peerId, (at) => {
        setPeerLastReadAt((prev) => (!prev || new Date(at) > new Date(prev) ? at : prev));
      });



      // Canal de INSERT/UPDATE de mensagens
      try {
        const channelName = `chat-conv-${Math.random().toString(36).slice(2)}`;
        channel = supabaseExternal
          .channel(channelName)
          .on(
            "postgres_changes" as any,
            { event: "*", schema: "public", table: "messages" },
            (payload: any) => {
              const m = payload?.new as MessageRow | undefined;
              if (!m) return;
              const inConv =
                (m.sender_id === uid && m.recipient_id === peerId) ||
                (m.sender_id === peerId && m.recipient_id === uid);
              if (!inConv) return;
              // Idempotência: se veio da minha própria escrita otimista,
              // atualiza a linha em vez de duplicar (match por client_message_id).
              if (m.client_message_id) {
                setMessages((prev) => {
                  const idx = prev.findIndex(
                    (x) => x._clientId === m.client_message_id || x.id === m.client_message_id,
                  );
                  if (idx >= 0) {
                    idSetRef.current.add(m.id);
                    const next = prev.slice();
                    next[idx] = { ...m, _clientId: m.client_message_id ?? next[idx]._clientId };
                    return next;
                  }
                  if (idSetRef.current.has(m.id)) {
                    return prev.map((x) => (x.id === m.id ? { ...x, ...m } : x));
                  }
                  idSetRef.current.add(m.id);
                  return [...prev, m];
                });
              } else if (idSetRef.current.has(m.id)) {
                setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
              } else {
                idSetRef.current.add(m.id);
                setMessages((prev) => [...prev, m]);
              }
              if (m.recipient_id === uid && payload?.eventType !== "UPDATE") markIncomingRead(uid);
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

    // Ao trocar de rota / recarregar / esconder aba: envia typing-stop.
    // Ao VOLTAR o foco: re-marca a conversa como lida (sincroniza com o peer).
    const onHide = () => { sendTypingStop(); };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        const uid = userId || getFallbackUid();
        if (uid && !isMockPeerId(peerId)) markIncomingRead(uid);
      }
    };
    document.addEventListener("visibilitychange", onHide);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("pagehide", onHide);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onHide);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("pagehide", onHide);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
      if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current);
      if (expireTimer) clearInterval(expireTimer);
      try { sendTypingStop(); } catch {}
      if (channel) { try { supabaseExternal.removeChannel(channel); } catch {} }
      if (presenceChannel) { try { supabaseExternal.removeChannel(presenceChannel); } catch {} }
      if (unsubPeerRead) { try { unsubPeerRead(); } catch {} }
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

  const doUpload = async (
    file: File,
    onProgress?: (pct: number) => void,
  ) => {
    if (!userId) return null;
    setUploading(true);
    setUploadPct(0);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `chat/${userId}/${peerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { publicUrl } = await uploadWithProgress("media", path, file, (p) => {
        setUploadPct(p.percent);
        onProgress?.(p.percent);
      });
      return { url: publicUrl, type: file.type || "application/octet-stream", name: file.name };
    } catch (e: any) {
      toast.error("Falha no upload do anexo", { description: e?.message });
      return null;
    } finally {
      setUploading(false);
    }
  };

  /**
   * Persistência idempotente: usa `client_message_id` como chave de conflito
   * para que retries após falha parcial de rede não criem duplicatas.
   */
  const persistMessage = async (
    clientId: string,
    text: string,
    attachment: { url: string; type: string; name: string } | null,
  ) => {
    const payload: any = {
      sender_id: userId,
      recipient_id: peerId,
      content: text || null,
      read: false,
      client_message_id: clientId,
    };
    if (attachment) {
      payload.attachment_url = attachment.url;
      payload.attachment_type = attachment.type;
      payload.attachment_name = attachment.name;
    }

    const tryUpsert = async (cols: string) =>
      supabaseExternal
        .from("messages")
        .upsert(payload, { onConflict: "client_message_id", ignoreDuplicates: false })
        .select(cols)
        .maybeSingle();

    let row: MessageRow | null = null;
    try {
      const { data, error } = await tryUpsert(selectCols);
      if (error) throw error;
      row = (data as unknown as MessageRow) ?? null;
    } catch (err: any) {
      // Fallback quando client_message_id ainda não existe no schema
      const msg = String(err?.message || "");
      if (msg.includes("client_message_id") || err?.code === "42703") {
        delete payload.client_message_id;
        const { data, error } = await supabaseExternal
          .from("messages")
          .insert(payload)
          .select("id, sender_id, recipient_id, content, created_at, read, attachment_url, attachment_type, attachment_name")
          .maybeSingle();
        if (error) throw error;
        row = (data as unknown as MessageRow) ?? null;
      } else {
        throw err;
      }
    }

    if (row) {
      idSetRef.current.add(row.id);
      setMessages((prev) =>
        prev.map((m) => {
          if (m._clientId === clientId || m.id === clientId) {
            // Revoga blob URL de preview local antes de substituir pela URL do servidor
            if (m.attachment_url && m.attachment_url.startsWith("blob:")) {
              try { URL.revokeObjectURL(m.attachment_url); } catch {}
            }
            return { ...row!, _clientId: clientId };
          }
          return m;
        }),
      );
    }
  };

  /**
   * Envia texto + N anexos. Cada anexo vira uma mensagem separada (o schema atual
   * suporta 1 anexo por linha). A primeira mensagem carrega o texto; as demais
   * são apenas mídia. Cria linhas otimistas para todas antes do upload,
   * evitando travamento visual e permitindo retry independente.
   */
  const send = async () => {
    const rawText = content.trim();
    // Guard anti-bypass: mascara telefones, e-mails, redes sociais e links.
    const guard = sanitizeContactText(rawText);
    const text = guard.clean;
    if (guard.violated) {
      toast.warning(CONTACT_GUARD_WARNING);
      setGuardBlocked(true);
      setTimeout(() => setGuardBlocked(false), 8000);
    }
    const filesToSend = pendingFiles.slice();
    if ((!text && filesToSend.length === 0) || !userId || sending) return;
    setSending(true);
    sendTypingStop();

    // Cria linhas otimistas: primeira com texto (+ 1º anexo se houver), demais só anexo
    type Optim = { clientId: string; text: string; file: File | null };
    const optimBatch: Optim[] = [];
    if (filesToSend.length === 0) {
      optimBatch.push({ clientId: newClientId(), text, file: null });
    } else {
      filesToSend.forEach((f, i) => {
        optimBatch.push({
          clientId: newClientId(),
          text: i === 0 ? text : "",
          file: f,
        });
      });
    }
    const optimisticRows: MessageRow[] = optimBatch.map((o, i) => {
      let previewUrl: string | null = null;
      let previewType: string | null = null;
      if (o.file && (o.file.type.startsWith("image/") || o.file.type.startsWith("video/"))) {
        try { previewUrl = URL.createObjectURL(o.file); previewType = o.file.type; } catch {}
      }
      // created_at incrementa 1ms por item, preservando a ordem original do lote
      // mesmo que uploads em paralelo terminem em tempos diferentes.
      const baseTs = Date.now() + i;
      return {
        id: o.clientId,
        sender_id: userId,
        recipient_id: peerId,
        content: o.text || null,
        created_at: new Date(baseTs).toISOString(),
        read: false,
        _pending: true,
        _clientId: o.clientId,
        _draftText: o.text,
        _draftFile: o.file,
        _batchIndex: i,
        _uploadPct: o.file ? 0 : undefined,
        _uploading: !!o.file,
        // Preview local imediato (persiste mesmo se o upload falhar)
        attachment_url: previewUrl,
        attachment_type: previewType,
        attachment_name: o.file?.name ?? null,
      };
    });
    setMessages((prev) => [...prev, ...optimisticRows]);
    setContent("");
    setPendingFiles([]);
    clearDraft(peerId);

    // === MODO MOCK: sem persistência, com auto-resposta simulada ===
    if (isMockPeerId(peerId)) {
      // Enriquecer as linhas otimistas com URLs de blob para pré-visualizar
      // imagens/vídeos anexados diretamente nos balões (sem ir ao Storage).
      const optimIds = new Set(optimisticRows.map((r) => r.id));
      const enriched = optimisticRows.map((r) => {
        if (!r._draftFile) return r;
        try {
          return {
            ...r,
            attachment_url: URL.createObjectURL(r._draftFile),
            attachment_type: r._draftFile.type || "application/octet-stream",
            attachment_name: r._draftFile.name,
          };
        } catch {
          return r;
        }
      });
      setMessages((prev) => prev.map((m) => (optimIds.has(m.id) ? enriched.find((e) => e.id === m.id)! : m)));

      const clientIds = optimBatch.map((o) => o.clientId);
      const patchMine = (patch: Partial<MessageRow>) =>
        setMessages((prev) =>
          prev.map((m) => (clientIds.includes(m._clientId ?? "") ? { ...m, ...patch } : m)),
        );

      // 1) Enviada (single check)
      setTimeout(() => patchMine({ _pending: false, read: false, _delivered: false }), 350);
      // 2) Entregue (double check cinza)
      setTimeout(() => patchMine({ _delivered: true }), 1100);
      // 3) Lida (double check colorido) — o peer "visualizou" antes de responder
      setTimeout(() => patchMine({ read: true }), 1900);

      const replies = [
        "Perfeito, anotado! 👍",
        "Combinado. Assim que fechar, te aviso por aqui.",
        "Legal! Posso te mandar uma proposta em instantes.",
        "Show, vou verificar e já retorno.",
      ];
      const reply = replies[Math.floor(Math.random() * replies.length)];
      setTimeout(() => setPeerTyping(true), 900);
      setTimeout(() => {
        setPeerTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `${peerId}-reply-${Date.now()}`,
            sender_id: peerId,
            recipient_id: userId,
            content: reply,
            created_at: new Date().toISOString(),
            read: true,
            _delivered: true,
          },
        ]);
      }, 2400);
      setSending(false);
      return;
    }

    // === REAL: uploads em PARALELO com progresso por anexo,
    // porém persistência em ORDEM (aguarda o item anterior antes de persistir o próximo). ===
    setUploadingIndex(0);
    const patchRow = (clientId: string, patch: Partial<MessageRow>) =>
      setMessages((prev) =>
        prev.map((m) => (m._clientId === clientId ? { ...m, ...patch } : m)),
      );

    const uploadPromises = optimBatch.map(async (o) => {
      if (!o.file) return null;
      try {
        const attachment = await doUpload(o.file, (pct) =>
          patchRow(o.clientId, { _uploadPct: pct }),
        );
        if (!attachment) throw new Error("Upload cancelado");
        patchRow(o.clientId, { _uploadPct: 100, _uploading: false });
        return attachment;
      } catch (e: any) {
        patchRow(o.clientId, { _uploading: false, _uploadPct: 0 });
        throw e;
      }
    });

    for (let i = 0; i < optimBatch.length; i++) {
      const o = optimBatch[i];
      setUploadingIndex(i);
      try {
        const attachment = await uploadPromises[i];
        await persistMessage(o.clientId, o.text, attachment);
      } catch (e: any) {
        toast.error(
          filesToSend.length > 1
            ? `Falha ao enviar item ${i + 1}/${optimBatch.length}`
            : "Falha ao enviar",
          { description: e?.message },
        );
        patchRow(o.clientId, { _pending: false, _failed: true, _uploading: false });
      }
    }
    setSending(false);
  };

  const retrySend = async (m: MessageRow) => {
    if (!userId) return;
    const clientId = m._clientId || m.id;
    setMessages((prev) =>
      prev.map((x) =>
        x._clientId === clientId || x.id === clientId
          ? { ...x, _pending: true, _failed: false, _uploading: !!m._draftFile, _uploadPct: 0 }
          : x,
      ),
    );
    try {
      let attachment: { url: string; type: string; name: string } | null = null;
      if (m._draftFile) {
        attachment = await doUpload(m._draftFile, (pct) =>
          setMessages((prev) =>
            prev.map((x) => (x._clientId === clientId ? { ...x, _uploadPct: pct } : x)),
          ),
        );
        if (!attachment) throw new Error("Upload cancelado");
      }
      await persistMessage(clientId, m._draftText || "", attachment);
      setMessages((prev) =>
        prev.map((x) => (x._clientId === clientId ? { ...x, _uploading: false, _uploadPct: 100 } : x)),
      );
    } catch (e: any) {
      toast.error("Retentativa falhou", { description: e?.message });
      setMessages((prev) =>
        prev.map((x) => (x._clientId === clientId ? { ...x, _pending: false, _failed: true, _uploading: false } : x)),
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

  const peerCategory = roleToCategory(peerRole);
  const peerTheme = getCategoryTheme(peerCategory);
  const ownCategory = useCurrentCategory();
  const ownTheme = getCategoryTheme(ownCategory);

  // Aplica a cor do interlocutor no tema global enquanto a conversa está aberta.
  useEffect(() => {
    if (!peerRole) return;
    setContextCategoryOverride(peerCategory);
    return () => setContextCategoryOverride(null);
  }, [peerCategory, peerRole]);

  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col pb-32 overscroll-contain">
      <header
        className="sticky top-0 z-10 bg-black/85 backdrop-blur-xl border-b-2 px-4 py-3 flex items-center gap-3"
        style={{ borderColor: `rgba(${peerTheme.rgb}, 0.35)` }}
      >
        <button
          onClick={() => navigate({ to: "/chat" as any })}
          className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div
          className="w-10 h-10 rounded-full bg-white/5 border-2 overflow-hidden flex items-center justify-center shrink-0 relative"
          style={{ borderColor: peerTheme.hex, boxShadow: `0 0 12px rgba(${peerTheme.rgb}, 0.45)` }}
        >
          {peerAvatar ? (
            <img src={peerAvatar} alt={peerName} className="w-full h-full object-cover" />
          ) : (
            <span className="font-black italic" style={{ color: peerTheme.hex }}>{peerName.slice(0, 1).toUpperCase()}</span>
          )}
          {peerOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-black" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black uppercase italic text-sm truncate flex items-center gap-2">
            <span className="truncate">{peerName}</span>
            {peerAvailable !== null && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest border"
                style={{
                  color: peerAvailable ? "#10B981" : "#F59E0B",
                  borderColor: peerAvailable ? "#10B98155" : "#F59E0B55",
                  background: peerAvailable ? "#10B98118" : "#F59E0B18",
                }}
                aria-live="polite"
              >
                {peerAvailable ? "Disponível" : "Indisponível"}
              </span>
            )}
          </p>
          <p className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-2">
            <span
              className="px-1.5 py-0.5 rounded font-black"
              style={{ backgroundColor: `rgba(${peerTheme.rgb}, 0.15)`, color: peerTheme.hex }}
            >
              {peerTheme.label}
            </span>
            <span className="text-muted-foreground flex items-center gap-1">
              {markingRead && <Loader2 className="w-3 h-3 animate-spin" />}
              {statusLine}
            </span>
          </p>
        </div>
        <button
          onClick={() => {
            // Preserva o rascunho (texto + anexo) antes de sair para o perfil.
            setDraftText(peerId, content);
            setDraftFiles(peerId, pendingFiles);
            const path = `/lojista/${encodeURIComponent(peerId)}`;
            try {
              navigate({ to: path as any });
            } catch {
              window.location.href = path;
            }
          }}
          title="Ver perfil do usuário"
          className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10"
        >
          <UserCircle2 className="w-4 h-4" />
        </button>
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

      {linkedAd && (
        <div
          className="sticky top-[64px] z-[9] px-4 py-3 border-b backdrop-blur-xl"
          style={{
            background: `linear-gradient(180deg, rgba(${peerTheme.rgb},0.14) 0%, rgba(0,0,0,0.85) 100%)`,
            borderColor: `rgba(${peerTheme.rgb},0.35)`,
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p
                className="text-[9px] font-black uppercase tracking-widest mb-1"
                style={{ color: peerTheme.hex }}
              >
                📌 {linkedAd.category}
              </p>
              <p className="text-sm font-black italic leading-tight mb-1.5 line-clamp-2">
                {linkedAd.title}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                {typeof linkedAd.distanceKm === "number" && (
                  <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-muted-foreground">
                    📍 {linkedAd.distanceKm.toFixed(1).replace(".", ",")} km
                  </span>
                )}
                {typeof linkedAd.price === "number" && (
                  <span
                    className="px-2 py-0.5 rounded-full border font-black"
                    style={{
                      color: peerTheme.hex,
                      borderColor: `rgba(${peerTheme.rgb},0.5)`,
                      backgroundColor: `rgba(${peerTheme.rgb},0.12)`,
                    }}
                  >
                    R$ {linkedAd.price.toLocaleString("pt-BR")}
                  </span>
                )}
                {typeof linkedAd.priceMin === "number" && typeof linkedAd.priceMax === "number" && (
                  <span
                    className="px-2 py-0.5 rounded-full border font-black"
                    style={{
                      color: peerTheme.hex,
                      borderColor: `rgba(${peerTheme.rgb},0.5)`,
                      backgroundColor: `rgba(${peerTheme.rgb},0.12)`,
                    }}
                  >
                    R$ {linkedAd.priceMin.toLocaleString("pt-BR")} – R$ {linkedAd.priceMax.toLocaleString("pt-BR")}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setScheduleOpen(true)}
              className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl font-black italic uppercase text-[10px] tracking-widest transition-all hover:scale-[1.03]"
              style={{
                backgroundColor: peerTheme.hex,
                color: "#000",
                boxShadow: `0 0 18px rgba(${peerTheme.rgb},0.55)`,
              }}
              aria-label="Propor agendamento"
            >
              <CalendarPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Propor Agendamento</span>
              <span className="sm:hidden">Agendar</span>
            </button>
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`flex-1 overflow-y-auto px-4 py-4 space-y-4 relative ${
          dragActive ? "outline-dashed outline-2 outline-primary/70 outline-offset-[-8px] bg-primary/5" : ""
        }`}
      >
        {dragActive && (
          <div className="pointer-events-none sticky top-2 z-20 mx-auto max-w-md text-center bg-primary/15 border-2 border-dashed border-primary/70 rounded-2xl px-6 py-4 backdrop-blur-md">
            <p className="text-sm font-black uppercase italic tracking-widest text-primary">
              📎 Solte para anexar
            </p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
              Máx {MAX_FILES} arquivos · {MAX_FILE_MB}MB cada
            </p>
          </div>
        )}
        <ChatAppointmentsBanner userId={userId} peerId={peerId} />
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
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm relative border ${
                        mine
                          ? m._failed
                            ? "bg-red-500/20 border-red-500/40 text-white rounded-br-sm"
                            : "text-white rounded-br-sm"
                          : "bg-[#1A1A1B] text-white rounded-bl-sm"
                      } ${m._pending ? "opacity-70" : ""}`}
                      style={
                        mine && !m._failed
                          ? { backgroundColor: `rgba(${ownTheme.rgb}, 0.22)`, borderColor: ownTheme.hex }
                          : !mine
                            ? { borderColor: `rgba(${peerTheme.rgb}, 0.35)` }
                            : undefined
                      }
                    >
                      {m.attachment_url && (
                        <AttachmentBlock
                          url={m.attachment_url}
                          type={m.attachment_type}
                          name={m.attachment_name || "anexo"}
                          mine={mine}
                          messageId={m.id}
                          state={downloads[m.id]}
                          onDownload={async () => {
                            setDownloads((s) => ({ ...s, [m.id]: { pct: 0, loading: true } }));
                            try {
                              await downloadAttachment(m.attachment_url!, m.attachment_name || "anexo", (p) =>
                                setDownloads((s) => ({ ...s, [m.id]: { pct: p.percent, loading: true } })),
                              );
                              toast.success("Download concluído");
                            } catch (err: any) {
                              toast.error("Falha no download", { description: err?.message });
                            } finally {
                              setDownloads((s) => {
                                const next = { ...s };
                                delete next[m.id];
                                return next;
                              });
                            }
                          }}
                        />
                      )}
                      {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                      {m._pending && m._uploading && m._draftFile && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 bg-black/30 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full bg-white/80 transition-all"
                              style={{ width: `${m._uploadPct ?? 0}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-bold tabular-nums opacity-80">
                            {Math.round(m._uploadPct ?? 0)}%
                          </span>
                        </div>
                      )}
                      <p className={`text-[9px] mt-1 flex items-center gap-1 ${mine ? "opacity-70" : "text-muted-foreground"}`}>
                        {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        {mine && !m._pending && !m._failed && (() => {
                          const seenAt =
                            peerLastReadAt && new Date(m.created_at) <= new Date(peerLastReadAt)
                              ? peerLastReadAt
                              : null;
                          const isRead = !!m.read || !!seenAt;
                          const isDelivered = isRead || !!m._delivered;
                          const icon = isRead ? (
                            <CheckCheck className="w-3 h-3 text-sky-300 inline" />
                          ) : isDelivered ? (
                            <CheckCheck className="w-3 h-3 text-white/60 inline" />
                          ) : (
                            <Check className="w-3 h-3 inline" />
                          );
                          const label = isRead
                            ? seenAt
                              ? `Lida ${new Date(seenAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                              : "Lida"
                            : isDelivered
                              ? "Entregue"
                              : "Enviada";
                          return (
                            <span className="inline-flex items-center gap-0.5">
                              {" · "}
                              {icon}
                              {label}
                            </span>
                          );
                        })()}
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
          {pendingFiles.length > 0 && (
            <div className="mb-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  {pendingFiles.length} anexo{pendingFiles.length > 1 ? "s" : ""} • máx {MAX_FILES}
                </p>
                <button
                  onClick={() => { setPendingFiles([]); setDraftFiles(peerId, null); }}
                  className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-white font-bold"
                >
                  Limpar anexos
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {pendingFiles.map((f, idx) => {
                  const isImg = f.type.startsWith("image/");
                  const isVid = f.type.startsWith("video/");
                  const preview = pendingPreviews.get(f);
                  return (
                    <div key={`${f.name}-${idx}`} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-2 py-1.5 text-xs max-w-[260px]">
                      {isImg && preview ? (
                        <img src={preview} alt={f.name} className="w-10 h-10 rounded-md object-cover shrink-0 border border-white/10" />
                      ) : isVid && preview ? (
                        <div className="relative w-10 h-10 rounded-md overflow-hidden shrink-0 border border-white/10 bg-black">
                          <video src={preview} className="w-full h-full object-cover" muted />
                          <VideoIcon className="w-3 h-3 text-white absolute bottom-0.5 right-0.5 drop-shadow" />
                        </div>
                      ) : isImg ? (
                        <ImageIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                      ) : isVid ? (
                        <VideoIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="truncate max-w-[130px]">{f.name}</span>
                        <span className="text-muted-foreground text-[10px]">{Math.round(f.size / 1024)}KB</span>
                      </div>
                      <button
                        onClick={() => {
                          const next = pendingFiles.filter((_, i) => i !== idx);
                          setPendingFiles(next);
                          setDraftFiles(peerId, next);
                        }}
                        className="w-5 h-5 rounded-md hover:bg-white/10 flex items-center justify-center ml-auto"
                        aria-label={`Remover ${f.name}`}
                        disabled={uploading || sending}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {peerAvailable === false && (
            <div className="mb-2 flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-[11px] font-bold leading-snug">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Este usuário está <strong>indisponível</strong> no momento. Sua tentativa foi registrada — ele será avisado ao voltar.
              </span>
            </div>
          )}
          {guardBlocked && (
            <div className="mb-2 flex items-start gap-2 px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/50 text-red-300 text-[11px] font-bold leading-snug">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{CONTACT_GUARD_WARNING}</span>
            </div>
          )}
          {uploading && (
            <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Enviando anexo {pendingFiles.length > 1 ? `${uploadingIndex + 1}/${pendingFiles.length} · ` : "· "}{uploadPct}%
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${uploadPct}%` }} />
              </div>
            </div>
          )}
          {(content.trim().length > 0 || pendingFiles.length > 0) && !sending && !uploading && (
            <div className="mb-2 flex justify-end">
              {confirmingDiscard ? (
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold">
                  <span className="text-red-400">Descartar rascunho?</span>
                  <button
                    onClick={() => {
                      setContent("");
                      setPendingFiles([]);
                      clearDraft(peerId);
                      setConfirmingDiscard(false);
                      if (discardTimerRef.current) clearTimeout(discardTimerRef.current);
                      toast.success("Rascunho descartado");
                    }}
                    className="px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30"
                  >
                    Sim, descartar
                  </button>
                  <button
                    onClick={() => {
                      setConfirmingDiscard(false);
                      if (discardTimerRef.current) clearTimeout(discardTimerRef.current);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-muted-foreground hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setConfirmingDiscard(true);
                    if (discardTimerRef.current) clearTimeout(discardTimerRef.current);
                    discardTimerRef.current = setTimeout(() => setConfirmingDiscard(false), 4000);
                  }}
                  className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-red-400 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Descartar rascunho
                </button>
              )}
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={ACCEPTED_HINT}
              className="hidden"
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                acceptIncomingFiles(picked);
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || sending || pendingFiles.length >= MAX_FILES}
              title={pendingFiles.length >= MAX_FILES ? `Máximo ${MAX_FILES} anexos` : "Anexar arquivos"}
              className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center disabled:opacity-40"
              aria-label="Anexar arquivos"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setScheduleOpen(true)}
              title="Propor agendamento"
              className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center"
              aria-label="Propor agendamento"
            >
              <CalendarPlus className="w-4 h-4" />
            </button>
            <ChatEmojiPicker
              disabled={uploading || sending}
              onPick={(emo) => {
                const next = (content ?? "") + emo;
                setContent(next);
                setDraftText(peerId, next);
              }}
            />
            <ChatVoiceRecorder
              disabled={uploading || sending || pendingFiles.length >= MAX_FILES}
              onRecorded={(file) => acceptIncomingFiles([file])}
            />
            <textarea
              value={content}
              onChange={(e) => { setContent(e.target.value); setDraftText(peerId, e.target.value); sendTyping(); }}
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
              disabled={sending || uploading || (!content.trim() && pendingFiles.length === 0)}
              className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_15px_rgba(0,255,135,0.3)] disabled:opacity-40 disabled:shadow-none"
              aria-label="Enviar"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
      {scheduleOpen && (
        <ScheduleAppointmentModal
          open={scheduleOpen}
          peerId={peerId}
          peerName={peerName}
          onClose={() => setScheduleOpen(false)}
        />
      )}
    </div>
  );
}

function AttachmentBlock({
  url,
  type,
  name,
  mine,
  state,
  onDownload,
}: {
  url: string;
  type?: string | null;
  name: string;
  mine: boolean;
  messageId: string;
  state?: { pct: number; loading: boolean };
  onDownload: () => void;
}) {
  const image = isImageType(type);
  const video = !!type && type.startsWith("video/");
  return (
    <div className="mb-1 space-y-1">
      {image ? (
        <img src={url} alt={name} className="rounded-lg max-h-64 object-cover" />
      ) : video ? (
        <video
          src={url}
          controls
          preload="metadata"
          className="rounded-lg max-h-64 w-full bg-black"
        />
      ) : (
        <div
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${
            mine ? "bg-black/20" : "bg-white/5 border border-white/10"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span className="truncate max-w-[200px]">{name}</span>
        </div>
      )}
      <button
        type="button"
        onClick={onDownload}
        disabled={state?.loading}
        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md ${
          mine ? "bg-black/25 hover:bg-black/40" : "bg-white/10 hover:bg-white/20"
        } disabled:opacity-60`}
      >
        {state?.loading ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" /> {state.pct}%
          </>
        ) : (
          <>
            <Download className="w-3 h-3" /> Baixar
          </>
        )}
      </button>
      {state?.loading && (
        <div className="w-full bg-black/30 rounded-full h-1 overflow-hidden">
          <div className="h-full bg-white/80 transition-all" style={{ width: `${state.pct}%` }} />
        </div>
      )}
    </div>
  );
}

