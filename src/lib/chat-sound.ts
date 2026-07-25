/**
 * Preferências globais de som/silêncio das notificações do chat.
 *
 * Persistidas em localStorage. Silenciar aqui suprime TODAS as notificações
 * sonoras do chat, além do "Silenciar por conversa" já existente.
 *
 * Os sons são gerados via WebAudio para não depender de assets remotos.
 */

const LS_KEY = "fixxer:chat-sound-prefs:v1";

export type SoundId = "ping" | "chime" | "pop" | "blip" | "bell";

export type ChatSoundPrefs = {
  muteAll: boolean;   // silencia TODAS as notificações do chat
  sound: SoundId;     // som escolhido para novas mensagens
  volume: number;     // 0..1
};

export const SOUND_OPTIONS: { id: SoundId; label: string; description: string }[] = [
  { id: "ping",  label: "Ping",  description: "Toque curto e claro" },
  { id: "chime", label: "Chime", description: "Duas notas suaves" },
  { id: "pop",   label: "Pop",   description: "Estalo discreto" },
  { id: "blip",  label: "Blip",  description: "Bipe digital" },
  { id: "bell",  label: "Bell",  description: "Sino curto" },
];

export function defaultChatSoundPrefs(): ChatSoundPrefs {
  return { muteAll: false, sound: "ping", volume: 0.6 };
}

export function loadChatSoundPrefs(): ChatSoundPrefs {
  if (typeof window === "undefined") return defaultChatSoundPrefs();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultChatSoundPrefs();
    const parsed = JSON.parse(raw);
    return { ...defaultChatSoundPrefs(), ...parsed };
  } catch { return defaultChatSoundPrefs(); }
}

export function saveChatSoundPrefs(prefs: ChatSoundPrefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent("fixxer:chat-sound-prefs-changed"));
  } catch { /* ignore */ }
}

let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => { /* ignore */ });
    }
    return audioCtx;
  } catch { return null; }
}

type Note = { freq: number; start: number; dur: number; type?: OscillatorType; gain?: number };

const PATTERNS: Record<SoundId, Note[]> = {
  ping:  [{ freq: 880, start: 0,    dur: 0.18, type: "sine" }],
  chime: [
    { freq: 784, start: 0,    dur: 0.16, type: "sine" },
    { freq: 1046, start: 0.12, dur: 0.22, type: "sine" },
  ],
  pop:   [{ freq: 320, start: 0, dur: 0.09, type: "triangle" }],
  blip:  [
    { freq: 1200, start: 0,    dur: 0.06, type: "square", gain: 0.35 },
    { freq: 1600, start: 0.08, dur: 0.06, type: "square", gain: 0.35 },
  ],
  bell:  [
    { freq: 987,  start: 0, dur: 0.35, type: "sine" },
    { freq: 1975, start: 0, dur: 0.35, type: "sine", gain: 0.25 },
  ],
};

/** Toca um som conforme id. Ignora silenciosamente se áudio indisponível. */
export function playChatSound(id: SoundId, volume = 0.6) {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes = PATTERNS[id] ?? PATTERNS.ping;
  const master = ctx.createGain();
  master.gain.value = Math.max(0, Math.min(1, volume));
  master.connect(ctx.destination);
  for (const n of notes) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = n.type ?? "sine";
    osc.frequency.value = n.freq;
    const peak = n.gain ?? 0.6;
    g.gain.setValueAtTime(0.0001, now + n.start);
    g.gain.exponentialRampToValueAtTime(peak, now + n.start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.dur);
    osc.connect(g).connect(master);
    osc.start(now + n.start);
    osc.stop(now + n.start + n.dur + 0.02);
  }
}

/** Toca o som de nova mensagem respeitando muteAll. */
export function playIncomingMessageSound() {
  const p = loadChatSoundPrefs();
  if (p.muteAll) return;
  playChatSound(p.sound, p.volume);
}
