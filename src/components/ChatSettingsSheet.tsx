import { useEffect, useState } from "react";
import { BellOff, Bell, X, Volume2, Play } from "lucide-react";
import {
  SOUND_OPTIONS,
  loadChatSoundPrefs,
  saveChatSoundPrefs,
  playChatSound,
  type ChatSoundPrefs,
  type SoundId,
} from "@/lib/chat-sound";

export function ChatSettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [prefs, setPrefs] = useState<ChatSoundPrefs>(() => loadChatSoundPrefs());

  useEffect(() => { if (open) setPrefs(loadChatSoundPrefs()); }, [open]);

  const update = (patch: Partial<ChatSoundPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    saveChatSoundPrefs(next);
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
        className="w-full sm:max-w-md bg-[#111] border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-white/10">
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

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
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
                return (
                  <li key={opt.id}>
                    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${active ? "bg-primary/10 border-primary/50" : "bg-white/[0.03] border-white/10 hover:border-white/20"}`}>
                      <button
                        onClick={() => update({ sound: opt.id as SoundId })}
                        className="flex-1 text-left"
                        aria-pressed={active}
                      >
                        <p className={`font-black uppercase italic text-xs tracking-widest ${active ? "text-primary" : ""}`}>{opt.label}</p>
                        <p className="text-[10px] text-muted-foreground">{opt.description}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => playChatSound(opt.id, prefs.volume)}
                        aria-label={`Ouvir ${opt.label}`}
                        className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
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
          </section>

          <p className="text-[10px] text-muted-foreground/70 text-center pt-2">
            As configurações valem para este dispositivo. Você ainda pode silenciar conversas individuais no menu de cada bate‑papo.
          </p>
        </div>
      </div>
    </div>
  );
}
