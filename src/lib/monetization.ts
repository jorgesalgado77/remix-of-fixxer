/**
 * FIXXER - Serviço de Monetização Dinâmica
 * ------------------------------------------------------------
 * Fonte de verdade: tabela `system_settings` (key='monetization', value=jsonb)
 * Fallback offline: localStorage (chave `fixxer_monetization_v1`).
 * Realtime: Postgres Changes na row key='monetization' -> notifica listeners.
 * Audit: tabela `monetization_audit` guarda snapshots + diff a cada save.
 *
 * Todas as telas de cobrança/planos/pacotes DEVEM consumir
 * `fetchMonetizationConfig()` ou `useMonetization()` — nunca hardcode preços.
 */
import { supabaseExternal } from "@/lib/supabaseExternal";

export type PlanId = "free" | "basico" | "pro" | "premium";

export interface PlanConfig {
  id: PlanId;
  name: string;
  enabled: boolean;
  priceMonthlyBRL: number;
  priceYearlyBRL: number;
  coinsMonthly: number;
  freeAdsMonthly: number;
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
  bonusLabel: string;
  highlight?: string;
  enabled: boolean;
}

export interface MonetizationConfig {
  version: number;
  updatedAt: string;
  plans: PlanConfig[];
  actions: ActionCost[];
  coinPacks: CoinPack[];
}

export interface MonetizationAuditEntry {
  id: string;
  changed_by: string | null;
  changed_by_email: string | null;
  created_at: string;
  summary: string;
  diff: Array<{ path: string; before: unknown; after: unknown }>;
  snapshot: MonetizationConfig;
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
const AUDIT_TABLE = "monetization_audit";

let cache: MonetizationConfig | null = null;
const listeners = new Set<(cfg: MonetizationConfig) => void>();
let realtimeChannel: any = null;

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
  } catch { return null; }
}

function writeLocal(cfg: MonetizationConfig) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(LS_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
}

function notify(cfg: MonetizationConfig) {
  cache = cfg;
  listeners.forEach((fn) => { try { fn(cfg); } catch { /* ignore */ } });
}

export async function fetchMonetizationConfig(): Promise<MonetizationConfig> {
  try {
    const { data, error } = await supabaseExternal
      .from("system_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();
    if (!error && data?.value) {
      const cfg = mergeWithDefaults(data.value as Partial<MonetizationConfig>);
      writeLocal(cfg);
      notify(cfg);
      ensureRealtime();
      return cfg;
    }
  } catch (e) {
    console.warn("[monetization] supabase indisponível, usando local", e);
  }
  const local = readLocal();
  const cfg = local ?? { ...DEFAULT_MONETIZATION };
  notify(cfg);
  ensureRealtime();
  return cfg;
}

function ensureRealtime() {
  if (typeof window === "undefined" || realtimeChannel) return;
  try {
    realtimeChannel = supabaseExternal
      .channel("monetization:settings")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "system_settings", filter: `key=eq.${SETTINGS_KEY}` },
        (payload: any) => {
          const v = payload?.new?.value;
          if (v) {
            const cfg = mergeWithDefaults(v as Partial<MonetizationConfig>);
            writeLocal(cfg);
            notify(cfg);
          }
        })
      .subscribe();
  } catch (e) {
    console.warn("[monetization] realtime falhou", e);
  }
}

export function getCachedMonetization(): MonetizationConfig {
  if (cache) return cache;
  const local = readLocal();
  cache = local ?? { ...DEFAULT_MONETIZATION };
  return cache;
}

export function subscribeMonetization(fn: (cfg: MonetizationConfig) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/* ------------------------- Diff + Audit ------------------------- */

function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  const keys = Object.keys(v as any).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify((v as any)[k])).join(",") + "}";
}

export function diffMonetization(prev: MonetizationConfig, next: MonetizationConfig): Array<{ path: string; before: unknown; after: unknown }> {
  const changes: Array<{ path: string; before: unknown; after: unknown }> = [];
  const cmpList = <T extends { [k: string]: any }>(name: string, idKey: keyof T, before: T[], after: T[]) => {
    const bMap = new Map(before.map((x) => [String(x[idKey]), x]));
    const aMap = new Map(after.map((x) => [String(x[idKey]), x]));
    const ids = new Set([...bMap.keys(), ...aMap.keys()]);
    ids.forEach((id) => {
      const b = bMap.get(id); const a = aMap.get(id);
      if (!b && a) { changes.push({ path: `${name}.${id}`, before: null, after: a }); return; }
      if (b && !a) { changes.push({ path: `${name}.${id}`, before: b, after: null }); return; }
      if (b && a) {
        Object.keys(a).forEach((k) => {
          if (stableStringify((b as any)[k]) !== stableStringify((a as any)[k])) {
            changes.push({ path: `${name}.${id}.${k}`, before: (b as any)[k], after: (a as any)[k] });
          }
        });
      }
    });
  };
  cmpList<PlanConfig>("plans", "id", prev.plans, next.plans);
  cmpList<ActionCost>("actions", "key", prev.actions, next.actions);
  cmpList<CoinPack>("coinPacks", "id", prev.coinPacks, next.coinPacks);
  return changes;
}

