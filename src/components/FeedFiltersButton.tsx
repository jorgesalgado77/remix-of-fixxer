import { useEffect, useMemo, useState, type ReactNode } from "react";
import { SlidersHorizontal, X, MapPin, Sparkles, Flame, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ACTIVITY_MATRIX } from "@/lib/activity-branches";
import { getMacroSearchTerms } from "@/components/MacroBranchChips";
import {
  FEED_STATUS_COLOR,
  STATUS_FILTERS,
  type StatusFilterKey,
} from "@/lib/feed-status";
import type { CategoryKey } from "@/lib/category-colors";

/**
 * Botão único que abre um modal (bottom-sheet no mobile) com TODOS os filtros
 * do feed: macro-ramo, categoria/setor, status e raio.
 *
 * Substitui as várias tiras horizontais que poluíam o topo dos feeds.
 */

export type FeedFilterOption = {
  key: string;
  label: string;
  icon?: ReactNode;
  color?: string;
};

export type FeedFiltersButtonProps = {
  accent: string; // hex #RRGGBB da categoria
  category: CategoryKey; // usado para persistir o raio
  // ------- macro-ramo -------
  macroValue: string | null;
  onMacroChange: (id: string | null) => void;
  // ------- pílula principal (categoria/setor/subcategoria) -------
  pillLabel?: string;
  pillOptions?: FeedFilterOption[];
  pillValue?: string;
  onPillChange?: (key: string) => void;
  // ------- status -------
  statusValue?: StatusFilterKey;
  onStatusChange?: (key: StatusFilterKey) => void;
  // ------- raio -------
  onRadiusChange?: (km: number) => void;
  badge?: { icon?: string; text: string };
};

const RADIUS_OPTIONS: { value: number; label: string }[] = [
  { value: 10, label: "10 km" },
  { value: 25, label: "25 km" },
  { value: 50, label: "50 km" },
  { value: 100, label: "100 km" },
  { value: 0, label: "Toda a Região" },
];

function radiusStorageKey(cat: CategoryKey) {
  return `fixxer_radius_${cat}`;
}

