import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Crown } from "lucide-react";
import { PlanDetailsModal } from "@/components/PlanDetailsModal";
import type { PlanId } from "@/lib/monetization";

interface Props {
  planId?: PlanId | string | null;
  renewsAt?: string | null;
  className?: string;
}

const PLAN_STYLE: Record<string, { label: string; from: string; to: string; text: string; border: string }> = {
  free:     { label: "Free",    from: "from-slate-500/20",  to: "to-slate-500/10",  text: "text-slate-200",  border: "border-slate-400/30" },
  basico:   { label: "Básico",  from: "from-sky-500/20",    to: "to-sky-500/10",    text: "text-sky-200",    border: "border-sky-400/30" },
  pro:      { label: "Pró",     from: "from-amber-500/25",  to: "to-orange-500/10", text: "text-amber-200",  border: "border-amber-400/40" },
  premium:  { label: "Premium", from: "from-fuchsia-500/25",to: "to-purple-500/10", text: "text-fuchsia-200",border: "border-fuchsia-400/40" },
};

export function PlanBadge({ planId, renewsAt, className }: Props) {
  const key = (planId || "free").toString().toLowerCase();
  const style = PLAN_STYLE[key] || PLAN_STYLE.free;
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Detalhes do plano"
        className={
          `group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 bg-gradient-to-r ${style.from} ${style.to} ${style.border} ${style.text} ` +
          "hover:brightness-125 active:scale-95 transition-all w-full justify-center " +
          (className || "")
        }
      >
        <Crown className="w-4 h-4" />
        <span className="text-[10px] font-black uppercase tracking-widest">Plano {style.label}</span>
      </button>

      {open && mounted && createPortal(
        <PlanDetailsModal
          currentPlan={key as PlanId}
          renewsAt={renewsAt ?? null}
          onClose={() => setOpen(false)}
        />,
        document.body
      )}
    </>
  );
}
