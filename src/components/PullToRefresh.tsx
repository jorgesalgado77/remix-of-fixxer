import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Pull-to-refresh mobile-first para os Feeds.
 * Usa apenas eventos de touch — desktop segue inalterado.
 *
 * Aciona `onRefresh` quando o usuário puxa para baixo estando com o scroll no topo.
 * O gesto é resistivo (dividido por 2.2) e cancela se o usuário rolar para cima antes de soltar.
 */
export function PullToRefresh({
  onRefresh,
  accent = "#00FF87",
  children,
  disabled = false,
}: {
  onRefresh: () => void | Promise<void>;
  accent?: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  const [pull, setPull] = useState(0); // px puxados
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const active = useRef(false);
  const threshold = 70;
  const max = 110;

  const scrollAtTop = () =>
    (window.scrollY || document.documentElement.scrollTop || 0) <= 2;

  const onTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || refreshing) return;
      if (!scrollAtTop()) return;
      startY.current = e.touches[0].clientY;
      active.current = true;
    },
    [disabled, refreshing],
  );

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!active.current || startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }
      if (!scrollAtTop()) {
        active.current = false;
        setPull(0);
        return;
      }
      const resisted = Math.min(max, dy / 2.2);
      setPull(resisted);
    },
    [],
  );

  const onTouchEnd = useCallback(async () => {
    if (!active.current) return;
    active.current = false;
    startY.current = null;
    const willRefresh = pull >= threshold && !refreshing;
    if (willRefresh) {
      setRefreshing(true);
      setPull(threshold);
      try {
        await onRefresh();
      } catch {
        // silencioso — a página exibe o próprio estado de erro
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  }, [pull, refreshing, onRefresh]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  const progress = Math.min(1, pull / threshold);
  const rotate = progress * 360;

  return (
    <>
      {/* Indicador */}
      <div
        aria-hidden={pull === 0 && !refreshing}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
          transform: `translateY(${Math.max(0, pull - 24)}px)`,
          transition: active.current ? "none" : "transform 220ms ease",
          zIndex: 60,
        }}
      >
        <div
          className="mt-2 rounded-full border border-white/10 bg-[#0A0A0B]/85 backdrop-blur-md p-2 shadow-lg"
          style={{
            opacity: refreshing ? 1 : progress,
            boxShadow: `0 0 20px ${accent}33`,
          }}
        >
          <RefreshCw
            className={refreshing ? "w-4 h-4 animate-spin" : "w-4 h-4"}
            style={{
              color: accent,
              transform: refreshing ? undefined : `rotate(${rotate}deg)`,
              transition: refreshing ? undefined : "transform 60ms linear",
            }}
          />
        </div>
      </div>

      <div
        style={{
          transform: pull > 0 ? `translateY(${pull * 0.5}px)` : undefined,
          transition: active.current ? "none" : "transform 220ms ease",
        }}
      >
        {children}
      </div>
    </>
  );
}
