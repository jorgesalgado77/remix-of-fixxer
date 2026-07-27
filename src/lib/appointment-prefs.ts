/**
 * Preferências do usuário para a seção "Meus Agendamentos":
 *  - Antecedência do lembrete (5/10/15/30 min)
 *  - Toggle de som e toast do lembrete
 *  - Respeitar preferências de acessibilidade do sistema
 *    (prefers-reduced-motion) suprimindo automaticamente sons/animações.
 *
 * Persistido em localStorage. Emite evento global para reatividade.
 */
const LS_KEY = "fixxer:appt-prefs:v1";

export type ReminderMinutes = 5 | 10 | 15 | 30;

export type AppointmentPrefs = {
  reminderMinutes: ReminderMinutes;
  soundEnabled: boolean;
  toastEnabled: boolean;
  desktopEnabled: boolean; // notificações do navegador (funcionam em segundo plano)
  respectSystem: boolean; // se true, silencia sons quando prefers-reduced-motion
  pauseAllSounds: boolean; // "Pausar todos os sons" (acessibilidade)
};

export function defaultAppointmentPrefs(): AppointmentPrefs {
  return {
    reminderMinutes: 15,
    soundEnabled: true,
    toastEnabled: true,
    desktopEnabled: true,
    respectSystem: true,
    pauseAllSounds: false,
  };
}


export function loadAppointmentPrefs(): AppointmentPrefs {
  if (typeof window === "undefined") return defaultAppointmentPrefs();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultAppointmentPrefs();
    return { ...defaultAppointmentPrefs(), ...JSON.parse(raw) };
  } catch {
    return defaultAppointmentPrefs();
  }
}

export function saveAppointmentPrefs(prefs: AppointmentPrefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent("fixxer:appt-prefs-changed"));
  } catch {
    /* ignore */
  }
}

/** Retorna true se o sistema pede movimento/estímulo reduzido. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Regra unificada: pode tocar som agora? */
export function canPlaySoundNow(prefs = loadAppointmentPrefs()): boolean {
  if (prefs.pauseAllSounds) return false;
  if (!prefs.soundEnabled) return false;
  if (prefs.respectSystem && prefersReducedMotion()) return false;
  return true;
}

/**
 * Testa se o navegador permite autoplay (WebAudio ou <audio>).
 * Retorna:
 *  - "granted": autoplay OK (contexto rodando)
 *  - "gesture-required": aguardando gesto do usuário
 *  - "unavailable": API indisponível
 */
export async function probeAutoplay(): Promise<
  "granted" | "gesture-required" | "unavailable"
> {
  if (typeof window === "undefined") return "unavailable";
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return "unavailable";
    const ctx: AudioContext = new AC();
    if ((ctx.state as string) === "running") {
      try { await ctx.close(); } catch { /* ignore */ }
      return "granted";
    }
    try { await ctx.resume(); } catch { /* ignore */ }
    const state: string = ctx.state;
    try { await ctx.close(); } catch { /* ignore */ }
    return state === "running" ? "granted" : "gesture-required";
  } catch {
    return "unavailable";
  }
}

/* ---------------- Browser notifications (background-friendly) ---------------- */

export type DesktopPermission = NotificationPermission | "unsupported";

export function desktopSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function desktopPermission(): DesktopPermission {
  if (!desktopSupported()) return "unsupported";
  try { return Notification.permission; } catch { return "unsupported"; }
}

/** Solicita permissão para notificações do navegador. Deve ser chamado a partir de um gesto do usuário. */
export async function requestDesktopPermission(): Promise<DesktopPermission> {
  if (!desktopSupported()) return "unsupported";
  try {
    if (Notification.permission === "granted" || Notification.permission === "denied") {
      return Notification.permission;
    }
    const p = await Notification.requestPermission();
    return p;
  } catch {
    return desktopPermission();
  }
}

export type DesktopNotifyOptions = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
};

/**
 * Dispara uma notificação do navegador. Retorna true se foi disparada.
 * Respeita a preferência `desktopEnabled` e a permissão do usuário.
 * Funciona com a aba em segundo plano (o SO exibe o toast do navegador).
 */
export function showDesktopNotification(opts: DesktopNotifyOptions, prefs = loadAppointmentPrefs()): boolean {
  try {
    if (!prefs.desktopEnabled) return false;
    if (!desktopSupported()) return false;
    if (Notification.permission !== "granted") return false;
    const n = new Notification(opts.title, {
      body: opts.body,
      tag: opts.tag ?? `fixxer-appt-${opts.url ?? "generic"}`,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      requireInteraction: opts.requireInteraction ?? false,
      silent: opts.silent ?? false,
    });
    n.onclick = () => {
      try { window.focus(); } catch { /* ignore */ }
      if (opts.url) window.location.href = opts.url;
    };
    return true;
  } catch {
    return false;
  }
}

