import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";

// 32 emojis mais usados — leve, sem dependência externa.
const EMOJIS = [
  "😀","😂","🥲","😍","😘","😎","🤗","🤔",
  "😅","😁","😉","🙃","😴","🥳","😇","🤝",
  "👍","👏","🙏","💪","👌","🤙","✌️","🫡",
  "❤️","🔥","✨","🎉","💯","⚡","💰","📌",
];

interface Props {
  onPick: (emoji: string) => void;
  disabled?: boolean;
}

/**
 * FIXXER — Seletor rápido de emojis para o chat.
 * - Popover simples via posicionamento absoluto (sem dependência nova).
 * - Fecha ao clicar fora ou ESC.
 */
export function ChatEmojiPicker({ onPick, disabled }: Props) {
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

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-label="Inserir emoji"
        aria-expanded={open}
        title="Emojis"
        className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center disabled:opacity-40"
      >
        <Smile className="w-4 h-4" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Seletor de emojis"
          className="absolute bottom-full mb-2 left-0 z-[95] w-64 p-2 rounded-2xl bg-[#121214] border border-white/10 shadow-2xl grid grid-cols-8 gap-1"
        >
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => { onPick(e); setOpen(false); }}
              className="h-8 w-8 rounded-lg hover:bg-white/10 text-lg leading-none"
              aria-label={`Inserir ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
