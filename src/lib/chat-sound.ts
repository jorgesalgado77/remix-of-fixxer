/**
 * Preferências globais de som/silêncio das notificações do chat.
 *
 * Persistidas em localStorage. Silenciar aqui suprime TODAS as notificações
 * sonoras do chat, além do "Silenciar por conversa" já existente.
 *
 * Sons padrão gerados via WebAudio (sem dependência de assets remotos).
 * O usuário também pode enviar um som personalizado (data URL) via upload.
 */

const LS_KEY = "fixxer:chat-sound-prefs:v2";
const LS_CUSTOM_KEY = "fixxer:chat-sound-custom:v1";

export type SoundId =
  | "ping"
  | "chime"
  | "pop"
  | "blip"
  | "bell"
  | "siren"      // NOVO
  | "urgent"     // NOVO
  | "buzzer"     // NOVO
  | "arcade"     // NOVO
  | "alert"      // NOVO
  | "custom";    // som enviado pelo usuário

export type ChatSoundPrefs = {
  muteAll: boolean;
  sound: SoundId;
  volume: number; // 0..1 (aplicado sobre um master boost interno)
};

export const SOUND_OPTIONS: { id: SoundId; label: string; description: string }[] = [
  { id: "ping",   label: "Ping",       description: "Toque curto e claro" },
  { id: "chime",  label: "Chime",      description: "Duas notas suaves" },
  { id: "pop",    label: "Pop",        description: "Estalo discreto" },
  { id: "blip",   label: "Blip",       description: "Bipe digital" },
  { id: "bell",   label: "Bell",       description: "Sino curto" },
  { id: "siren",  label: "Sirene",     description: "Alerta contínuo — chamativo" },
  { id: "urgent", label: "Urgente",    description: "Três bipes fortes em sequência" },
  { id: "buzzer", label: "Buzzer",     description: "Zumbido grave — não passa batido" },
  { id: "arcade", label: "Arcade",     description: "Chiptune animado" },
  { id: "alert",  label: "Alerta Pro", description: "Ascendente forte e nítido" },
  { id: "custom", label: "Meu som",    description: "Som personalizado enviado por você" },
];

export function defaultChatSoundPrefs(): ChatSoundPrefs {
  return { muteAll: false, sound: "ping", volume: 1 };
}

export function loadChatSoundPrefs(): ChatSoundPrefs {
  if (typeof window === "undefined") return defaultChatSoundPrefs();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultChatSoundPrefs();
    const parsed = JSON.parse(raw);
    const merged = { ...defaultChatSoundPrefs(), ...parsed } as ChatSoundPrefs;
    // Se selecionou "custom" mas não há custom salvo, cai para "ping".
    if (merged.sound === "custom" && !loadCustomSound()) merged.sound = "ping";
    return merged;
  } catch { return defaultChatSoundPrefs(); }
}

export function saveChatSoundPrefs(prefs: ChatSoundPrefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent("fixxer:chat-sound-prefs-changed"));
  } catch { /* ignore */ }
}

// -------- Som personalizado (upload do usuário) --------
export type CustomSound = { name: string; dataUrl: string; sizeKB: number };

export function loadCustomSound(): CustomSound | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_CUSTOM_KEY);
    return raw ? (JSON.parse(raw) as CustomSound) : null;
  } catch { return null; }
}

export function saveCustomSound(sound: CustomSound | null) {
  if (typeof window === "undefined") return;
  try {
    if (sound) localStorage.setItem(LS_CUSTOM_KEY, JSON.stringify(sound));
    else localStorage.removeItem(LS_CUSTOM_KEY);
    window.dispatchEvent(new CustomEvent("fixxer:chat-sound-prefs-changed"));
  } catch { /* ignore */ }
}

/** Lê um arquivo (audio/*) e salva como data URL. Limite ~500KB. */
export async function ingestCustomSoundFile(file: File): Promise<CustomSound> {
  if (!file.type.startsWith("audio/")) throw new Error("Envie um arquivo de áudio (mp3, wav, ogg…).");
  if (file.size > 500 * 1024) throw new Error("Arquivo muito grande (limite 500KB).");
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
  const custom: CustomSound = { name: file.name, dataUrl, sizeKB: Math.round(file.size / 1024) };
  saveCustomSound(custom);
  return custom;
}

// -------- WebAudio --------
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

