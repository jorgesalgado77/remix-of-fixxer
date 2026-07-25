import { useState, useMemo } from 'react';
import { Plus, Check, X, Car } from 'lucide-react';
import { useOfferings, DEFAULT_OFFERINGS } from '@/hooks/use-offerings';

const MAX_SELECTED = 13; // 3 defaults + 10 customizados

interface OfferingsPickerProps {
  selected: string[];
  onChange: (next: string[]) => void;
  // Detalhes do veículo (aparece quando "Veículo Próprio" está selecionado)
  vehicleType?: string | null;
  vehicleDescription?: string | null;
  onVehicleTypeChange?: (v: string) => void;
  onVehicleDescriptionChange?: (v: string) => void;
}

export function OfferingsPicker({
  selected,
  onChange,
  vehicleType,
  vehicleDescription,
  onVehicleTypeChange,
  onVehicleDescriptionChange,
}: OfferingsPickerProps) {
  const { offerings, addOffering } = useOfferings();
  const [newItem, setNewItem] = useState('');

  const isSelected = (name: string) =>
    selected.some((s) => s.toLowerCase() === name.toLowerCase());

  const customCount = useMemo(
    () => selected.filter((s) => !DEFAULT_OFFERINGS.some((d) => d.toLowerCase() === s.toLowerCase())).length,
    [selected]
  );

  const toggle = (name: string) => {
    if (isSelected(name)) {
      onChange(selected.filter((s) => s.toLowerCase() !== name.toLowerCase()));
    } else {
      if (selected.length >= MAX_SELECTED) return;
      onChange([...selected, name]);
    }
  };

  const handleAdd = async () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    if (customCount >= 10 && !isSelected(trimmed)) return;
    await addOffering(trimmed);
    if (!isSelected(trimmed)) onChange([...selected, trimmed]);
    setNewItem('');
  };

  const vehicleSelected = isSelected('Veículo Próprio');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-black uppercase tracking-tighter text-white">🎁 Oferece</h4>
        <span className="text-[10px] font-bold text-muted-foreground">
          {selected.length}/{MAX_SELECTED} selecionado(s)
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        Marque os itens/recursos que você oferece. Adicione até 10 itens personalizados — eles ficam disponíveis para outros usuários também.
      </p>

      <div className="space-y-2">
        {offerings.map((item) => {
          const active = isSelected(item);
          const isDefault = DEFAULT_OFFERINGS.some((d) => d.toLowerCase() === item.toLowerCase());
          return (
            <div key={item} className="space-y-2">
              <label
                className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                  active
                    ? 'bg-primary/15 border-primary/60'
                    : 'bg-white/5 border-white/10 hover:border-primary/40'
                }`}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggle(item)}
                  className="w-5 h-5 accent-primary"
                  aria-label={`Oferece ${item}`}
                />
                <span className="text-xs font-bold flex-1">{item}</span>
                {!isDefault && (
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Personalizado</span>
                )}
                {active && <Check className="w-4 h-4 text-primary" />}
              </label>

              {/* Detalhes do Veículo — expande quando "Veículo Próprio" está selecionado */}
              {item === 'Veículo Próprio' && active && vehicleSelected && (
                <div className="ml-4 pl-4 border-l-2 border-primary/30 space-y-3 py-2">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                    <Car className="w-3 h-3" /> Características do Veículo
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Tipo</label>
                    <div className="flex flex-wrap gap-2">
                      {['Carro', 'Moto', 'Van', 'Caminhonete', 'Caminhão'].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => onVehicleTypeChange?.(v)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                            vehicleType === v
                              ? 'bg-primary text-black border-primary'
                              : 'bg-white/5 border-white/10 hover:border-primary/50'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                      Descrição (marca, modelo, ano, capacidade)
                    </label>
                    <textarea
                      value={vehicleDescription || ''}
                      onChange={(e) => onVehicleDescriptionChange?.(e.target.value)}
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 focus:border-primary/50 p-3 rounded-2xl outline-none text-sm"
                      placeholder="Ex: Fiat Fiorino 2020, 650kg de capacidade"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Adicionar novo oferecimento */}
      <div className="pt-2 border-t border-white/5 space-y-2">
        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
          Outro (adicionar novo) — {customCount}/10 personalizados
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="Ex: Câmera profissional, EPI completo..."
            maxLength={60}
            disabled={customCount >= 10}
            className="flex-1 bg-white/5 border border-white/10 focus:border-primary/50 p-3 rounded-2xl outline-none text-sm disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newItem.trim() || customCount >= 10}
            className="px-4 rounded-2xl bg-primary text-black font-black text-xs uppercase tracking-widest flex items-center gap-1 disabled:opacity-40"
            aria-label="Adicionar oferecimento"
          >
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>
        {customCount >= 10 && (
          <p className="text-[10px] text-amber-400 font-bold">Limite de 10 itens personalizados atingido.</p>
        )}
      </div>

      {/* Resumo dos selecionados */}
      {selected.length > 0 && (
        <div className="pt-2 flex flex-wrap gap-2">
          {selected.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/20 border border-primary/40 text-[11px] font-bold"
            >
              {s}
              <button
                type="button"
                onClick={() => toggle(s)}
                className="opacity-70 hover:opacity-100"
                aria-label={`Remover ${s}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
