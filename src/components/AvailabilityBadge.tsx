import { useEffect, useState } from "react";
import { isUserAvailable } from "@/lib/availability";
import { supabaseExternal } from "@/lib/supabaseExternal";

interface Props {
  userId?: string | null;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Bolinha + label mostrando o status de disponibilidade do usuário.
 * Reage a mudanças em tempo real via canal Realtime da tabela user_availability.
 */
export function AvailabilityBadge({ userId, size = "sm", className }: Props) {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!userId) { setAvailable(null); return; }
    (async () => {
      const v = await isUserAvailable(userId);
      if (!cancelled) setAvailable(v);
    })();

    let channel: any = null;
    try {
      channel = supabaseExternal
        .channel(`avail:${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_availability", filter: `user_id=eq.${userId}` },
          (payload: any) => {
            const next = payload?.new?.is_available;
            if (typeof next === "boolean" && !cancelled) setAvailable(next);
          },
        )
        .subscribe();
    } catch { /* silencioso */ }

    return () => {
      cancelled = true;
      try { channel?.unsubscribe(); } catch { /* ignore */ }
    };
  }, [userId]);

  if (available === null) return null;

  const dotSize = size === "md" ? "w-2.5 h-2.5" : "w-2 h-2";
  const textSize = size === "md" ? "text-[10px]" : "text-[9px]";
  const label = available ? "Disponível" : "Indisponível";
  const color = available ? "#10B981" : "#6B7280";

  return (
    <span
      aria-label={label}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border font-black uppercase italic tracking-widest ${textSize} ${className ?? ""}`}
      style={{
        color,
        borderColor: `${color}55`,
        background: `${color}18`,
      }}
    >
      <span
        className={`${dotSize} rounded-full`}
        style={{
          backgroundColor: color,
          boxShadow: available ? `0 0 8px ${color}` : undefined,
        }}
      />
      {label}
    </span>
  );
}
