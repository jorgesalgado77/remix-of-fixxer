import { useState, useMemo } from 'react';
import { Plus, Check, X, Car, Coins, ChevronDown, ChevronUp } from 'lucide-react';
import { useOfferings, DEFAULT_OFFERINGS } from '@/hooks/use-offerings';
import { consumeCoins, getCachedBalance, getCurrentUserId } from '@/lib/coins';
import { confirmCoins } from '@/components/ConfirmCoinsDialog';
import { toast } from 'sonner';
import type { PlanId } from '@/lib/monetization';

const MAX_SELECTED = 10;
const EXTRA_COST = 15;
const OBS_MAX = 500;

function quotaFor(plan: PlanId): number {
  if (plan === 'premium') return 5;
  if (plan === 'pro' || plan === 'basico') return 3;
  return 1;
}

interface OfferingsPickerProps {
  selected: string[];
  onChange: (next: string[]) => void;
  planId?: PlanId;
  vehicleType?: string | null;
  vehicleDescription?: string | null;
  onVehicleTypeChange?: (v: string) => void;
  onVehicleDescriptionChange?: (v: string) => void;
  observations?: string | null;
  onObservationsChange?: (v: string) => void;
}

export function OfferingsPicker({
  selected,
  onChange,
  planId = 'free',
  vehicleType,
  vehicleDescription,
  onVehicleTypeChange,
  onVehicleDescriptionChange,
  observations,
  onObservationsChange,
}: OfferingsPickerProps) {
  const { offerings, addOffering } = useOfferings();
  const [newItem, setNewItem] = useState('');
  const [charging, setCharging] = useState(false);
  const [vehicleExpanded, setVehicleExpanded] = useState(false);

  const quota = quotaFor(planId);

  const isSelected = (name: string) =>
    selected.some((s) => s.toLowerCase() === name.toLowerCase());

  const customCount = useMemo(
    () => selected.filter((s) => !DEFAULT_OFFERINGS.some((d) => d.toLowerCase() === s.toLowerCase())).length,
    [selected]
  );

  const chargeExtraIfNeeded = async (nextLength: number): Promise<boolean> => {
    if (nextLength <= quota) return true;
    const uid = getCurrentUserId();
    if (!uid) {
      toast.error('Faça login para desbloquear ofertas extras.');
      return false;
    }
    const balance = getCachedBalance();
    if (balance < EXTRA_COST) {
      toast.error(`Saldo insuficiente. Cada oferta extra custa ${EXTRA_COST} moedas.`);
      return false;
    }
    const ok = await confirmCoins({
      title: 'Oferta extra',
      description: (
        <>
          Seu plano permite <b>{quota}</b> oferta(s) gratuita(s). Deseja gastar{' '}
          <b className="text-amber-300">{EXTRA_COST} moedas</b> por esta oferta extra?
        </>
      ),
      cost: EXTRA_COST,
      confirmLabel: 'Gastar moedas',
    });
    if (!ok) return false;
    setCharging(true);
    try {
      const res = await consumeCoins(uid, EXTRA_COST, 'Oferta extra no perfil', 'action_consume', {
        operation: 'extra_offering',
      });
      if (!res.ok) {
        toast.error('Não foi possível debitar as moedas.');
        return false;
      }
      toast.success(`-${EXTRA_COST} moedas • Oferta extra desbloqueada.`);
      return true;
    } finally {
      setCharging(false);
    }
  };

  const toggle = async (name: string) => {
    if (isSelected(name)) {
      onChange(selected.filter((s) => s.toLowerCase() !== name.toLowerCase()));
      return;
    }
    if (selected.length >= MAX_SELECTED) {
      toast.warning(`Limite máximo de ${MAX_SELECTED} ofertas.`);
      return;
    }
    const nextLen = selected.length + 1;
    const paid = await chargeExtraIfNeeded(nextLen);
    if (!paid) return;
    onChange([...selected, name]);
    if (name.toLowerCase() === 'veículo próprio') setVehicleExpanded(true);
  };

  const handleAdd = async () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    if (selected.length >= MAX_SELECTED && !isSelected(trimmed)) {
      toast.warning(`Limite máximo de ${MAX_SELECTED} ofertas.`);
      return;
    }
    if (!isSelected(trimmed)) {
      const paid = await chargeExtraIfNeeded(selected.length + 1);
      if (!paid) return;
    }
    await addOffering(trimmed);
    if (!isSelected(trimmed)) onChange([...selected, trimmed]);
    setNewItem('');
  };

  const vehicleSelected = isSelected('Veículo Próprio');
  const overQuota = Math.max(0, selected.length - quota);
  const obsLen = (observations || '').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="text-sm font-black uppercase tracking-tighter text-white">🎁 Oferece</h4>
        <span className="text-[10px] font-bold text-muted-foreground">
          {selected.length}/{MAX_SELECTED} • Plano {planId.toUpperCase()} inclui {quota}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        Marque os itens/recursos que você oferece. Seu plano inclui <b>{quota}</b> gratuita(s).
        Cada oferta extra custa <b className="text-amber-300">{EXTRA_COST} 🪙</b> (até {MAX_SELECTED} no total).
      </p>

      {overQuota > 0 && (
        <div className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
          {overQuota} oferta(s) extra ativas • {overQuota * EXTRA_COST} 🪙 já debitadas
        </div>
      )}

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
                  disabled={charging}
                  className="w-5 h-5 accent-primary"
                  aria-label={`Oferece ${item}`}
                />
                <span className="text-xs font-bold flex-1">{item}</span>
                {!active && selected.length >= quota && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-amber-300">
                    <Coins className="w-3 h-3" /> {EXTRA_COST}
                  </span>
                )}
                {!isDefault && (
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Custom</span>
                )}
                {active && <Check className="w-4 h-4 text-primary" />}
              </label>

              {item === 'Veículo Próprio' && active && vehicleSelected && (
                <div className="ml-4 pl-4 border-l-2 border-primary/30 space-y-2 py-2">
                  <button
                    type="button"
                    onClick={() => setVehicleExpanded((v) => !v)}
                    aria-expanded={vehicleExpanded}
                    aria-controls="vehicle-details"
                    className="w-full flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 hover:bg-primary/10 rounded-xl px-3 py-2 border border-primary/20"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Car className="w-3 h-3" /> Características do Veículo
                      {(vehicleType || vehicleDescription) && (
                        <span className="text-[9px] text-white/50 normal-case tracking-normal font-bold">
                          • preenchido
                        </span>
                      )}
                    </span>
                    {vehicleExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {vehicleExpanded && (
                    <div id="vehicle-details" className="space-y-3 pt-2">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Tipo</label>
                        <div className="flex flex-wrap gap-2">
                          {['Carro', 'Moto', 'Van', 'Caminhonete', 'Caminhão'].map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => onVehicleTypeChange?.(vehicleType === v ? '' : v)}
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
              )}
            </div>
          );
        })}
      </div>

      {/* Adicionar novo */}
      <div className="pt-2 border-t border-white/5 space-y-2">
        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 block">
          Outro (adicionar novo) — {customCount} personalizado(s)
        </label>
        <div className="flex gap-2 items-stretch">
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
            placeholder="Ex: Câmera profissional..."
            maxLength={60}
            disabled={selected.length >= MAX_SELECTED || charging}
            className="min-w-0 flex-1 bg-white/5 border border-white/10 focus:border-primary/50 px-3 py-2.5 rounded-2xl outline-none text-sm disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newItem.trim() || selected.length >= MAX_SELECTED || charging}
            className="shrink-0 rounded-2xl bg-primary text-black font-black text-[11px] uppercase tracking-wide flex items-center justify-center gap-1 px-3 py-2.5 disabled:opacity-40 whitespace-nowrap"
            aria-label="Adicionar oferecimento"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>
        {selected.length >= MAX_SELECTED && (
          <p className="text-[10px] text-amber-400 font-bold">Limite máximo de {MAX_SELECTED} ofertas atingido.</p>
        )}
      </div>

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

      {/* Observações da seção Oferece */}
      <div className="pt-4 border-t border-white/5 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
            Observações sobre o que você oferece
          </label>
          <span className={`text-[10px] font-black uppercase tracking-widest ${obsLen > OBS_MAX ? 'text-red-400' : obsLen > OBS_MAX * 0.9 ? 'text-amber-300' : 'text-white/40'}`}>
            {obsLen}/{OBS_MAX}
          </span>
        </div>
        <textarea
          value={observations || ''}
          onChange={(e) => {
            const v = e.target.value.slice(0, OBS_MAX);
            onObservationsChange?.(v);
          }}
          rows={3}
          maxLength={OBS_MAX}
          placeholder="Detalhes, condições, restrições ou combos que você oferece..."
          className="w-full bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 p-3 rounded-2xl outline-none text-sm leading-relaxed resize-none"
        />
      </div>
    </div>
  );
}
