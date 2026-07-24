import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Check, X } from "lucide-react";
import {
  ACTIVITY_MATRIX,
  CUSTOM_BRANCH_MARKER,
} from "@/lib/activity-branches";

type Props = {
  /** Array de ramos/subcategorias selecionados (labels). */
  value: string[];
  onChange: (next: string[]) => void;
  /** Ramos customizados (texto livre). */
  customValue?: string[];
  onCustomChange?: (next: string[]) => void;
  /** Cor de destaque (usa var(--primary) por padrão). */
  accentColor?: string;
};

/**
 * Seletor hierárquico da matriz multi-setorial de ramos.
 * Suporta seleção de ramos, subcategorias e digitação de ramo customizado.
 */
export function ActivityBranchSelector({
  value,
  onChange,
  customValue = [],
  onCustomChange,
  accentColor,
}: Props) {
  const [openMacro, setOpenMacro] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState("");
  const [customMacroOpen, setCustomMacroOpen] = useState<string | null>(null);

  const accent = accentColor || "hsl(var(--primary))";
  const selectedSet = useMemo(() => new Set(value), [value]);

  const toggle = (label: string) => {
    if (selectedSet.has(label)) {
      onChange(value.filter((v) => v !== label));
    } else {
      onChange([...value, label]);
    }
  };

  const addCustom = (macroId: string) => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (customValue.includes(trimmed)) {
      setCustomInput("");
      return;
    }
    onCustomChange?.([...customValue, trimmed]);
    setCustomInput("");
    setCustomMacroOpen(null);
  };

  const removeCustom = (label: string) => {
    onCustomChange?.(customValue.filter((c) => c !== label));
  };

  return (
    <div className="space-y-3">
      {ACTIVITY_MATRIX.map((macro) => {
        const isOpen = openMacro === macro.id;
        const selectedInMacro = macro.branches.reduce((count, b) => {
          if (b.label !== CUSTOM_BRANCH_MARKER && selectedSet.has(b.label)) count++;
          if (b.subcategories) {
            count += b.subcategories.filter((s) => selectedSet.has(s)).length;
          }
          return count;
        }, 0);

        return (
          <div
            key={macro.id}
            className="rounded-2xl border border-white/10 bg-[#1A1A1B] overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setOpenMacro(isOpen ? null : macro.id)}
              className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl shrink-0">{macro.icon}</span>
                <span className="text-sm font-black uppercase tracking-tight truncate">
                  {macro.label}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selectedInMacro > 0 && (
                  <span
                    className="text-[10px] font-black px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${accent}22`,
                      color: accent,
                    }}
                  >
                    {selectedInMacro}
                  </span>
                )}
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-white/60" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-white/60" />
                )}
              </div>
            </button>

            {isOpen && (
              <div className="p-3 pt-0 space-y-2 border-t border-white/5">
                {macro.branches.map((branch) => {
                  const isCustomMarker = branch.label === CUSTOM_BRANCH_MARKER;
                  const isSelected = selectedSet.has(branch.label);

                  if (isCustomMarker) {
                    const inputOpen = customMacroOpen === macro.id;
                    return (
                      <div key={branch.label} className="pt-2">
                        <button
                          type="button"
                          onClick={() =>
                            setCustomMacroOpen(inputOpen ? null : macro.id)
                          }
                          className="w-full flex items-center gap-2 p-3 rounded-xl border border-dashed border-white/20 hover:border-white/40 transition-colors text-left"
                        >
                          <span className="text-sm font-bold text-white/70">
                            {branch.label}
                          </span>
                        </button>
                        {inputOpen && (
                          <div className="mt-2 flex gap-2">
                            <input
                              type="text"
                              value={customInput}
                              onChange={(e) => setCustomInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addCustom(macro.id);
                                }
                              }}
                              placeholder="Digite seu ramo específico..."
                              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
                            />
                            <button
                              type="button"
                              onClick={() => addCustom(macro.id)}
                              className="px-4 py-2 rounded-xl text-xs font-black uppercase"
                              style={{
                                backgroundColor: accent,
                                color: "#000",
                              }}
                            >
                              Adicionar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div key={branch.label}>
                      <button
                        type="button"
                        onClick={() => toggle(branch.label)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left"
                        style={
                          isSelected
                            ? { borderLeft: `3px solid ${accent}` }
                            : undefined
                        }
                      >
                        <div
                          className="w-4 h-4 rounded shrink-0 border flex items-center justify-center"
                          style={{
                            borderColor: isSelected ? accent : "rgba(255,255,255,0.2)",
                            backgroundColor: isSelected ? accent : "transparent",
                          }}
                        >
                          {isSelected && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
                        </div>
                        <span className="text-xs font-bold flex-1">{branch.label}</span>
                      </button>

                      {branch.subcategories && isSelected && (
                        <div className="ml-6 mt-2 space-y-1.5">
                          {branch.subcategories.map((sub) => {
                            const subSelected = selectedSet.has(sub);
                            return (
                              <button
                                key={sub}
                                type="button"
                                onClick={() => toggle(sub)}
                                className="w-full flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-left"
                              >
                                <div
                                  className="w-3 h-3 rounded-sm shrink-0 border flex items-center justify-center"
                                  style={{
                                    borderColor: subSelected ? accent : "rgba(255,255,255,0.2)",
                                    backgroundColor: subSelected ? accent : "transparent",
                                  }}
                                >
                                  {subSelected && (
                                    <Check className="w-2.5 h-2.5 text-black" strokeWidth={3} />
                                  )}
                                </div>
                                <span className="text-[11px] font-semibold text-white/80">
                                  {sub}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {customValue.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/50">
            Ramos customizados
          </div>
          <div className="flex flex-wrap gap-2">
            {customValue.map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold"
                style={{
                  backgroundColor: `${accent}22`,
                  color: accent,
                  border: `1px solid ${accent}55`,
                }}
              >
                📝 {label}
                <button
                  type="button"
                  onClick={() => removeCustom(label)}
                  className="hover:bg-white/10 rounded-full p-0.5"
                  aria-label={`Remover ${label}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
