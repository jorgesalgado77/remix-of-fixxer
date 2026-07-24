import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { subscribeBalance } from "@/lib/coins";
import { CoinsExtractModal } from "@/components/CoinsExtractModal";

interface Props {
  compact?: boolean;
  className?: string;
}

/**
 * Badge de saldo de moedas em tempo real.
 * Clique -> abre modal de extrato.
 */
export function CoinBalanceBadge({ compact, className }: Props) {
  const [balance, setBalance] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => subscribeBalance((v) => {
    setBalance(v);
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 500);
    return () => clearTimeout(t);
  }), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Ver extrato de moedas"
        className={
          "group inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 " +
          "px-3 py-1.5 text-amber-300 hover:bg-amber-400/20 hover:border-amber-400/60 active:scale-95 transition-all " +
          (pulse ? "ring-2 ring-amber-300/60 " : "") +
          (className || "")
        }
      >
        <Coins className={"w-4 h-4 " + (pulse ? "animate-pulse" : "")} />
        <span className="font-black tabular-nums text-sm">
          {balance.toLocaleString("pt-BR")}
        </span>
        {!compact && (
          <span className="text-[9px] font-black uppercase tracking-widest opacity-70">
            Moedas
          </span>
        )}
      </button>

      {open && <CoinsExtractModal onClose={() => setOpen(false)} />}
    </>
  );
}
