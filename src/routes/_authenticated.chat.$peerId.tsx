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
  MoreVertical,
  Ban,
  FileDown,
  Settings,
  Camera,
  Film,
} from "lucide-react";
import { ChatSettingsSheet } from "@/components/ChatSettingsSheet";


import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent as ReactDragEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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
import { uploadWithRetry } from "@/lib/upload-with-retry";
import ExportChatModal from "@/components/Chat/ExportChatModal";
import { notifyIncomingMessage, requestNotificationPermission, currentPermission } from "@/lib/chat-notifications";
import { downloadAttachment } from "@/lib/attachment-download";
import { sanitizeContactText, CONTACT_GUARD_WARNING } from "@/lib/contact-guard";
import { getMockConversation, isMockPeerId, mockMessageIsoAt, type MockLinkedAd } from "@/lib/mock-chat";
import { getCategoryTheme, getPeerTheme, resolvePeerCategory, type CategoryKey } from "@/lib/category-colors";
import { useCurrentCategory, setContextCategoryOverride } from "@/lib/user-category";
import { peekPublicProfileCategory } from "@/lib/public-profile-category";
import { classifyChatError, sendWithRetry, validateChatIdentities } from "@/lib/chat-send";
import { startGlobalPresence, subscribeGlobalPresence, isPeerOnline } from "@/lib/chat-presence";
import { playIncomingMessageSound } from "@/lib/chat-sound";
import { setRoomStatus, incrRoomEvent, clearRoom } from "@/lib/chat-realtime-debug";
import { ChatEmojiPicker } from "@/components/Chat/EmojiPicker";
import { ChatVoiceRecorder } from "@/components/Chat/VoiceRecorder";
import CameraCaptureModal from "@/components/Chat/CameraCaptureModal";
import { ScheduleAppointmentModal } from "@/components/ScheduleAppointmentModal";
import { ChatAppointmentsBanner } from "@/components/ChatAppointmentsBanner";
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(v: string | null | undefined): v is string {
  return !!v && UUID_RE.test(v);
}
/**
 * Retorna o UUID real do usuário logado — nunca uma string sintética
 * nem valor de localStorage. Fonte única: supabaseExternal.auth.getUser().
 * O caller deve tratar `null` redirecionando para /auth.
 */
async function getAuthUid(): Promise<string | null> {
  try {
    const { supabaseExternal } = await import("@/lib/supabaseExternal");
    const { data } = await supabaseExternal.auth.getUser();
    const uid = data?.user?.id;
    return isUuid(uid) ? uid! : null;
  } catch {
    return null;
  }
}


/**
 * Redireciona para /auth quando a sessão sumiu no meio da conversa.
 * Preserva o peerId como `redirect` para retomar o chat após o login.
 */
function bounceToAuth(navigate: (opts: any) => void, peerId: string, reason: string) {
  try { toast.error("Sessão inválida", { description: reason + " Faça login novamente." }); } catch {}
  const redirect = `/chat/${peerId}`;
  try { navigate({ to: "/auth" as any, search: { redirect } as any }); }
  catch { window.location.href = `/auth?redirect=${encodeURIComponent(redirect)}`; }
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
  _error?: string;

};

const PAGE_SIZE = 30;

