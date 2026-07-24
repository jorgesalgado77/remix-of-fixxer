/**
 * FIXXER - Serviço de Monetização Dinâmica
 * ------------------------------------------------------------
 * Fonte de verdade: tabela `system_settings` no Supabase externo
 * (key = 'monetization', value = jsonb).
 * Fallback offline: localStorage (chave `fixxer_monetization_v1`).
 *
 * Todas as telas de cobrança / planos / pacotes devem consumir
 * `getMonetizationConfig()` — nunca hardcode preços.
 */
import { supabaseExternal } from "@/lib/supabaseExternal";

export type PlanId = "free" | "basico" | "pro" | "premium";

export interface PlanConfig {
  id: PlanId;
  name: string;
  enabled: boolean;
  priceMonthlyBRL: number;   // PIX
  priceYearlyBRL: number;    // Cartão 12x (com 20% OFF)
  coinsMonthly: number;      // Franquia de moedas/mês
  freeAdsMonthly: number;    // Anúncios/Solicitações grátis/mês
}

export interface ActionCost {
  key: string;
  label: string;
  coins: number;
  enabled: boolean;
}

export interface CoinPack {
  id: string;
  name: string;
  priceBRL: number;
  coins: number;
  bonusLabel: string;   // ex "+15% Bônus"
  highlight?: string;   // ex "Mais Popular"
  enabled: boolean;
}

export interface MonetizationConfig {
  version: number;
  updatedAt: string;
  plans: PlanConfig[];
  actions: ActionCost[];
  coinPacks: CoinPack[];
}

export const DEFAULT_MONETIZATION: MonetizationConfig = {
  version: 1,
  updatedAt: new Date(0).toISOString(),
  plans: [
    { id: "free",     name: "Free",     enabled: true, priceMonthlyBRL: 0,     priceYearlyBRL: 0,      coinsMonthly: 0,   freeAdsMonthly: 0  },
    { id: "basico",   name: "Básico",   enabled: true, priceMonthlyBRL: 19.90, priceYearlyBRL: 191.04, coinsMonthly: 200, freeAdsMonthly: 2  },
    { id: "pro",      name: "Pró",      enabled: true, priceMonthlyBRL: 49.90, priceYearlyBRL: 479.04, coinsMonthly: 400, freeAdsMonthly: 5  },
    { id: "premium",  name: "Premium",  enabled: true, priceMonthlyBRL: 99.90, priceYearlyBRL: 959.04, coinsMonthly: 800, freeAdsMonthly: 10 },
  ],
  actions: [
    { key: "publish_extra",        label: "Publicar Excedente",                       coins: 20,  enabled: true },
    { key: "unlock_request",       label: "Desbloquear Detalhes da Solicitação",      coins: 5,   enabled: true },
    { key: "edit_ad",              label: "Editar Anúncio/Solicitação",               coins: 5,   enabled: true },
    { key: "reply_review",         label: "Responder Avaliação",                      coins: 10,  enabled: true },
    { key: "extra_photo_session",  label: "Sessão de Foto Extra",                     coins: 15,  enabled: true },
    { key: "extra_photo",          label: "Foto Extra na Galeria/Showroom",           coins: 5,   enabled: true },
    { key: "extra_specialty",      label: "Especialidade Extra",                      coins: 10,  enabled: true },
    { key: "extra_video",          label: "Vídeo Extra",                              coins: 10,  enabled: true },
    { key: "cnpj_validation",      label: "Validação de CNPJ",                        coins: 50,  enabled: true },
    { key: "badge_bronze",         label: "Selo de Verificação Bronze",               coins: 30,  enabled: true },
    { key: "badge_silver",         label: "Selo de Verificação Prata",                coins: 50,  enabled: true },
    { key: "badge_gold",           label: "Selo de Verificação Ouro",                 coins: 100, enabled: true },
    { key: "urgent_neighborhood",  label: "Disparar Alerta de Urgência no Bairro",    coins: 15,  enabled: true },
  ],
  coinPacks: [
    { id: "P",      name: "Pacote P",      priceBRL: 25.00,  coins: 250,    bonusLabel: "Base",         enabled: true },
    { id: "M",      name: "Pacote M",      priceBRL: 50.00,  coins: 575,    bonusLabel: "+15% Bônus",   enabled: true },
    { id: "G",      name: "Pacote G",      priceBRL: 89.90,  coins: 1150,   bonusLabel: "+28% Bônus",   highlight: "Mais Popular",         enabled: true },
    { id: "XL",     name: "Pacote XL",     priceBRL: 149.90, coins: 2100,   bonusLabel: "+40% Bônus",   enabled: true },
    { id: "PRO",    name: "Pacote PRO",    priceBRL: 299.90, coins: 4800,   bonusLabel: "+60% Bônus",   enabled: true },
    { id: "MASTER", name: "Pacote MASTER", priceBRL: 599.90, coins: 10500,  bonusLabel: "+75% Bônus",   highlight: "Melhor Custo-Benefício", enabled: true },
  ],
};

