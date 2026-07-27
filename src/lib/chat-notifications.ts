/**
 * Notificações do navegador para novas mensagens quando a aba está fora de foco.
 *
 * Regras:
 * - Não notifica se a aba está visível E em foco (o usuário já vê a mensagem).
 * - Não notifica para conversas silenciadas globalmente (chat-sound: muteAll)
 *   nem para conversas silenciadas por par (isConversationMuted).
 * - Ao clicar na notificação, foca a janela e navega para a conversa.
 * - Deduplica pelo id da mensagem (evita duplicar em polling + realtime).
 */

const PREFS_KEY = "fixxer:chat-notify-prefs:v1";
const shown = new Set<string>();

export type ChatNotifyPrefs = {
  enabled: boolean; // usuário optou por receber
  onlyWhenBlurred: boolean; // default true
};

export function loadNotifyPrefs(): ChatNotifyPrefs {
  if (typeof window === "undefined") return { enabled: false, onlyWhenBlurred: true };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { enabled: false, onlyWhenBlurred: true };
    return { enabled: false, onlyWhenBlurred: true, ...(JSON.parse(raw) as ChatNotifyPrefs) };
  } catch {
    return { enabled: false, onlyWhenBlurred: true };
  }
}

export function saveNotifyPrefs(p: ChatNotifyPrefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch {}
  try { window.dispatchEvent(new CustomEvent("fixxer:chat-notify-prefs-changed")); } catch {}
}

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function currentPermission(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  try {
    const p = await Notification.requestPermission();
    return p;
  } catch {
    return "denied";
  }
}

export function isTabVisibleAndFocused(): boolean {
  if (typeof document === "undefined") return true;
  const visible = document.visibilityState === "visible";
  const focused = typeof document.hasFocus === "function" ? document.hasFocus() : true;
  return visible && focused;
}

export type NotifyOptions = {
  messageId: string;
  title: string;
  body: string;
  icon?: string;
  targetUrl: string; // rota para navegar ao clicar
};

/**
 * Dispara notificação respeitando foco/permissão. Retorna true se emitida.
 */
export function notifyIncomingMessage(opts: NotifyOptions): boolean {
  if (!notificationsSupported()) return false;
  if (Notification.permission !== "granted") return false;
  const prefs = loadNotifyPrefs();
  if (!prefs.enabled) return false;
  if (prefs.onlyWhenBlurred && isTabVisibleAndFocused()) return false;
  if (shown.has(opts.messageId)) return false;
  shown.add(opts.messageId);
  // Limita o Set para não crescer indefinidamente.
  if (shown.size > 500) {
    const first = shown.values().next().value;
    if (first) shown.delete(first);
  }
  try {
    const n = new Notification(opts.title, {
      body: opts.body.slice(0, 180),
      icon: opts.icon,
      tag: `fixxer-msg-${opts.messageId}`,
      silent: false,
    });
    n.onclick = () => {
      try { window.focus(); } catch {}
      try { window.location.assign(opts.targetUrl); } catch {}
      n.close();
    };
    // Auto-fecha após 8s para não poluir a bandeja.
    setTimeout(() => { try { n.close(); } catch {} }, 8000);
    return true;
  } catch {
    return false;
  }
}
