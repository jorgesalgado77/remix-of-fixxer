import { useEffect, useState } from "react";
import { MapPin, Flame } from "lucide-react";
import { toast } from "sonner";
import type { CategoryKey } from "@/lib/category-colors";

/**
 * Filtro de raio de atuação (km) reutilizável para os feeds.
 * Renderiza:
 *  - pílulas horizontais 10/25/50/100/Toda a Região
 *  - badge flutuante de oportunidades próximas
 * Persiste a escolha em localStorage (`fixxer_radius_<category>`) e
 * dispara `fixxer:radius-change` para outras telas escutarem.
 */

const RADIUS_OPTIONS: { value: number; label: string }[] = [
  { value: 10, label: "10 km" },
  { value: 25, label: "25 km" },
  { value: 50, label: "50 km" },
  { value: 100, label: "100 km" },
  { value: 0, label: "Toda a Região" },
];

export type RadiusFilterProps = {
  category: CategoryKey;
  accent: string; // hex #RRGGBB
  badge?: { icon?: string; text: string };
  onChange?: (radiusKm: number) => void;
};

function storageKey(cat: CategoryKey) {
  return `fixxer_radius_${cat}`;
}

export function readRadius(cat: CategoryKey): number {
  if (typeof window === "undefined") return 25;
  const v = Number(localStorage.getItem(storageKey(cat)) || "25");
  return Number.isFinite(v) ? v : 25;
}

export function RadiusFilter({ category, accent, badge, onChange }: RadiusFilterProps) {
  const [radius, setRadius] = useState<number>(() => readRadius(category));

  useEffect(() => {
    onChange?.(radius);
  }, [radius, onChange]);

  const rgba = (a: number) => {
    const h = accent.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };

  const applyRadius = (v: number) => {
    setRadius(v);
    try {
      localStorage.setItem(storageKey(category), String(v));
      window.dispatchEvent(
        new CustomEvent("fixxer:radius-change", { detail: { category, radius: v } }),
      );
    } catch {
      /* noop */
    }
    const label = v === 0 ? "toda a região" : `${v} km`;
    toast.success(`Raio de atuação: ${label}`, { duration: 1500 });
  };

  return (
    <div className="w-full space-y-2 px-3 sm:px-4 pt-3 pb-1 max-w-3xl mx-auto">
      {/* Badge flutuante de oportunidades próximas */}
      {badge && (
        <div
          className="flex items-center gap-2 rounded-2xl border px-3 py-2 text-[11px] font-bold text-white"
          style={{
            borderColor: rgba(0.35),
            backgroundColor: rgba(0.08),
            boxShadow: `0 0 18px ${rgba(0.18)}`,
          }}
          role="status"
          aria-live="polite"
        >
          <Flame className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} aria-hidden />
          <span className="leading-tight">
            {badge.icon ? <span className="mr-1">{badge.icon}</span> : null}
            {badge.text}
          </span>
        </div>
      )}

      {/* Pílulas de raio */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-1 px-1">
        <span
          className="shrink-0 text-[10px] font-black uppercase tracking-widest"
          style={{ color: accent }}
        >
          Raio:
        </span>
        {RADIUS_OPTIONS.map((opt) => {
          const active = radius === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => applyRadius(opt.value)}
              className="shrink-0 flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-wide transition-all whitespace-nowrap"
              style={
                active
                  ? {
                      backgroundColor: accent,
                      color: "#0A0A0B",
                      borderColor: accent,
                      boxShadow: `0 0 12px ${rgba(0.45)}`,
                    }
                  : {
                      backgroundColor: "#1A1A1B",
                      color: "rgba(255,255,255,0.7)",
                      borderColor: "rgba(255,255,255,0.1)",
                    }
              }
              aria-pressed={active}
            >
              <MapPin className="h-3 w-3" aria-hidden />
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default RadiusFilter;