function isImageType(t?: string | null) {
  return !!t && t.startsWith("image/");
}
function isAudioType(t?: string | null, name?: string | null) {
  if (t && t.startsWith("audio/")) return true;
  if (name && /\.(webm|mp3|wav|ogg|m4a|flac|aac|opus)$/i.test(name)) return true;
  return false;
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
  // Semeia a categoria a partir do cache compartilhado (perfil público ↔ chat)
  // para pintar o tema correto ANTES da primeira renderização — evita qualquer
  // piscada de cor (ex.: azul lojista antes de virar âmbar prestador) enquanto
  // `resolvePeerProfile` roda de forma assíncrona.
  const [peerRole, setPeerRole] = useState<string | null>(() => peekPublicProfileCategory(peerId));
  const [peerInitials, setPeerInitials] = useState<string>("?");
  const [peerIsFallback, setPeerIsFallback] = useState<boolean>(true);
  const [peerLoading, setPeerLoading] = useState<boolean>(true);
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

  // Guard: peerId precisa ser UUID (ou mock-*). Rotas quebradas silenciosas
  // (ex: link antigo com id numérico) redirecionam para a inbox com aviso.
  useEffect(() => {
    if (!peerId) return;
    const isMock = typeof peerId === "string" && peerId.startsWith("mock-");
    if (isMock) return;
    if (!isUuid(peerId)) {
      toast.error("Conversa inválida", {
        description: "O identificador do contato não é válido. Voltando para a lista.",
      });
      try { navigate({ to: "/chat" as any }); }
      catch { window.location.href = "/chat"; }
    }
  }, [peerId, navigate]);


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
  const [cameraOpen, setCameraOpen] = useState<null | "photo" | "video">(null);
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
  const [settingsOpen, setSettingsOpen] = useState(false);

  const presenceRef = useRef<any>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const stopTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [footerHeight, setFooterHeight] = useState(96);
  const isInitialLoadRef = useRef(true);
  const idSetRef = useRef<Set<string>>(new Set());
  const [dragActive, setDragActive] = useState(false);
  const dragCounterRef = useRef(0);
  // Auto-scroll inteligente: só rola pro fim quando o usuário já está perto do fim
  // (ou quando a mensagem nova é dele). Do contrário, oferece um botão "↓ novas".
  const isNearBottomRef = useRef(true);
  const prevLastIdRef = useRef<string | null>(null);
  const [pendingScrollHint, setPendingScrollHint] = useState(0);
  // Compartilha o "catch-up" de mensagens entre effects: quando o listener
  // reconecta ou a rede volta, disparamos uma verificação imediata no banco
  // para preencher qualquer gap sem esperar o próximo ciclo de polling (4s).
  const catchUpRef = useRef<(() => Promise<void>) | null>(null);
  // Sinaliza para a UI quando o canal em tempo real está reconectando.
  const [realtimeReconnecting, setRealtimeReconnecting] = useState(false);

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
      } catch (err: any) {
        // Só cai no fallback (sem colunas de anexo) se o erro for de coluna inexistente.
        // Qualquer outro erro (rede/RLS) NÃO deve silenciosamente ocultar anexos.
        const msg = String(err?.message || "");
        const isMissingColumn =
          err?.code === "42703" ||
          /column .* does not exist/i.test(msg) ||
          /attachment_/i.test(msg);
        if (!isMissingColumn) {
          console.error("[chat] loadPage falhou", err);
          toast.error("Falha ao carregar histórico", { description: msg || "Tente novamente." });
          return [];
        }
        console.warn("[chat] Colunas de anexo ausentes na tabela messages — histórico será exibido sem anexos.");
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
    // Só marca como lida quando o destinatário está DE FATO visualizando:
    // aba visível, documento em foco e scroll perto do fim da conversa.
    // Se estiver rolando o histórico ou com a aba em segundo plano, adia.
    if (typeof document !== "undefined") {
      if (document.visibilityState !== "visible") return;
      if (typeof document.hasFocus === "function" && !document.hasFocus()) return;
    }
    if (!isNearBottomRef.current) return;
    if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current);
    markReadTimerRef.current = setTimeout(async () => {
      setMarkingRead(true);
      try {
        enqueueMarkConversationRead(uid, peerId);
        markConversationReadLocal(uid, peerId);
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

  const inboxTypingChannelRef = useRef<any>(null);
  const sendTypingStop = () => {
    if (!userId) return;
    try {
      presenceRef.current?.send({ type: "broadcast", event: "typing-stop", payload: { from: userId } });
    } catch {}
    try {
      inboxTypingChannelRef.current?.send({ type: "broadcast", event: "typing-stop", payload: { from: userId } });
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
      const uid = data?.user?.id ?? null;
      if (cancelled) return;
      if (!isUuid(uid)) {
        // Sem sessão válida — não há como escrever em messages (RLS + uuid).
        toast.error("Sessão expirada", { description: "Faça login novamente para conversar." });
        try { navigate({ to: "/auth" as any }); } catch { window.location.href = "/auth"; }
        return;
      }
      setUserId(uid);
      startGlobalPresence(uid);
      if (isPeerOnline(peerId)) setPeerOnline(true);



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
        setPeerLoading(true);
        const { clearPeerCache, resolvePeerProfile } = await import("@/lib/chat-peer-profile");
        // Sempre invalida ao abrir a conversa: evita foto/nome antigos vindos
        // do cache quando o usuário acabou de editar o perfil público.
        clearPeerCache(peerId);
        const resolved = await resolvePeerProfile(peerId, { refresh: true });
        if (!cancelled) {
          setPeerName(resolved.name || "Conversa");
          setPeerAvatar(resolved.avatarUrl);
          setPeerRole(resolved.role);
          setPeerInitials(resolved.initials);
          setPeerIsFallback(resolved.isFallback);
          window.dispatchEvent(new CustomEvent("fixxer:chat-peer-refresh", { detail: { peerId } }));
        }
      } catch (e) {
        console.warn("[chat] falha ao resolver perfil do destinatário", e);
        const fallback = (await import("@/lib/chat-peer-profile")).fallbackPeer(peerId);
        if (!cancelled) {
          setPeerName(fallback.name);
          setPeerAvatar(null);
          setPeerRole(null);
          setPeerInitials(fallback.initials);
          setPeerIsFallback(true);
        }
      } finally {
        if (!cancelled) setPeerLoading(false);
      }



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



      // Canal de INSERT/UPDATE de mensagens — com RECONEXÃO AUTOMÁTICA.
      // Se o WebSocket cair (CHANNEL_ERROR / TIMED_OUT / CLOSED), removemos o
      // canal antigo e reabrimos com backoff exponencial (até 30s). Ao voltar
      // ao ar, disparamos catch-up imediato para preencher mensagens perdidas.
      let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
      let reconnectAttempt = 0;
      let closed = false;
      // Nome estável da sala para telemetria (independe do channelName aleatório).
      const roomKey = `messages:${[uid, peerId].sort().join(":")}`;
      setRoomStatus(roomKey, "connecting");
      const attachMessagesChannel = () => {
        if (cancelled || closed) return;
        try {
          const channelName = `chat-conv-${Math.random().toString(36).slice(2)}`;
          const ch = supabaseExternal
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
                incrRoomEvent(roomKey, "message");
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
                  const incoming = m.recipient_id === uid && m.sender_id !== uid;
                  if (incoming && !isConversationMuted(uid, peerId)) {
                    try { playIncomingMessageSound(); } catch {}
                    try {
                      notifyIncomingMessage({
                        messageId: m.id,
                        title: peerName || "Nova mensagem",
                        body: m.content || (m.attachment_url ? "📎 Anexo recebido" : "Nova mensagem"),
                        targetUrl: `/chat/${peerId}`,
                      });
                    } catch {}
                  }
                }
                if (m.recipient_id === uid && payload?.eventType !== "UPDATE") markIncomingRead(uid);
              },
            )
            .subscribe((status: string) => {
              if (status === "SUBSCRIBED") {
                reconnectAttempt = 0;
                setRealtimeReconnecting(false);
                setRoomStatus(roomKey, "connected");
                try { void catchUpRef.current?.(); } catch {}
                return;
              }
              if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
                if (cancelled || closed) return;
                setRealtimeReconnecting(true);
                setRoomStatus(roomKey, status === "CHANNEL_ERROR" ? "error" : "reconnecting");
                try { supabaseExternal.removeChannel(ch); } catch {}
                channel = null;
                const delay = Math.min(30_000, 1000 * 2 ** reconnectAttempt);
                reconnectAttempt++;
                if (reconnectTimer) clearTimeout(reconnectTimer);
                reconnectTimer = setTimeout(() => {
                  setRoomStatus(roomKey, "connecting");
                  attachMessagesChannel();
                }, delay);
              }
            });
          channel = ch;
        } catch {
          setRoomStatus(roomKey, "error");
          const delay = Math.min(30_000, 1000 * 2 ** reconnectAttempt);
          reconnectAttempt++;
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(attachMessagesChannel, delay);
        }
      };
      attachMessagesChannel();

      // Reconecta na hora quando a rede volta ou a aba fica visível.
      const forceReconnect = () => {
        if (cancelled || closed) return;
        if (channel) { try { supabaseExternal.removeChannel(channel); } catch {} channel = null; }
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
        reconnectAttempt = 0;
        attachMessagesChannel();
        try { void catchUpRef.current?.(); } catch {}
      };
      const onOnline = () => forceReconnect();
      window.addEventListener("online", onOnline);
      // Guarda handlers para o cleanup abaixo remover.
      (presenceRef as any).__msgCleanup = () => {
        closed = true;
        window.removeEventListener("online", onOnline);
        if (reconnectTimer) clearTimeout(reconnectTimer);
      };



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
            incrRoomEvent(`presence:${key}`, "broadcast");
            lastPeerHeartbeat = Date.now();
            setPeerTyping(true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => setPeerTyping(false), 4000);
          })
          .on("broadcast", { event: "typing-stop" }, ({ payload }: any) => {
            if (payload?.from !== peerId) return;
            incrRoomEvent(`presence:${key}`, "broadcast");
            setPeerTyping(false);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          })
          // Fallback dinâmico (estilo WhatsApp): quando um peer envia mensagem,
          // ele mesmo transmite a linha via broadcast na sala do par. Isso
          // funciona INDEPENDENTE de o postgres_changes/publication estar ativo
          // na tabela `messages`, garantindo entrega em tempo real imediata.
          .on("broadcast", { event: "message-new" }, ({ payload }: any) => {
            const m = payload?.row as MessageRow | undefined;
            if (!m || !m.id) return;
            const inConv =
              (m.sender_id === uid && m.recipient_id === peerId) ||
              (m.sender_id === peerId && m.recipient_id === uid);
            if (!inConv) return;
            incrRoomEvent(`presence:${key}`, "broadcast");
            setMessages((prev) => {
              // Match por client_message_id (otimista) ou id.
              const idx = prev.findIndex(
                (x) =>
                  (m.client_message_id && (x._clientId === m.client_message_id || x.id === m.client_message_id)) ||
                  x.id === m.id,
              );
              if (idx >= 0) {
                const next = prev.slice();
                next[idx] = { ...next[idx], ...m, _clientId: next[idx]._clientId ?? m.client_message_id ?? undefined };
                idSetRef.current.add(m.id);
                return next;
              }
              idSetRef.current.add(m.id);
              const incoming = m.recipient_id === uid && m.sender_id !== uid;
              if (incoming && !isConversationMuted(uid, peerId)) {
                try { playIncomingMessageSound(); } catch {}
                try {
                  notifyIncomingMessage({
                    messageId: m.id,
                    title: peerName || "Nova mensagem",
                    body: m.content || (m.attachment_url ? "📎 Anexo recebido" : "Nova mensagem"),
                    targetUrl: `/chat/${peerId}`,
                  });
                } catch {}
              }
              return [...prev, m];
            });
            if (m.recipient_id === uid) markIncomingRead(uid);
          })
          .subscribe(async (status: string) => {
            if (status === "SUBSCRIBED") {
              setRoomStatus(`presence:${key}`, "connected");
              try { await presenceChannel.track({ online_at: Date.now() }); } catch {}
            } else if (status === "CHANNEL_ERROR") {
              setRoomStatus(`presence:${key}`, "error");
            } else if (status === "TIMED_OUT" || status === "CLOSED") {
              setRoomStatus(`presence:${key}`, "reconnecting");
            }
          });
        presenceRef.current = presenceChannel;

        // Watchdog: se não recebemos "typing" há > 5s, desliga
        expireTimer = setInterval(() => {
          if (Date.now() - lastPeerHeartbeat > 5000) setPeerTyping(false);
        }, 1500);
      } catch {}

      // Canal secundário para notificar a INBOX do peer sobre typing.
      // Assim, mesmo com a conversa fechada, ele vê "digitando…" na lista.
      try {
        const inboxCh = supabaseExternal.channel(`chat-inbox-${peerId}`, {
          config: { broadcast: { self: false } },
        });
        inboxCh.subscribe();
        inboxTypingChannelRef.current = inboxCh;
      } catch {}
    })();


    // Ao trocar de rota / recarregar / esconder aba: envia typing-stop.
    // Ao VOLTAR o foco: re-marca a conversa como lida (sincroniza com o peer).
    const onHide = () => { sendTypingStop(); };
    const onVisible = async () => {
      if (document.visibilityState === "visible") {
        const uid = userId || (await getAuthUid());
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
      if (inboxTypingChannelRef.current) { try { supabaseExternal.removeChannel(inboxTypingChannelRef.current); } catch {} inboxTypingChannelRef.current = null; }
      if (unsubPeerRead) { try { unsubPeerRead(); } catch {} }
      presenceRef.current = null;
      try { (presenceRef as any).__msgCleanup?.(); (presenceRef as any).__msgCleanup = null; } catch {}
      try {
        const key = [userId ?? "?", peerId].sort().join(":");
        clearRoom(`messages:${[userId ?? "?", peerId].sort().join(":")}`);
        clearRoom(`presence:${key}`);
      } catch {}
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerId, loadPage]);

  // (efeito de ancoragem no fim foi movido para após a definição do virtualizer)

  // Presença global — reflete o status online do peer mesmo antes do canal por-par sincronizar
  useEffect(() => {
    const unsub = subscribeGlobalPresence((set) => {
      if (peerId && set.has(peerId)) setPeerOnline(true);
    });
    return () => { unsub(); };
  }, [peerId]);


  // Rede de segurança: polling curto enquanto a aba está visível. Cobre casos
  // em que broadcast/postgres_changes não entregaram (rede instável, canal
  // reconectando). Só bate no banco a cada 4s e usa a última data conhecida
  // como cursor, então o custo é mínimo.
  useEffect(() => {
    if (!userId || !peerId || isMockPeerId(peerId)) return;
    let stopped = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    const tick = async () => {
      if (stopped) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      const last = messages.length > 0 ? messages[messages.length - 1].created_at : null;
      try {
        let q = supabaseExternal
          .from("messages")
          .select(selectCols)
          .or(
            `and(sender_id.eq.${userId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${userId})`,
          )
          .order("created_at", { ascending: true })
          .limit(30);
        if (last) q = q.gt("created_at", last);
        const { data } = await q;
        const rows = (data ?? []) as MessageRow[];
        if (rows.length === 0) return;
        setMessages((prev) => {
          const next = prev.slice();
          let appended = false;
          for (const m of rows) {
            const idx = next.findIndex(
              (x) =>
                (m.client_message_id && (x._clientId === m.client_message_id || x.id === m.client_message_id)) ||
                x.id === m.id,
            );
            if (idx >= 0) {
              next[idx] = { ...next[idx], ...m, _clientId: next[idx]._clientId ?? m.client_message_id ?? undefined };
            } else if (!idSetRef.current.has(m.id)) {
              idSetRef.current.add(m.id);
              next.push(m);
              appended = true;
            }
          }
          if (appended) {
            const anyIncoming = rows.some((m) => m.recipient_id === userId && m.sender_id !== userId);
            if (anyIncoming && !isConversationMuted(userId, peerId)) {
              try { playIncomingMessageSound(); } catch {}
            }
          }
          return next;
        });
        if (rows.some((m) => m.recipient_id === userId)) {
          markIncomingRead(userId);
        }
      } catch {}
    };
    timer = setInterval(tick, 4000);
    // Expõe o catch-up para o listener realtime disparar após reconectar.
    catchUpRef.current = tick;
    const onFocus = () => tick();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, peerId]);



  const loadingOlderRef = useRef(false);
  const loadOlder = async () => {
    if (!userId || messages.length === 0 || !hasMore || loadingOlderRef.current) return;
    loadingOlderRef.current = true;
    const oldest = messages[0].created_at;
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    try {
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
    } finally {
      loadingOlderRef.current = false;
    }
  };

  const onScrollFeed = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const wasNear = isNearBottomRef.current;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (isNearBottomRef.current && pendingScrollHint > 0) setPendingScrollHint(0);
    // Ao chegar ao fim novamente, confirma a leitura das mensagens visíveis.
    if (!wasNear && isNearBottomRef.current && userId) markIncomingRead(userId);
    if (!hasMore || loading) return;
    if (el.scrollTop < 80) void loadOlder();
  };



  const sendTyping = () => {
    if (!userId) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current >= 1500) {
      lastTypingSentRef.current = now;
      try {
        presenceRef.current?.send({ type: "broadcast", event: "typing", payload: { from: userId } });
      } catch {}
      try {
        inboxTypingChannelRef.current?.send({ type: "broadcast", event: "typing", payload: { from: userId } });
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
      const { publicUrl } = await uploadWithRetry("media", path, file, {
        onEvent: (ev) => {
          if (ev.kind === "progress") { setUploadPct(ev.percent); onProgress?.(ev.percent); }
          else if (ev.kind === "waiting-online") toast.message("Aguardando conexão para enviar o anexo…");
          else if (ev.kind === "retry") toast.message(`Reenviando anexo (tentativa ${ev.attempt + 1})…`);
        },
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
   * Classifica o erro do INSERT/UPSERT e reage: sessão inválida → /auth,
   * RLS → mensagem clara sem retry silencioso, rede → toast informativo
   * (o retry exponencial acontece dentro de sendWithRetry).
   */
  const handlePersistError = (err: unknown) => {
    const c = classifyChatError(err);
    if (c.kind === "session") {
      bounceToAuth(navigate, peerId, "Sua sessão expirou.");
      return;
    }
    if (c.kind === "rls") {
      toast.error("Sem permissão para enviar", {
        description: "Faça login novamente ou verifique se o contato ainda existe.",
      });
      return;
    }
    if (c.kind === "validation") {
      toast.error("Identificador inválido", { description: c.message });
      return;
    }
    if (c.kind === "network") {
      toast.error("Falha de rede", { description: "Sem conexão após novas tentativas. Toque em ↻ para tentar de novo." });
      return;
    }
    toast.error("Falha ao enviar", { description: c.message });
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
    // Guard duro contra sender_id=local-* / undefined. Se o par for inválido,
    // devolve o usuário para /auth em vez de gerar 22P02/RLS silenciosa.
    const identity = validateChatIdentities(userId, peerId);
    if (!identity.ok) {
      if (identity.reason === "sender") {
        bounceToAuth(navigate, peerId, "Não conseguimos identificar seu usuário.");
      } else if (identity.reason === "peer") {
        toast.error("Conversa inválida", { description: "Identificador do contato inválido." });
      } else {
        toast.error("Você não pode enviar mensagens para si mesmo.");
      }
      throw new Error(`invalid-identity:${identity.reason}`);
    }

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

    const tryUpsert = async (cols: string) => {
      const { data, error } = await supabaseExternal
        .from("messages")
        .upsert(payload, { onConflict: "client_message_id", ignoreDuplicates: false })
        .select(cols)
        .maybeSingle();
      if (error) throw error;
      return data;
    };

    let row: MessageRow | null = null;
    try {
      const data = await sendWithRetry(() => tryUpsert(selectCols), { retries: 2 });
      row = (data as unknown as MessageRow) ?? null;
    } catch (err: any) {
      const msg = String(err?.message || "");
      const code = String(err?.code || "");
      // Fallback quando:
      //  - a coluna client_message_id ainda não existe (42703)
      //  - não existe índice único em client_message_id para o ON CONFLICT (42P10)
      const missingColumn = code === "42703" || msg.includes("client_message_id");
      const lower = msg.toLowerCase();
      const missingUniqueIndex =
        code === "42P10" ||
        lower.includes("no unique or exclusion constraint") ||
        lower.includes("on conflict specification");
      if (missingColumn || missingUniqueIndex) {
        if (missingColumn) delete payload.client_message_id;
        try {
          const data = await sendWithRetry(async () => {
            const { data, error } = await supabaseExternal
              .from("messages")
              .insert(payload)
              .select("id, sender_id, recipient_id, content, created_at, read, attachment_url, attachment_type, attachment_name, client_message_id")
              .maybeSingle();
            if (error) throw error;
            return data;
          }, { retries: 2 });
          row = (data as unknown as MessageRow) ?? null;
        } catch (err2) {
          handlePersistError(err2);
          throw err2;
        }
      } else {
        handlePersistError(err);
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
      // Notifica a inbox (mesma aba) para exibir a conversa imediatamente,
      // mesmo se o Realtime ainda não estiver ativo na tabela messages.
      try {
        window.dispatchEvent(
          new CustomEvent("fixxer:message-sent", {
            detail: { row: { ...row, _clientId: clientId } },
          }),
        );
      } catch {}
      // Broadcast dinâmico (estilo WhatsApp) — entrega instantânea ao peer
      // mesmo quando a publicação `supabase_realtime` não inclui `messages`.
      try {
        presenceRef.current?.send({
          type: "broadcast",
          event: "message-new",
          payload: { row: { ...row, _clientId: clientId } },
        });
      } catch {}
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
    // Notifica a inbox imediatamente com status "enviando" para que a conversa
    // apareça na lista antes mesmo do INSERT concluir.
    try {
      for (const row of optimisticRows) {
        window.dispatchEvent(
          new CustomEvent("fixxer:message-sending", { detail: { row } }),
        );
      }
    } catch {}
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
        const errMsg = e?.message || "Erro desconhecido de rede";
        toast.error(
          filesToSend.length > 1
            ? `Falha ao enviar item ${i + 1}/${optimBatch.length}`
            : "Falha ao enviar",
          { description: errMsg },
        );
        patchRow(o.clientId, { _pending: false, _failed: true, _uploading: false, _error: errMsg });
        try {
          window.dispatchEvent(
            new CustomEvent("fixxer:message-failed", { detail: { clientId: o.clientId, error: errMsg } }),
          );
        } catch {}
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
          ? { ...x, _pending: true, _failed: false, _uploading: !!m._draftFile, _uploadPct: 0, _error: undefined }
          : x,
      ),
    );

    try {
      window.dispatchEvent(
        new CustomEvent("fixxer:message-sending", {
          detail: {
            row: {
              id: clientId,
              _clientId: clientId,
              sender_id: userId,
              recipient_id: peerId,
              content: m._draftText || m.content || null,
              created_at: new Date().toISOString(),
              read: false,
              _pending: true,
              attachment_url: m.attachment_url ?? null,
              attachment_type: m.attachment_type ?? null,
              attachment_name: m.attachment_name ?? null,
            },
          },
        }),
      );
    } catch {}
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
      const errMsg = e?.message || "Erro desconhecido de rede";
      toast.error("Retentativa falhou", { description: errMsg });
      setMessages((prev) =>
        prev.map((x) => (x._clientId === clientId ? { ...x, _pending: false, _failed: true, _uploading: false, _error: errMsg } : x)),
      );
      try {
        window.dispatchEvent(
          new CustomEvent("fixxer:message-failed", { detail: { clientId, error: errMsg } }),
        );
      } catch {}
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

  const blockKey = userId ? `fixxer:blocked:${userId}` : "";
  const isBlocked = (() => {
    if (typeof window === "undefined" || !blockKey) return false;
    try {
      const arr = JSON.parse(localStorage.getItem(blockKey) || "[]");
      return Array.isArray(arr) && arr.includes(peerId);
    } catch { return false; }
  })();
  const [, forceRender] = useState(0);

  const toggleBlock = () => {
    if (!userId || !blockKey) return;
    try {
      const arr: string[] = JSON.parse(localStorage.getItem(blockKey) || "[]");
      const set = new Set(arr);
      const next = !set.has(peerId);
      if (next) set.add(peerId); else set.delete(peerId);
      localStorage.setItem(blockKey, JSON.stringify(Array.from(set)));
      forceRender((n) => n + 1);
      toast.success(next ? "Usuário bloqueado" : "Usuário desbloqueado");
      window.dispatchEvent(new Event("fixxer:blocked-change"));
    } catch (e: any) {
      toast.error("Falha ao atualizar bloqueio", { description: e?.message });
    }
  };

  const [exportOpen, setExportOpen] = useState(false);
  const openExportModal = () => {
    // Solicita permissão de notificação enquanto o usuário abre uma ação
    // (gesto explícito satisfaz a política dos navegadores).
    try {
      if (currentPermission() === "default") void requestNotificationPermission();
    } catch {}
    setExportOpen(true);
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

  // Lista plana (header + mensagens) para virtualização
  type FeedRow =
    | { kind: "header"; key: string; date: string }
    | { kind: "msg"; key: string; m: MessageRow };
  const feedRows = useMemo<FeedRow[]>(() => {
    const out: FeedRow[] = [];
    for (const g of grouped) {
      out.push({ kind: "header", key: `h-${g.date}`, date: g.date });
      for (const m of g.items) out.push({ kind: "msg", key: `m-${m.id}`, m });
    }
    return out;
  }, [grouped]);

  const messagesVirtualizer = useVirtualizer({
    count: feedRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => (feedRows[i]?.kind === "header" ? 32 : 88),
    overscan: 8,
    getItemKey: (i) => feedRows[i]?.key ?? i,
    measureElement: (el) => el.getBoundingClientRect().height,
  });

  // Pré-carregamento por proximidade do índice: quando os primeiros itens
  // virtuais estão a menos de 5 do topo, dispara loadOlder — evita esperar
  // o usuário raspar até scrollTop < 80 e mantém o histórico "sempre pronto".
  const msgVirtualItems = messagesVirtualizer.getVirtualItems();
  useEffect(() => {
    if (!userId || !hasMore || loadingOlderRef.current || messages.length === 0) return;
    const first = msgVirtualItems[0];
    if (first && first.index <= 5) {
      void loadOlder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgVirtualItems, hasMore, userId, messages.length]);


  // Ancoragem no fim após o virtualizer medir os itens reais — só rola
  // se o usuário estiver perto do fim OU se a última mensagem for dele.
  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const last = messages[messages.length - 1];
    const lastId = last?.id ?? null;
    const isNewLast = !!lastId && lastId !== prevLastIdRef.current;
    const isMineLast = !!last && last.sender_id === userId;
    prevLastIdRef.current = lastId;

    const scrollToEnd = () => {
      requestAnimationFrame(() => {
        try {
          if (feedRows.length > 0) messagesVirtualizer.scrollToIndex(feedRows.length - 1, { align: "end" });
          else if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        } catch {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    };

    if (isInitialLoadRef.current && messages.length > 0) {
      scrollToEnd();
      isInitialLoadRef.current = false;
      isNearBottomRef.current = true;
      return;
    }

    if (isNewLast) {
      if (isMineLast || isNearBottomRef.current) {
        scrollToEnd();
        setPendingScrollHint(0);
      } else {
        // Não interrompe leitura: apenas conta as novas mensagens não vistas.
        setPendingScrollHint((n) => n + 1);
      }
      return;
    }

    // Typing e re-medições: só reancorar se realmente perto do fim.
    if (peerTyping && isNearBottomRef.current) {
      scrollToEnd();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, peerTyping, feedRows.length]);



  const statusLine = realtimeReconnecting ? "Reconectando..." : peerTyping ? "Digitando..." : peerOnline ? "Online" : muted ? "Silenciada" : archived ? "Arquivada" : "Offline";

  const peerCategory = resolvePeerCategory(peerRole);
  const peerTheme = getPeerTheme(peerRole);
  const ownCategory = useCurrentCategory();
  const ownTheme = getCategoryTheme(ownCategory);

  // Aplica a cor do interlocutor no tema global enquanto a conversa está aberta.
  // Só sobrescreve quando a categoria do peer é confiável — evita aplicar
  // tema neutro/errado no restante da UI global.
  useEffect(() => {
    if (!peerCategory) return;
    setContextCategoryOverride(peerCategory);
    return () => setContextCategoryOverride(null);
  }, [peerCategory]);

  // Mede dinamicamente a altura real do rodapé fixo (input + anexos + safe-area)
  // e a repassa como padding-bottom do container de mensagens, evitando que a
  // última mensagem fique escondida atrás dos botões ou input redimensionado.
  useEffect(() => {
    const el = footerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const h = el.getBoundingClientRect().height || 96;
      setFooterHeight((prev) => {
        if (Math.abs(prev - h) < 1) return prev;
        // Se estava colado no fim, mantém após a mudança de altura do rodapé.
        if (isNearBottomRef.current && scrollRef.current) {
          const s = scrollRef.current;
          requestAnimationFrame(() => {
            try { s.scrollTop = s.scrollHeight; } catch {}
          });
        }
        return h;
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, []);


  return (
    <div className="h-[100dvh] bg-black text-white flex flex-col overscroll-contain overflow-hidden">
      <header
        className="shrink-0 z-30 bg-black/90 backdrop-blur-xl border-b-2 px-3 py-2.5"
        style={{ borderColor: `rgba(${peerTheme.rgb}, 0.35)`, paddingTop: "calc(env(safe-area-inset-top) + 0.625rem)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/chat" as any })}
            className="w-9 h-9 shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setDraftText(peerId, content);
              setDraftFiles(peerId, pendingFiles);
              const path = `/perfil/${encodeURIComponent(peerId)}`;
              try { navigate({ to: path as any }); } catch { window.location.href = path; }
            }}
            title="Ver perfil do usuário"
            aria-label="Ver perfil do usuário"
            className="w-11 h-11 shrink-0 rounded-full bg-white/5 border-2 overflow-hidden flex items-center justify-center relative"
            style={{ borderColor: peerTheme.hex, boxShadow: `0 0 12px rgba(${peerTheme.rgb}, 0.45)` }}
          >
            {peerAvatar && !peerIsFallback ? (
              <img src={peerAvatar} alt={peerName} loading="lazy" decoding="async" className="w-full h-full object-cover" />
            ) : peerLoading ? (
              <span className="w-full h-full animate-pulse bg-white/10" aria-label="Carregando avatar" />
            ) : (
              <span className="relative flex h-full w-full items-center justify-center bg-white/5" aria-label="Avatar padrão">
                <UserCircle2 className="h-7 w-7 text-muted-foreground/70" />
                <span className="absolute bottom-1 right-1 min-w-4 h-4 px-0.5 rounded-full bg-black/80 border border-white/15 flex items-center justify-center text-[8px] font-black italic" style={{ color: peerTheme.hex }}>
                  {peerInitials}
                </span>
              </span>
            )}
            {peerOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-black" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            {peerLoading ? (
              <span className="block h-3.5 w-32 rounded bg-white/10 animate-pulse" aria-label="Carregando nome" />
            ) : (
                <p className="font-black uppercase italic text-sm truncate">{peerName || "Conversa"}</p>
            )}
            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
              <span
                className="shrink-0 text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest"
                style={{ backgroundColor: `rgba(${peerTheme.rgb}, 0.15)`, color: peerTheme.hex }}
              >
                {peerTheme.label}
              </span>
              {peerAvailable !== null && (
                <span
                  className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest border"
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
              <span className="min-w-0 text-[10px] uppercase tracking-widest font-bold text-muted-foreground truncate flex items-center gap-1">
                {markingRead && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
                <span className="truncate">{statusLine}</span>
              </span>
            </div>

          </div>
          <div className="flex items-center gap-1">
            <HeaderActionsMenu
              muted={muted}
              archived={archived}
              blocked={isBlocked}
              onSettings={() => setSettingsOpen(true)}
              onUnread={markAsUnread}
              onMute={toggleMute}
              onArchive={toggleArchive}
              onBlock={toggleBlock}
              onExport={openExportModal}
            />
          </div>





        </div>
      </header>


      {linkedAd && (
        <div
          className="shrink-0 z-[9] px-4 py-3 border-b backdrop-blur-xl"
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
        onScroll={onScrollFeed}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{ paddingBottom: `calc(${footerHeight}px + 96px + env(safe-area-inset-bottom))`, scrollPaddingBottom: `calc(${footerHeight}px + 96px + env(safe-area-inset-bottom))` }}
        className={`flex-1 min-h-0 overflow-y-auto px-4 pt-4 space-y-4 relative ${
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
          <div className="text-center flex items-center justify-center gap-2 text-[10px] font-black uppercase italic tracking-widest text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            Carregando mensagens anteriores...
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
          <div
            style={{
              height: messagesVirtualizer.getTotalSize(),
              position: "relative",
              width: "100%",
            }}
          >
            {messagesVirtualizer.getVirtualItems().map((vi) => {
              const row = feedRows[vi.index];
              if (!row) return null;
              return (
                <div
                  key={vi.key}
                  data-index={vi.index}
                  ref={messagesVirtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: `translateY(${vi.start}px)`,
                    paddingBottom: 8,
                  }}
                >
                  {row.kind === "header" ? (
                    <div className="text-center">
                      <span className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground bg-white/5 border border-white/10 rounded-full px-3 py-1">
                        {row.date}
                      </span>
                    </div>
                  ) : (() => {
                    const m = row.m;
                    const mine = m.sender_id === userId;
                    return (
                      <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
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
                              uploadState={
                                m._draftFile || m._pending || m._failed
                                  ? {
                                      uploading: !!m._uploading,
                                      pct: m._uploadPct ?? 0,
                                      failed: !!m._failed,
                                      error: m._error ?? null,
                                    }
                                  : undefined
                              }
                              onRetry={m._failed ? () => retrySend(m) : undefined}
                            />
                          )}
                          {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                          {m._pending && m._uploading && m._draftFile && !isImageType(m.attachment_type) && !(m.attachment_type || "").startsWith("video/") && (
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
                            {m._failed && <> · <AlertCircle className="w-3 h-3 inline text-red-300" /> não enviada</>}
                          </p>
                          {m._failed && (
                            <div
                              role="alert"
                              className="mt-2 flex flex-col gap-2 px-3 py-2 rounded-xl bg-red-500/15 border border-red-500/40 text-red-100 text-[11px] leading-snug"
                            >
                              <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-black uppercase italic tracking-widest text-red-200">
                                    Falha ao enviar
                                  </p>
                                  <p className="text-red-100/90 break-words">
                                    {m._error || "Não foi possível entregar sua mensagem. Verifique sua conexão."}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  onClick={() => retrySend(m)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/30 border border-red-500/60 hover:bg-red-500/45 text-white font-black uppercase italic tracking-widest text-[10px]"
                                >
                                  <RotateCcw className="w-3 h-3" /> Tentar novamente
                                </button>
                                <button
                                  onClick={() => discardFailed(m.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 font-bold uppercase tracking-widest text-[10px]"
                                >
                                  Descartar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
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

      {pendingScrollHint > 0 && (
        <button
          type="button"
          onClick={() => {
            try {
              if (feedRows.length > 0) messagesVirtualizer.scrollToIndex(feedRows.length - 1, { align: "end" });
              else if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            } catch {
              if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
            setPendingScrollHint(0);
            isNearBottomRef.current = true;
          }}
          className="fixed left-1/2 -translate-x-1/2 z-[95] rounded-full px-3 h-9 font-black italic uppercase text-[10px] tracking-widest flex items-center gap-1.5 shadow-2xl border-2 animate-in fade-in slide-in-from-bottom-2"
          style={{
            bottom: `${footerHeight + 12}px`,
            backgroundColor: peerTheme.hex,
            color: "#000",
            borderColor: peerTheme.hex,
            boxShadow: `0 6px 20px rgba(${peerTheme.rgb}, 0.55)`,
          }}
          aria-label={`${pendingScrollHint} nova${pendingScrollHint > 1 ? "s" : ""} mensagem${pendingScrollHint > 1 ? "s" : ""}`}
        >
          ↓ {pendingScrollHint} nova{pendingScrollHint > 1 ? "s" : ""}
        </button>
      )}


      <div
        ref={footerRef}
        className="fixed bottom-0 left-0 right-0 z-[90] bg-black/90 backdrop-blur-xl border-t border-white/10 px-4 py-3"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >

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

          <div className="mb-2 flex items-center gap-1.5">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || sending || pendingFiles.length >= MAX_FILES}
              title={pendingFiles.length >= MAX_FILES ? `Máximo ${MAX_FILES} anexos` : "Anexar arquivos"}
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center disabled:opacity-40"
              aria-label="Anexar arquivos"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setCameraOpen("photo")}
              disabled={uploading || sending || pendingFiles.length >= MAX_FILES}
              title="Tirar foto"
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center disabled:opacity-40"
              aria-label="Tirar foto"
            >
              <Camera className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCameraOpen("video")}
              disabled={uploading || sending || pendingFiles.length >= MAX_FILES}
              title="Gravar vídeo"
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center disabled:opacity-40"
              aria-label="Gravar vídeo"
            >
              <Film className="w-4 h-4" />
            </button>
            <button
              onClick={() => setScheduleOpen(true)}
              title="Propor agendamento"
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center"
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
          </div>
          <div className="flex items-end gap-2">
            <textarea
              value={content}
              onChange={(e) => { setContent(e.target.value); setDraftText(peerId, e.target.value); sendTyping(); }}
              onBlur={sendTypingStop}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              rows={1}
              placeholder="Escreva uma mensagem..."
              className="flex-1 min-w-0 bg-[#1A1A1B] border border-white/10 rounded-2xl px-4 py-3 text-base leading-normal outline-none focus:border-primary/50 resize-none min-h-[44px] max-h-40"

            />
            <button
              onClick={send}
              disabled={sending || uploading || (!content.trim() && pendingFiles.length === 0)}
              className="w-12 h-12 shrink-0 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_15px_rgba(0,255,135,0.3)] disabled:opacity-40 disabled:shadow-none"
              aria-label="Enviar"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
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
      <ChatSettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <CameraCaptureModal
        open={cameraOpen !== null}
        mode={cameraOpen ?? "photo"}
        onClose={() => setCameraOpen(null)}
        onCapture={(file) => acceptIncomingFiles([file])}
      />
      <ExportChatModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        messages={messages.map((m) => ({
          id: m.id,
          created_at: m.created_at,
          sender_id: m.sender_id,
          content: m.content,
          attachment_url: m.attachment_url ?? null,
          attachment_name: m.attachment_name ?? null,
          attachment_type: m.attachment_type ?? null,
        }))}
        peerName={peerName}
        selfName="Você"
        selfId={userId ?? ""}
      />
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
  uploadState,
  onRetry,
}: {
  url: string;
  type?: string | null;
  name: string;
  mine: boolean;
  messageId: string;
  state?: { pct: number; loading: boolean };
  onDownload: () => void;
  uploadState?: { uploading: boolean; pct: number; failed: boolean; error?: string | null };
  onRetry?: () => void;
}) {
  const image = isImageType(type);
  const video = !!type && type.startsWith("video/");
  const audio = isAudioType(type, name);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [rate, setRate] = useState(1);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const cycleRate = () => {
    const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };
  return (
    <div className="mb-1 space-y-1">
      {image ? (
        <div className="relative rounded-lg overflow-hidden bg-white/5 min-h-[6rem]">
          {!mediaLoaded && (
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/10 via-white/[0.04] to-white/10" aria-hidden />
          )}
          <img
            src={url}
            alt={name}
            loading="lazy"
            decoding="async"
            onLoad={() => setMediaLoaded(true)}
            onError={() => setMediaLoaded(true)}
            onClick={() => window.dispatchEvent(new CustomEvent("fixxer:open-media", { detail: { url, type: "image", name } }))}
            className={`rounded-lg max-h-64 object-cover transition-opacity duration-200 cursor-zoom-in ${mediaLoaded ? "opacity-100" : "opacity-0"} ${uploadState?.uploading || uploadState?.failed ? "brightness-50" : ""}`}
          />
          <MediaUploadOverlay uploadState={uploadState} onRetry={onRetry} />
        </div>
      ) : video ? (
        <div className="relative rounded-lg overflow-hidden bg-black min-h-[8rem]">
          {!mediaLoaded && (
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/10 via-white/[0.04] to-white/10" aria-hidden />
          )}
          <video
            src={url}
            controls
            preload="metadata"
            onLoadedMetadata={() => setMediaLoaded(true)}
            onError={() => setMediaLoaded(true)}
            className={`rounded-lg max-h-64 w-full bg-black transition-opacity duration-200 ${mediaLoaded ? "opacity-100" : "opacity-0"} ${uploadState?.uploading || uploadState?.failed ? "brightness-50" : ""}`}
          />
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("fixxer:open-media", { detail: { url, type: "video", name } }))}
            title="Expandir em tela cheia"
            aria-label="Expandir vídeo em tela cheia"
            className="absolute top-2 right-2 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center backdrop-blur-sm"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <MediaUploadOverlay uploadState={uploadState} onRetry={onRetry} />
        </div>



      ) : audio ? (
        <div className={`flex items-center gap-2 p-2 rounded-lg ${mine ? "bg-black/20" : "bg-white/5 border border-white/10"}`}>
          <audio
            ref={audioRef}
            src={url}
            controls
            preload="metadata"
            className="flex-1 min-w-0 h-9"
            onLoadedMetadata={(e) => { (e.currentTarget as HTMLAudioElement).playbackRate = rate; }}
          />
          <button
            type="button"
            onClick={cycleRate}
            title="Velocidade de reprodução"
            aria-label={`Velocidade ${rate}x, clique para alternar`}
            className={`shrink-0 text-[10px] font-black tabular-nums px-2 h-7 rounded-md ${
              mine ? "bg-black/30 hover:bg-black/50 text-white" : "bg-white/10 hover:bg-white/20 text-white"
            }`}
          >
            {rate}x
          </button>
        </div>
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

function MediaUploadOverlay({
  uploadState,
  onRetry,
}: {
  uploadState?: { uploading: boolean; pct: number; failed: boolean; error?: string | null };
  onRetry?: () => void;
}) {
  if (!uploadState) return null;
  if (uploadState.uploading) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 text-white text-[11px] font-bold">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Enviando {Math.round(uploadState.pct)}%
        </div>
        <div className="w-3/4 max-w-[220px] h-1.5 bg-black/50 rounded-full overflow-hidden">
          <div className="h-full bg-white/90 transition-all" style={{ width: `${uploadState.pct}%` }} />
        </div>
      </div>
    );
  }
  if (uploadState.failed) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3">
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/80 text-white text-[10px] font-black uppercase italic tracking-widest">
          <AlertCircle className="w-3 h-3" /> Falhou
        </div>
        {uploadState.error && (
          <p className="text-[10px] text-white/80 text-center max-w-[240px] leading-snug line-clamp-2">
            {uploadState.error}
          </p>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-black text-[11px] font-black uppercase italic tracking-widest hover:bg-white/90"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reenviar
          </button>
        )}
      </div>
    );
  }
  return null;
}




function HeaderActionsMenu(props: {
  muted: boolean;
  archived: boolean;
  blocked: boolean;
  onSettings: () => void;
  onUnread: () => void;
  onMute: () => void;
  onArchive: () => void;
  onBlock: () => void;
  onExport: () => void;
}) {
  const { muted, archived, blocked, onSettings, onUnread, onMute, onArchive, onBlock, onExport } = props;

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const item = (label: string, Icon: any, onClick: () => void, danger = false) => (
    <button
      onClick={() => { setOpen(false); onClick(); }}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left hover:bg-white/5 ${danger ? "text-red-300" : "text-white"}`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Mais opções"
        aria-label="Mais opções"
        aria-expanded={open}
        className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 z-50 w-60 rounded-2xl bg-[#121214] border border-white/10 shadow-2xl overflow-hidden py-1"
        >
          {item("Configurações do chat", Settings, onSettings)}
          <div className="my-1 h-px bg-white/10" />
          {item("Marcar como não lida", MailOpen, onUnread)}

          {item(muted ? "Reativar notificações" : "Silenciar notificações", muted ? BellOff : Bell, onMute)}
          {item(archived ? "Desarquivar conversa" : "Arquivar conversa", archived ? ArchiveRestore : Archive, onArchive)}
          <div className="my-1 h-px bg-white/10" />
          {item("Exportar conversa", FileDown, onExport)}
          {item(blocked ? "Desbloquear usuário" : "Bloquear usuário", Ban, onBlock, true)}
        </div>
      )}
    </div>
  );
}