function readStoredRadius(cat: CategoryKey): number {
  if (typeof window === "undefined") return 25;
  const v = Number(localStorage.getItem(radiusStorageKey(cat)) || "25");
  return Number.isFinite(v) ? v : 25;
}

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function FeedFiltersButton(props: FeedFiltersButtonProps) {
  const {
    accent,
    category,
    macroValue,
    onMacroChange,
    pillLabel = "Categoria",
    pillOptions,
    pillValue,
    onPillChange,
    statusValue,
    onStatusChange,
    onRadiusChange,
    badge,
  } = props;

  const [open, setOpen] = useState(false);
  const [radius, setRadius] = useState<number>(() => readStoredRadius(category));

  // Sincroniza raio quando outra tela dispara o evento global.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { category?: string; radius?: number };
      if (detail?.category === category && typeof detail.radius === "number") {
        setRadius(detail.radius);
      }
    };
    window.addEventListener("fixxer:radius-change", handler as EventListener);
    return () => window.removeEventListener("fixxer:radius-change", handler as EventListener);
  }, [category]);

  // Trava o scroll do body enquanto o modal está aberto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Notifica externo quando o raio muda (após interação inicial).
  useEffect(() => {
    onRadiusChange?.(radius);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius]);

  const applyRadius = (v: number) => {
    setRadius(v);
    try {
      localStorage.setItem(radiusStorageKey(category), String(v));
      window.dispatchEvent(
        new CustomEvent("fixxer:radius-change", { detail: { category, radius: v } }),
      );
    } catch {
      /* noop */
    }
  };

  const activeCount = useMemo(() => {
    let n = 0;
    if (macroValue) n++;
    if (pillValue && pillOptions && pillOptions[0] && pillValue !== pillOptions[0].key) n++;
    if (statusValue && statusValue !== "todos") n++;
    if (radius !== 25) n++;
    return n;
  }, [macroValue, pillValue, pillOptions, statusValue, radius]);

  const resetAll = () => {
    onMacroChange(null);
    if (pillOptions && pillOptions[0] && onPillChange) onPillChange(pillOptions[0].key);
    if (onStatusChange) onStatusChange("todos");
    applyRadius(25);
    toast.success("Filtros restaurados", { duration: 1500 });
  };

  return (
    <>
      {/* Barra compacta: botão único + resumo do raio */}
      <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 pt-3 pb-1 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-2xl border px-3 py-2 text-[11px] font-black uppercase tracking-wide transition-colors"
          style={{
            borderColor: hexToRgba(accent, 0.35),
            backgroundColor: hexToRgba(accent, 0.08),
            color: accent,
            boxShadow: `0 0 14px ${hexToRgba(accent, 0.15)}`,
          }}
          aria-label="Abrir filtros"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtros
          {activeCount > 0 && (
            <span
              className="ml-1 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full text-[10px] font-black"
              style={{ backgroundColor: accent, color: "#0A0A0B" }}
            >
              {activeCount}
            </span>
          )}
        </button>

        <div
          className="hidden sm:flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest"
          style={{
            borderColor: "rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          <MapPin className="w-3 h-3" style={{ color: accent }} />
          Raio: {radius === 0 ? "Toda a região" : `${radius} km`}
        </div>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={resetAll}
            className="ml-auto flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors"
            aria-label="Limpar filtros"
          >
            <RotateCcw className="w-3 h-3" /> Limpar
          </button>
        )}
      </div>

      {/* Badge de oportunidades próximas (mantido, mais compacto) */}
      {badge && (
        <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 pb-2">
          <div
            className="flex items-center gap-2 rounded-2xl border px-3 py-2 text-[11px] font-bold text-white"
            style={{
              borderColor: hexToRgba(accent, 0.35),
              backgroundColor: hexToRgba(accent, 0.08),
              boxShadow: `0 0 18px ${hexToRgba(accent, 0.18)}`,
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
        </div>
      )}

      {/* MODAL */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full sm:max-w-lg max-h-[90dvh] flex flex-col bg-[#0F0F10] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: `0 0 40px ${hexToRgba(accent, 0.25)}` }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" style={{ color: accent }} />
                <h2 className="text-sm font-black uppercase tracking-widest text-white">
                  Filtros
                </h2>
                {activeCount > 0 && (
                  <span
                    className="min-w-[20px] h-5 px-1.5 grid place-items-center rounded-full text-[10px] font-black"
                    style={{ backgroundColor: accent, color: "#0A0A0B" }}
                  >
                    {activeCount}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-white/70"
                aria-label="Fechar filtros"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo scrollável */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              {/* MACRO-RAMOS */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-3.5 h-3.5" style={{ color: accent }} />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-white/60">
                    Ramo de Atividade
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onMacroChange(null)}
                    className="px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wide"
                    style={
                      macroValue === null
                        ? { backgroundColor: accent, color: "#000", boxShadow: `0 0 10px ${hexToRgba(accent, 0.35)}` }
                        : { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.1)" }
                    }
                  >
                    ✨ Todos
                  </button>
                  {ACTIVITY_MATRIX.map((m) => {
                    const active = macroValue === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onMacroChange(active ? null : m.id)}
                        title={m.label}
                        className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5"
                        style={
                          active
                            ? { backgroundColor: accent, color: "#000", boxShadow: `0 0 10px ${hexToRgba(accent, 0.35)}` }
                            : { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.1)" }
                        }
                      >
                        <span>{m.icon}</span>
                        <span className="max-w-[10rem] truncate">{m.label.split(",")[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* PÍLULAS (categoria/setor/subcategoria) */}
              {pillOptions && pillOptions.length > 0 && onPillChange && (
                <section>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-3">
                    {pillLabel}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {pillOptions.map((f) => {
                      const active = pillValue === f.key;
                      return (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => onPillChange(f.key)}
                          className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5"
                          style={
                            active
                              ? { backgroundColor: accent, color: "#000", boxShadow: `0 0 10px ${hexToRgba(accent, 0.35)}` }
                              : { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.1)" }
                          }
                        >
                          {f.icon}
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* STATUS */}
              {onStatusChange && (
                <section>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-3">
                    Status
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_FILTERS.map((s) => {
                      const active = statusValue === s.key;
                      const color = s.key === "todos" ? accent : FEED_STATUS_COLOR[s.key];
                      return (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => onStatusChange(s.key)}
                          className="px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wide border"
                          style={
                            active
                              ? { backgroundColor: color, color: "#0A0A0B", borderColor: color, boxShadow: `0 0 10px ${color}55` }
                              : { backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.1)" }
                          }
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* RAIO */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-3.5 h-3.5" style={{ color: accent }} />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-white/60">
                    Raio de Atuação
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {RADIUS_OPTIONS.map((opt) => {
                    const active = radius === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => applyRadius(opt.value)}
                        className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-wide"
                        style={
                          active
                            ? {
                                backgroundColor: accent,
                                color: "#0A0A0B",
                                borderColor: accent,
                                boxShadow: `0 0 12px ${hexToRgba(accent, 0.45)}`,
                              }
                            : {
                                backgroundColor: "#1A1A1B",
                                color: "rgba(255,255,255,0.7)",
                                borderColor: "rgba(255,255,255,0.1)",
                              }
                        }
                      >
                        <MapPin className="w-3 h-3" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 px-5 py-4 border-t border-white/10">
              <button
                type="button"
                onClick={resetAll}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Restaurar
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl py-2.5 text-[11px] font-black uppercase tracking-widest"
                style={{
                  backgroundColor: accent,
                  color: "#0A0A0B",
                  boxShadow: `0 0 18px ${hexToRgba(accent, 0.4)}`,
                }}
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default FeedFiltersButton;

/**
 * Wrapper que gerencia o estado interno de macro-ramo e emite o termo de
 * busca associado — assim as páginas de feed não precisam mais criar um
 * useState só para o macro filtro.
 */
export function FeedFiltersBar(
  props: Omit<FeedFiltersButtonProps, "macroValue" | "onMacroChange"> & {
    onMacroSearchTerm?: (term: string | null) => void;
  },
) {
  const { onMacroSearchTerm, ...rest } = props;
  const [macro, setMacro] = useState<string | null>(null);
  return (
    <FeedFiltersButton
      {...rest}
      macroValue={macro}
      onMacroChange={(id) => {
        setMacro(id);
        if (!id) {
          onMacroSearchTerm?.(null);
          return;
        }
        const terms = getMacroSearchTerms(id);
        onMacroSearchTerm?.(terms[0] ?? null);
      }}
    />
  );
}
