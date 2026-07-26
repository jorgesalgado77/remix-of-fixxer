import { useEffect, useRef, useState } from "react";
import { BellOff, Bell, X, Volume2, Play, Upload, Trash2 } from "lucide-react";
import {
  SOUND_OPTIONS,
  loadChatSoundPrefs,
  saveChatSoundPrefs,
  playChatSound,
  loadCustomSound,
  saveCustomSound,
  ingestCustomSoundFile,
  type ChatSoundPrefs,
  type SoundId,
  type CustomSound,
} from "@/lib/chat-sound";

export function ChatSettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [prefs, setPrefs] = useState<ChatSoundPrefs>(() => loadChatSoundPrefs());
  const [custom, setCustom] = useState<CustomSound | null>(() => loadCustomSound());
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setPrefs(loadChatSoundPrefs());
      setCustom(loadCustomSound());
      setUploadError(null);
    }
  }, [open]);

  const update = (patch: Partial<ChatSoundPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    saveChatSoundPrefs(next);
  };

  const onPickFile = async (file: File | null) => {
    if (!file) return;
    setUploadError(null);
    try {
      const saved = await ingestCustomSoundFile(file);
      setCustom(saved);
      update({ sound: "custom" });
    } catch (e: any) {
      setUploadError(e?.message || "Não foi possível salvar o som.");
    }
  };

  const removeCustom = () => {
    saveCustomSound(null);
    setCustom(null);
    if (prefs.sound === "custom") update({ sound: "ping" });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Configurações do chat"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[#111] border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[92dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-black uppercase italic text-sm tracking-tight">Notificações do chat</h2>
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Som e silêncio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div
          className="flex-1 overflow-y-auto p-5 space-y-5"
          style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
        >
          {/* Mute all */}
          <button
            onClick={() => update({ muteAll: !prefs.muteAll })}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
              prefs.muteAll
                ? "bg-amber-500/10 border-amber-500/40"
                : "bg-white/[0.03] border-white/10 hover:border-white/20"
            }`}
            aria-pressed={prefs.muteAll}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${prefs.muteAll ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-muted-foreground"}`}>
              {prefs.muteAll ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black uppercase italic text-xs tracking-widest">
                {prefs.muteAll ? "Notificações silenciadas" : "Silenciar todas as notificações"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {prefs.muteAll ? "Nenhum som será tocado ao receber mensagens." : "Suprime o som de novas mensagens em todas as conversas."}
              </p>
            </div>
            <span className={`w-11 h-6 rounded-full relative transition-colors ${prefs.muteAll ? "bg-amber-500" : "bg-white/15"}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${prefs.muteAll ? "translate-x-5" : "translate-x-0.5"}`} />
            </span>
          </button>

          {/* Sound picker */}
          <section aria-disabled={prefs.muteAll} className={prefs.muteAll ? "opacity-50 pointer-events-none" : ""}>
            <h3 className="text-[10px] uppercase tracking-widest font-black text-muted-foreground mb-2">Som de nova mensagem</h3>
            <ul className="space-y-2">
              {SOUND_OPTIONS.map((opt) => {
                const active = prefs.sound === opt.id;
                const isCustom = opt.id === "custom";
                const disabled = isCustom && !custom;
                return (
                  <li key={opt.id}>
                    <div
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        active
                          ? "bg-primary/10 border-primary/50"
                          : "bg-white/[0.03] border-white/10 hover:border-white/20"
                      } ${disabled ? "opacity-60" : ""}`}
                    >
                      <button
                        onClick={() => !disabled && update({ sound: opt.id as SoundId })}
                        className="flex-1 text-left"
                        aria-pressed={active}
                        disabled={disabled}
                      >
                        <p className={`font-black uppercase italic text-xs tracking-widest ${active ? "text-primary" : ""}`}>
                          {opt.label}
                          {isCustom && custom && (
                            <span className="ml-2 text-[9px] text-muted-foreground normal-case tracking-normal">({custom.name} · {custom.sizeKB}KB)</span>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {isCustom && !custom ? "Envie seu próprio som abaixo" : opt.description}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => !disabled && playChatSound(opt.id, prefs.volume)}
                        aria-label={`Ouvir ${opt.label}`}
                        className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 disabled:opacity-40"
                        disabled={disabled}
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Upload de som personalizado */}
            <div className="mt-3 p-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg bg-primary/15 border border-primary/40 text-primary font-black uppercase italic text-[11px] tracking-widest hover:bg-primary/25"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {custom ? "Trocar meu som" : "Enviar meu som"}
                </button>
                {custom && (
                  <button
                    type="button"
                    onClick={removeCustom}
                    aria-label="Remover som personalizado"
                    className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 flex items-center justify-center hover:bg-red-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => onPickFile(e.target.files?.[0] || null)}
              />
              <p className="text-[10px] text-muted-foreground mt-2">
                Formatos: MP3, WAV, OGG. Limite 500KB. Salvo neste dispositivo.
              </p>
              {uploadError && (
                <p className="text-[10px] text-red-400 mt-1">{uploadError}</p>
              )}
            </div>
          </section>

          {/* Volume */}
          <section aria-disabled={prefs.muteAll} className={prefs.muteAll ? "opacity-50 pointer-events-none" : ""}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Volume</h3>
              <span className="text-[10px] font-black text-muted-foreground">{Math.round(prefs.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(prefs.volume * 100)}
              onChange={(e) => update({ volume: Number(e.target.value) / 100 })}
              className="w-full accent-primary"
              aria-label="Volume das notificações"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Reforço interno aplicado para deixar o toque bem audível mesmo em volume médio.
            </p>
          </section>

          <p className="text-[10px] text-muted-foreground/70 text-center pt-2">
            As configurações valem para este dispositivo. Você ainda pode silenciar conversas individuais no menu de cada bate‑papo.
          </p>
        </div>
      </div>
    </div>
  );
}
