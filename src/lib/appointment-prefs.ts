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
  respectSystem: boolean; // se true, silencia sons quando prefers-reduced-motion
  pauseAllSounds: boolean; // "Pausar todos os sons" (acessibilidade)
};

export function defaultAppointmentPrefs(): AppointmentPrefs {
  return {
    reminderMinutes: 15,
    soundEnabled: true,
    toastEnabled: true,
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