async function currentActor(): Promise<{ id: string | null; email: string | null }> {
  try {
    const { data } = await supabaseExternal.auth.getUser();
    return { id: data?.user?.id ?? null, email: data?.user?.email ?? null };
  } catch { return { id: null, email: null }; }
}

export async function saveMonetizationConfig(next: MonetizationConfig): Promise<{ ok: boolean; remote: boolean; auditId?: string; error?: string }> {
  const prev = getCachedMonetization();
  const payload: MonetizationConfig = { ...next, updatedAt: new Date().toISOString() };
  writeLocal(payload);
  notify(payload);

  const diff = diffMonetization(prev, payload);
  const summary = diff.length === 0 ? "Sem alterações" : summarizeDiff(diff);

  let remote = false;
  let error: string | undefined;
  let auditId: string | undefined;

  try {
    const { error: upErr } = await supabaseExternal
      .from("system_settings")
      .upsert({ key: SETTINGS_KEY, value: payload, updated_at: payload.updatedAt }, { onConflict: "key" });
    if (upErr) throw upErr;
    remote = true;

    if (diff.length > 0) {
      const actor = await currentActor();
      const { data: audit, error: aErr } = await supabaseExternal
        .from(AUDIT_TABLE)
        .insert({
          changed_by: actor.id,
          changed_by_email: actor.email,
          summary,
          diff,
          snapshot: payload,
        })
        .select("id")
        .single();
      if (!aErr && audit?.id) auditId = audit.id as string;
    }
  } catch (e: any) {
    error = e?.message ?? String(e);
  }
  return { ok: true, remote, auditId, error };
}

export function summarizeDiff(diff: Array<{ path: string; before: unknown; after: unknown }>): string {
  if (diff.length === 0) return "Sem alterações";
  const groups = new Map<string, number>();
  diff.forEach((d) => {
    const g = d.path.split(".")[0];
    groups.set(g, (groups.get(g) ?? 0) + 1);
  });
  return Array.from(groups.entries()).map(([g, n]) => `${g} (${n})`).join(" • ");
}

export async function fetchMonetizationHistory(limit = 50): Promise<MonetizationAuditEntry[]> {
  try {
    const { data, error } = await supabaseExternal
      .from(AUDIT_TABLE)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as MonetizationAuditEntry[];
  } catch (e) {
    console.warn("[monetization] audit fetch falhou", e);
    return [];
  }
}

export async function restoreMonetizationSnapshot(entry: MonetizationAuditEntry): Promise<{ ok: boolean; remote: boolean; error?: string }> {
  const snap = mergeWithDefaults(entry.snapshot as Partial<MonetizationConfig>);
  const res = await saveMonetizationConfig(snap);
  return { ok: res.ok, remote: res.remote, error: res.error };
}

/* ------------------------- Import / Export ------------------------- */

export function exportMonetizationJSON(cfg: MonetizationConfig): string {
  return JSON.stringify(cfg, null, 2);
}

export function parseMonetizationJSON(raw: string): MonetizationConfig {
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") throw new Error("JSON inválido");
  const cfg = mergeWithDefaults(parsed as Partial<MonetizationConfig>);
  if (!Array.isArray(cfg.plans) || !Array.isArray(cfg.actions) || !Array.isArray(cfg.coinPacks)) {
    throw new Error("Estrutura de configuração incompleta");
  }
  return cfg;
}

/* ------------------------- Helpers de consumo ------------------------- */

export function costOf(key: string): number {
  return getCachedMonetization().actions.find((a) => a.key === key)?.coins ?? 0;
}

export function isActionEnabled(key: string): boolean {
  const a = getCachedMonetization().actions.find((x) => x.key === key);
  return a ? a.enabled : false;
}

export function getActionCost(key: string): ActionCost | null {
  return getCachedMonetization().actions.find((a) => a.key === key) ?? null;
}

export function getPlanConfig(id: PlanId): PlanConfig | null {
  return getCachedMonetization().plans.find((p) => p.id === id) ?? null;
}

export function getCoinPack(id: string): CoinPack | null {
  return getCachedMonetization().coinPacks.find((p) => p.id === id) ?? null;
}

/** Verifica se uma ação está habilitada e se há saldo suficiente antes de consumir.
 *  Bloqueio automático: se a ação está desabilitada no /admin/monetizacao,
 *  retorna { ok:false, reason:'disabled' } e nenhuma moeda é debitada. */
export async function spendCoinsForAction(
  userId: string,
  actionKey: string,
  reference?: string,
): Promise<{ ok: boolean; reason?: "disabled" | "insufficient" | "error"; cost?: number; error?: string }> {
  const action = getActionCost(actionKey);
  if (!action) return { ok: false, reason: "disabled" };
  if (!action.enabled) return { ok: false, reason: "disabled", cost: action.coins };
  const { consumeCoins, getCachedBalance } = await import("@/lib/coins");
  if (getCachedBalance() < action.coins) return { ok: false, reason: "insufficient", cost: action.coins };
  const res = await consumeCoins(userId, action.coins, action.label, "action_consume", reference);
  if (res.error) return { ok: false, reason: "error", cost: action.coins, error: res.error };
  return { ok: true, cost: action.coins };
}
