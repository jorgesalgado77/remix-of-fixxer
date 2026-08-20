/**
 * FIXXER - Serviço de Saldo de Moedas + Extrato
 * ------------------------------------------------------------
 * Persistência: Supabase externo (tabelas `user_coins` + `coin_transactions`).
 * Fallback offline: localStorage.
 * Realtime: canal Postgres Changes escuta INSERT em `coin_transactions`
 * e UPDATE em `user_coins` do usuário logado -> atualiza badge sem F5.
 */
import { supabaseExternal } from "@/lib/supabaseExternal";

export type CoinTxType = "credit" | "debit";
export type CoinTxSource =
  | "purchase_pack"
  | "plan_monthly"
  | "bonus"
  | "refund"
  | "action_consume"
  | "admin_adjust";

export interface CoinTransaction {
  id: string;
  user_id: string;
  type: CoinTxType;
  source: CoinTxSource;
  amount: number;           // positivo (o tipo indica sinal)
  description: string;
  reference?: string | null;
  created_at: string;       // ISO
}

const LS_BAL = (uid: string) => `fixxer_coins_balance_${uid}`;
const LS_TX  = (uid: string) => `fixxer_coins_tx_${uid}`;

const listeners = new Set<(balance: number) => void>();
let currentBalance = 0;
let currentUserId: string | null = null;
let realtimeChannel: any = null;

function readLocalBalance(uid: string): number {
  try {
    const raw = localStorage.getItem(LS_BAL(uid));
    return raw ? Number(raw) || 0 : 0;
  } catch { return 0; }
}
function writeLocalBalance(uid: string, v: number) {
  try { localStorage.setItem(LS_BAL(uid), String(v)); } catch {/* ignore */}
}
function readLocalTx(uid: string): CoinTransaction[] {
  try {
    const raw = localStorage.getItem(LS_TX(uid));
    return raw ? (JSON.parse(raw) as CoinTransaction[]) : [];
  } catch { return []; }
}
function writeLocalTx(uid: string, list: CoinTransaction[]) {
  try { localStorage.setItem(LS_TX(uid), JSON.stringify(list.slice(0, 200))); } catch {/* ignore */}
}

function notify(v: number) {
  currentBalance = v;
  listeners.forEach((fn) => { try { fn(v); } catch {/* ignore */} });
}

export function getCachedBalance(): number { return currentBalance; }

/**
 * Ajusta o saldo em cache local (otimista) sem persistir no backend.
 * Útil para refletir imediatamente uma operação e permitir rollback via
 * chamada com delta invertido caso a operação remota falhe.
 * Retorna o novo saldo.
 */
export function adjustCachedBalance(delta: number, userId?: string): number {
  const next = Math.max(0, currentBalance + delta);
  const uid = userId ?? currentUserId;
  if (uid) writeLocalBalance(uid, next);
  notify(next);
  return next;
}

export function subscribeBalance(fn: (v: number) => void): () => void {
  listeners.add(fn);
  fn(currentBalance);
  return () => { listeners.delete(fn); };
}