const LS_KEY = "fixxer_monetization_v1";
const SETTINGS_KEY = "monetization";

let cache: MonetizationConfig | null = null;
const listeners = new Set<(cfg: MonetizationConfig) => void>();

function mergeWithDefaults(partial: Partial<MonetizationConfig> | null): MonetizationConfig {
  if (!partial) return { ...DEFAULT_MONETIZATION };
  return {
    version: partial.version ?? DEFAULT_MONETIZATION.version,
    updatedAt: partial.updatedAt ?? DEFAULT_MONETIZATION.updatedAt,
    plans: partial.plans?.length ? partial.plans as PlanConfig[] : DEFAULT_MONETIZATION.plans,
    actions: partial.actions?.length ? partial.actions as ActionCost[] : DEFAULT_MONETIZATION.actions,
    coinPacks: partial.coinPacks?.length ? partial.coinPacks as CoinPack[] : DEFAULT_MONETIZATION.coinPacks,
  };
}

function readLocal(): MonetizationConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return raw ? mergeWithDefaults(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeLocal(cfg: MonetizationConfig) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(cfg));
  } catch {
    /* ignore quota */
  }
}

export async function fetchMonetizationConfig(): Promise<MonetizationConfig> {
  // 1. tenta remoto
  try {
    const { data, error } = await supabaseExternal
      .from("system_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();
    if (!error && data?.value) {
      const cfg = mergeWithDefaults(data.value as Partial<MonetizationConfig>);
      cache = cfg;
      writeLocal(cfg);
      return cfg;
    }
  } catch (e) {
    console.warn("[monetization] supabase indisponível, usando local", e);
  }
  // 2. local
  const local = readLocal();
  if (local) {
    cache = local;
    return local;
  }
  // 3. default
  cache = { ...DEFAULT_MONETIZATION };
  return cache;
}

export function getCachedMonetization(): MonetizationConfig {
  if (cache) return cache;
  const local = readLocal();
  cache = local ?? { ...DEFAULT_MONETIZATION };
  return cache;
}

export async function saveMonetizationConfig(next: MonetizationConfig): Promise<{ ok: boolean; remote: boolean; error?: string }> {
  const payload: MonetizationConfig = { ...next, updatedAt: new Date().toISOString() };
  cache = payload;
  writeLocal(payload);
  listeners.forEach((fn) => { try { fn(payload); } catch { /* ignore */ } });

  try {
    const { error } = await supabaseExternal
      .from("system_settings")
      .upsert({ key: SETTINGS_KEY, value: payload, updated_at: payload.updatedAt }, { onConflict: "key" });
    if (error) throw error;
    return { ok: true, remote: true };
  } catch (e: any) {
    return { ok: true, remote: false, error: e?.message ?? String(e) };
  }
}

export function subscribeMonetization(fn: (cfg: MonetizationConfig) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function costOf(key: string): number {
  const cfg = getCachedMonetization();
  return cfg.actions.find((a) => a.key === key)?.coins ?? 0;
}
