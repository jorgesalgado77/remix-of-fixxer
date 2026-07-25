import { useEffect, useMemo, useState } from "react";
import { Check, Search, Pencil } from "lucide-react";
import { ACTIVITY_MATRIX, flattenBranches } from "@/lib/activity-branches";
import { findSimilar } from "@/lib/branch-search";

/**
 * Seletor de "Ramo Principal" com as macro-categorias oficiais + "Outro"
 * customizado com auto-sugestão inteligente.
 *
 * — Salva em `activity_branch` (string).
 * — Quando um ramo já está escolhido, mostra somente ele + botão "Alterar",
 *   mantendo o card "Outro" sempre visível para digitar customizado.
 */

type Props = {
  value?: string | null;
  onChange: (next: string) => void;
  accent?: string;
};

const CORE_MACROS = [
  "manutencao_tech",
  "imobiliario",
  "vestuario_moda",
  "gas_agua_entregas",
  "fitness_esportes",
  "moveis_reformas",
  "marketing_comunicacao",
  "beleza_estetica",
  "pet_veterinaria",
  "saude_cuidados",
];

const MACRO_OPTIONS = ACTIVITY_MATRIX.filter((m) => CORE_MACROS.includes(m.id)).map((m) => ({
  id: m.id,
  icon: m.icon,
  label: m.label,
}));

const CUSTOM_PREFIX = "Outro:";


export function ActivityBranchPicker({ value, onChange, accent = "hsl(var(--primary))" }: Props) {
  const initialCustom = value?.toLowerCase().startsWith(CUSTOM_PREFIX.toLowerCase())
    ? value!.slice(CUSTOM_PREFIX.length).trim()
    : "";
  const [showCustom, setShowCustom] = useState<boolean>(!!initialCustom);
  const [customText, setCustomText] = useState<string>(initialCustom);
  const [editing, setEditing] = useState<boolean>(false);

  useEffect(() => {
    const isCustom = value?.toLowerCase().startsWith(CUSTOM_PREFIX.toLowerCase());
    if (isCustom) {
      setShowCustom(true);
      setCustomText(value!.slice(CUSTOM_PREFIX.length).trim());
    }
  }, [value]);

  const all = useMemo(() => flattenBranches(), []);
  const suggestion = useMemo(() => findSimilar(customText, all), [customText, all]);

  const selectedMacro = useMemo(
    () => MACRO_OPTIONS.find((m) => m.label === value) || null,
    [value],
  );
  const hasSelection = !!selectedMacro || !!(value && value.trim());
  const collapsed = hasSelection && !editing;

  const pickMacro = (label: string) => {
    setShowCustom(false);
    setCustomText("");
    setEditing(false);
    onChange(label);
  };

  const enableCustom = () => {
    setShowCustom(true);
    setEditing(true);
    if (customText.trim()) onChange(`${CUSTOM_PREFIX} ${customText.trim()}`);
    else onChange("");
  };

  const applyOfficial = (label: string) => {
    setShowCustom(false);
    setCustomText("");
    setEditing(false);
    onChange(label);
  };

  // Modo COMPACTO: chip do ramo escolhido + "Alterar"
  if (collapsed && !showCustom) {
    return (
      <div className="space-y-3 w-full">
        <div
          className="w-full flex items-center gap-3 rounded-2xl border p-3"
          style={{ borderColor: accent, background: `${accent}18` }}
        >
          <span className="text-xl shrink-0" aria-hidden>{selectedMacro?.icon ?? "🎯"}</span>
          <span className="text-[12px] font-black uppercase tracking-tight text-white leading-tight flex-1 min-w-0 break-words">
            {value}
          </span>
          <Check className="w-4 h-4 shrink-0" style={{ color: accent }} aria-hidden />
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-white/10 hover:bg-white/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#121214]"
            aria-label="Alterar ramo principal"
          >
            <Pencil className="w-3 h-3" /> Alterar
          </button>
        </div>

        {/* Opção "Outro" sempre visível */}
        <button
          type="button"
          onClick={enableCustom}
          className="w-full flex items-center gap-3 rounded-2xl border-2 border-dashed p-3 text-left transition-all min-w-0 overflow-hidden active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#121214]"
          style={{ borderColor: "rgba(255,255,255,0.18)", background: "transparent" }}
        >
          <span className="text-xl shrink-0" aria-hidden>📝</span>
          <span className="text-[11px] font-black uppercase tracking-tight text-white leading-tight flex-1 min-w-0">
            Outro (Digitar Ramo Customizado)
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
        {MACRO_OPTIONS.map((m) => {
          const active = !showCustom && value === m.label;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => pickMacro(m.label)}
              className="w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition-all min-w-0 overflow-hidden active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#121214]"
              style={{
                borderColor: active ? accent : "rgba(255,255,255,0.1)",
                background: active ? `${accent}18` : "rgba(255,255,255,0.03)",
              }}
              aria-pressed={active}
            >
              <span className="text-xl shrink-0" aria-hidden>{m.icon}</span>
              <span className="text-[11px] font-black uppercase tracking-tight text-white leading-tight flex-1 min-w-0 break-words">
                {m.label}
              </span>
              {active && <Check className="w-4 h-4 shrink-0" style={{ color: accent }} aria-hidden />}
            </button>
          );
        })}

        <button
          type="button"
          onClick={enableCustom}
          className="w-full flex items-center gap-3 rounded-2xl border-2 border-dashed p-3 text-left transition-all min-w-0 overflow-hidden sm:col-span-2 active:scale-[0.98]"
          style={{
            borderColor: showCustom ? accent : "rgba(255,255,255,0.18)",
            background: showCustom ? `${accent}18` : "transparent",
          }}
          aria-pressed={showCustom}
        >
          <span className="text-xl shrink-0" aria-hidden>📝</span>
          <span className="text-[11px] font-black uppercase tracking-tight text-white leading-tight flex-1 min-w-0">
            Outro (Digitar Ramo Customizado)
          </span>
          {showCustom && <Check className="w-4 h-4 shrink-0" style={{ color: accent }} aria-hidden />}
        </button>
      </div>

      {showCustom && (
        <div className="space-y-2 w-full">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" aria-hidden />
            <input
              type="text"
              value={customText}
              onChange={(e) => {
                const v = e.target.value;
                setCustomText(v);
                onChange(v.trim() ? `${CUSTOM_PREFIX} ${v.trim()}` : "");
              }}
              maxLength={80}
              placeholder="Descreva sua especialidade (ex.: Assistência de drones)..."
              className="w-full bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-2xl pl-10 pr-4 py-3 text-sm text-white outline-none"
            />
          </div>

          {suggestion && (
            <div
              className="rounded-2xl border p-3 space-y-2 w-full"
              style={{ borderColor: `${accent}55`, background: `${accent}0f` }}
              role="status"
            >
              <p className="text-[11px] leading-snug text-white/90 break-words">
                💡 Identificamos que essa especialidade já existe na plataforma: <b>{suggestion}</b>. Deseja selecionar a categoria oficial?
              </p>
              <button
                type="button"
                onClick={() => applyOfficial(suggestion)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest active:scale-95"
                style={{ background: accent, color: "#000" }}
              >
                ✅ Usar Categoria Oficial
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