export async function initCoinsForUser(userId: string): Promise<number> {
  currentUserId = userId;
  
  // fallback local imediato
  const local = readLocalBalance(userId);
  notify(local);
  
  // Em bypass, se o local for 0, tentamos um refresh imediato
  const isBypass = typeof window !== 'undefined' && localStorage.getItem('fixxer:master-bypass') === 'true';

  // busca remoto
  try {
    // Tenta primeiro a tabela coin_balances (moderna)
    let { data, error } = await supabaseExternal
      .from("coin_balances")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    // Se falhar ou não encontrar, tenta user_coins (legado)
    if (error || !data) {
      console.log(`[coins] coin_balances falhou ou vazio para ${userId}, tentando user_coins...`);
      const { data: legacyData, error: legacyError } = await supabaseExternal
        .from("user_coins")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();
      
      data = legacyData;
      error = legacyError;
    }

    if (error) throw error;

    if (data && typeof data.balance === "number") {
      writeLocalBalance(userId, data.balance);
      notify(data.balance);
    } else {
      console.log(`[coins] Usuário ${userId} sem registro de saldo. Tentando registrar...`);
      // A RPC credit_coins_safe com valor 0 pode ser usada para garantir a existência da linha
      try {
        await supabaseExternal.rpc("credit_coins_safe", {
          _user_id: userId,
          _amount: 0,
          _source: "bonus",
          _description: "Inicialização de conta",
          _idempotency_key: `init_${userId}`
        });
      } catch (rpcErr) {
        console.warn("[coins] Falha ao auto-inicializar linha de moedas:", rpcErr);
      }
    }
  } catch (e) {
    console.warn("[coins] supabase indisponível ou erro de permissão", e);
  }

  // realtime
  try {
    if (realtimeChannel) {
      try { supabaseExternal.removeChannel(realtimeChannel); } catch {/* ignore */}
    }
    realtimeChannel = supabaseExternal
      .channel(`coins:${userId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "coin_balances", filter: `user_id=eq.${userId}` },
        (payload: any) => {
          const b = payload?.new?.balance;
          if (typeof b === "number") { writeLocalBalance(userId, b); notify(b); }
        })
      .on("postgres_changes",
        { event: "*", schema: "public", table: "user_coins", filter: `user_id=eq.${userId}` },
        (payload: any) => {
          const b = payload?.new?.balance;
          if (typeof b === "number") { writeLocalBalance(userId, b); notify(b); }
        })
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "coin_transactions", filter: `user_id=eq.${userId}` },
        (payload: any) => {
          const tx = payload?.new as CoinTransaction | undefined;
          if (!tx) return;
          const list = readLocalTx(userId);
          writeLocalTx(userId, [tx, ...list]);
          window.dispatchEvent(new CustomEvent("fixxer:coin-tx", { detail: tx }));
        })
      .subscribe();
  } catch (e) {
    console.warn("[coins] realtime falhou", e);
  }

  return currentBalance;
}

export async function fetchTransactions(userId: string, limit = 100): Promise<CoinTransaction[]> {
  try {
    const { data, error } = await supabaseExternal
      .from("coin_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (!error && Array.isArray(data)) {
      writeLocalTx(userId, data as CoinTransaction[]);
      return data as CoinTransaction[];
    }
  } catch (e) { console.warn("[coins] tx fetch falhou", e); }
  return readLocalTx(userId);
}

/** Chaves de idempotência já consumidas nesta sessão (evita cliques duplos). */
const usedIdemKeys = new Set<string>();

/** Consome moedas do usuário localmente + no remoto (best effort). */
export interface CoinOpOptions {
  reference?: string;
  idempotencyKey?: string;
  operation?: string;              // ex.: "publish_ad", "reply_review", "extra_photo"
  origin?: "client" | "admin" | "system" | "webhook";
  metadata?: Record<string, any>;  // trilha de auditoria
}

export async function consumeCoins(
  userId: string,
  amount: number,
  description: string,
  source: CoinTxSource = "action_consume",
  refOrOpts?: string | CoinOpOptions,
  idempotencyKey?: string,
): Promise<{ ok: boolean; balance: number; duplicated?: boolean; error?: string }> {
  if (amount <= 0) return { ok: true, balance: currentBalance };

  const opts: CoinOpOptions = typeof refOrOpts === "string"
    ? { reference: refOrOpts, idempotencyKey }
    : (refOrOpts ?? { idempotencyKey });
  const idem = opts.idempotencyKey ?? idempotencyKey;

  if (idem && usedIdemKeys.has(idem)) {
    return { ok: true, balance: currentBalance, duplicated: true };
  }
  if (idem) usedIdemKeys.add(idem);

  const next = Math.max(0, currentBalance - amount);
  writeLocalBalance(userId, next);
  notify(next);
  const tx: CoinTransaction = {
    id: `local_${Date.now()}`,
    user_id: userId,
    type: "debit", source, amount, description,
    reference: opts.reference ?? null,
    created_at: new Date().toISOString(),
  };
  writeLocalTx(userId, [tx, ...readLocalTx(userId)]);
  window.dispatchEvent(new CustomEvent("fixxer:coin-tx", { detail: tx }));

  try {
    const { data, error } = await supabaseExternal.rpc("consume_coins_safe", {
      _user_id: userId,
      _amount: amount,
      _source: source,
      _description: description,
      _idempotency_key: idem ?? null,
      _reference_id: opts.reference ?? null,
    });
    if (error) throw error;
    if (data && data[0] && !data[0].success) {
      return { ok: false, balance: data[0].new_balance, error: data[0].error_msg };
    }
    const finalBalance = data && data[0] ? data[0].new_balance : next;
    return { ok: true, balance: finalBalance };
  } catch (e: any) {
    return { ok: true, balance: next, error: e?.message ?? String(e) };
  }
}

/** Credita moedas (compra de pacote, franquia mensal, bônus). */
export async function creditCoins(
  userId: string,
  amount: number,
  description: string,
  source: CoinTxSource = "purchase_pack",
  refOrOpts?: string | CoinOpOptions,
  idempotencyKey?: string,
): Promise<{ ok: boolean; balance: number; duplicated?: boolean; error?: string }> {
  if (amount <= 0) return { ok: true, balance: currentBalance };

  const opts: CoinOpOptions = typeof refOrOpts === "string"
    ? { reference: refOrOpts, idempotencyKey }
    : (refOrOpts ?? { idempotencyKey });
  const idem = opts.idempotencyKey ?? idempotencyKey;

  if (idem && usedIdemKeys.has(idem)) {
    return { ok: true, balance: currentBalance, duplicated: true };
  }
  if (idem) usedIdemKeys.add(idem);

  const next = currentBalance + amount;
  writeLocalBalance(userId, next);
  notify(next);
  const tx: CoinTransaction = {
    id: `local_${Date.now()}`,
    user_id: userId,
    type: "credit", source, amount, description,
    reference: opts.reference ?? null,
    created_at: new Date().toISOString(),
  };
  writeLocalTx(userId, [tx, ...readLocalTx(userId)]);
  window.dispatchEvent(new CustomEvent("fixxer:coin-tx", { detail: tx }));

  try {
    const { data, error } = await supabaseExternal.rpc("credit_coins_safe", {
      _user_id: userId,
      _amount: amount,
      _source: source,
      _description: description,
      _idempotency_key: idem ?? null,
      _reference_id: opts.reference ?? null,
    });
    if (error) throw error;
    const finalBalance = data && data[0] ? data[0].new_balance : next;
    return { ok: true, balance: finalBalance };
  } catch (e: any) {
    return { ok: true, balance: next, error: e?.message ?? String(e) };
  }
}

export function getCurrentUserId(): string | null { return currentUserId; }