const PATTERNS: Record<Exclude<SoundId, "custom">, Note[]> = {
  ping:  [{ freq: 880, start: 0, dur: 0.18, type: "sine", gain: 1 }],
  chime: [
    { freq: 784,  start: 0,    dur: 0.18, type: "sine", gain: 1 },
    { freq: 1046, start: 0.12, dur: 0.24, type: "sine", gain: 1 },
  ],
  pop:   [{ freq: 320, start: 0, dur: 0.09, type: "triangle", gain: 1 }],
  blip:  [
    { freq: 1200, start: 0,    dur: 0.07, type: "square", gain: 0.7 },
    { freq: 1600, start: 0.09, dur: 0.07, type: "square", gain: 0.7 },
  ],
  bell:  [
    { freq: 987,  start: 0, dur: 0.4, type: "sine",     gain: 1 },
    { freq: 1975, start: 0, dur: 0.4, type: "triangle", gain: 0.6 },
  ],
  // Sirene: alterna entre duas frequências
  siren: [
    { freq: 700,  start: 0.00, dur: 0.18, type: "sawtooth", gain: 0.9 },
    { freq: 1100, start: 0.18, dur: 0.18, type: "sawtooth", gain: 0.9 },
    { freq: 700,  start: 0.36, dur: 0.18, type: "sawtooth", gain: 0.9 },
    { freq: 1100, start: 0.54, dur: 0.20, type: "sawtooth", gain: 0.9 },
  ],
  urgent: [
    { freq: 1400, start: 0.00, dur: 0.12, type: "square", gain: 0.9 },
    { freq: 1400, start: 0.20, dur: 0.12, type: "square", gain: 0.9 },
    { freq: 1400, start: 0.40, dur: 0.14, type: "square", gain: 1.0 },
  ],
  buzzer: [
    { freq: 180, start: 0, dur: 0.55, type: "sawtooth", gain: 1 },
    { freq: 90,  start: 0, dur: 0.55, type: "square",   gain: 0.6 },
  ],
  arcade: [
    { freq: 660,  start: 0.00, dur: 0.09, type: "square", gain: 0.8 },
    { freq: 880,  start: 0.10, dur: 0.09, type: "square", gain: 0.8 },
    { freq: 1174, start: 0.20, dur: 0.09, type: "square", gain: 0.8 },
    { freq: 1568, start: 0.30, dur: 0.14, type: "square", gain: 0.9 },
  ],
  alert: [
    { freq: 600,  start: 0.00, dur: 0.10, type: "triangle", gain: 0.9 },
    { freq: 900,  start: 0.10, dur: 0.10, type: "triangle", gain: 0.9 },
    { freq: 1300, start: 0.20, dur: 0.14, type: "triangle", gain: 1.0 },
    { freq: 1800, start: 0.34, dur: 0.20, type: "sine",     gain: 1.0 },
  ],
};

// Master boost — reforça o volume percebido de todos os sons.
const MASTER_BOOST = 2.6;

function playPattern(id: Exclude<SoundId, "custom">, volume: number) {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes = PATTERNS[id] ?? PATTERNS.ping;
  const master = ctx.createGain();
  master.gain.value = Math.max(0, Math.min(1, volume)) * MASTER_BOOST;
  // Compressor evita distorção quando o boost + volume alto somam picos.
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.setValueAtTime(-14, now);
  comp.knee.setValueAtTime(24, now);
  comp.ratio.setValueAtTime(6, now);
  comp.attack.setValueAtTime(0.003, now);
  comp.release.setValueAtTime(0.15, now);
  master.connect(comp).connect(ctx.destination);
  for (const n of notes) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = n.type ?? "sine";
    osc.frequency.value = n.freq;
    const peak = n.gain ?? 0.9;
    g.gain.setValueAtTime(0.0001, now + n.start);
    g.gain.exponentialRampToValueAtTime(peak, now + n.start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.dur);
    osc.connect(g).connect(master);
    osc.start(now + n.start);
    osc.stop(now + n.start + n.dur + 0.03);
  }
}

let customAudio: HTMLAudioElement | null = null;
function playCustom(volume: number) {
  const custom = loadCustomSound();
  if (!custom) return;
  try {
    if (!customAudio || customAudio.src !== custom.dataUrl) {
      customAudio = new Audio(custom.dataUrl);
    }
    customAudio.currentTime = 0;
    // Sem master boost (respeita o arquivo do usuário), mas garante escala 0..1.
    customAudio.volume = Math.max(0, Math.min(1, volume));
    void customAudio.play().catch(() => { /* usuário sem gesto ainda */ });
  } catch { /* ignore */ }
}

/** Toca um som conforme id. */
export function playChatSound(id: SoundId, volume = 1) {
  if (id === "custom") return playCustom(volume);
  playPattern(id as Exclude<SoundId, "custom">, volume);
}

/** Toca o som de nova mensagem respeitando muteAll. */
export function playIncomingMessageSound() {
  const p = loadChatSoundPrefs();
  if (p.muteAll) return;
  playChatSound(p.sound, p.volume);
}
