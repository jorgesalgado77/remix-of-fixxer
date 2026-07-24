/**
 * FIXXER · Extrato Paginado de Moedas
 * Rota: /extrato   (dentro do layout _authenticated)
 *
 * Recursos:
 *  - Paginação por cursor (created_at + id) — 25 por página, botão "Carregar mais".
 *  - Filtros por tipo (crédito/débito), source e busca em descrição.
 *  - Realtime: novas transações do usuário logado entram no topo instantaneamente
 *    e o saldo é atualizado sem F5 (canal já mantido em src/lib/coins.ts).
 *  - Colunas de auditoria opcionais: operation, origin, metadata, reference.
 *
 * Persistência: Supabase externo (supabaseExternal), tabela public.coin_transactions.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft, ArrowUpRight, Coins, Filter as FilterIcon,
  Loader2, RefreshCcw, Search, Info,
} from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { subscribeBalance, type CoinTransaction } from "@/lib/coins";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/extrato")({
  head: () => ({
    meta: [
      { title: "Extrato de Moedas · Fixxer" },
      { name: "description", content: "Histórico paginado de créditos e débitos das suas Moedas Fixxer." },
    ],
  }),
  component: ExtratoPage,
});

type Filter = "all" | "credit" | "debit";
const PAGE_SIZE = 25;

interface AuditedTx extends CoinTransaction {
  operation?: string | null;
  origin?: string | null;
  metadata?: Record<string, any> | null;
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function ExtratoPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [txs, setTxs] = useState<AuditedTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => subscribeBalance(setBalance), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabaseExternal.auth.getUser();
      if (!user) { setLoading(false); return; }
      if (cancelled) return;
      setUserId(user.id);
      await loadFirstPage(user.id);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: novas transações aparecem no topo sem recarregar
  useEffect(() => {
    if (!userId) return;
    const onTx = (e: any) => {
      const tx = e?.detail as AuditedTx | undefined;
      if (!tx || tx.user_id !== userId) return;
      setTxs(prev => (prev.find(p => p.id === tx.id) ? prev : [tx, ...prev]));
    };
    window.addEventListener("fixxer:coin-tx", onTx);
    return () => window.removeEventListener("fixxer:coin-tx", onTx);
  }, [userId]);

  const loadFirstPage = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabaseExternal
        .from("coin_transactions")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(PAGE_SIZE);
      if (error) throw error;
      const list = (data ?? []) as AuditedTx[];
      setTxs(list);
      setHasMore(list.length === PAGE_SIZE);
    } catch (e: any) {
      toast.error("Falha ao carregar extrato", { description: e?.message ?? String(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!userId || loadingMore || !hasMore || txs.length === 0) return;
    setLoadingMore(true);
    try {
      const last = txs[txs.length - 1];
      const { data, error } = await supabaseExternal
        .from("coin_transactions")
        .select("*")
        .eq("user_id", userId)
        .lt("created_at", last.created_at)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(PAGE_SIZE);
      if (error) throw error;
      const list = (data ?? []) as AuditedTx[];
      setTxs(prev => [...prev, ...list]);
      setHasMore(list.length === PAGE_SIZE);
    } catch (e: any) {
      toast.error("Falha ao paginar", { description: e?.message ?? String(e) });
    } finally {
      setLoadingMore(false);
    }
  }, [userId, loadingMore, hasMore, txs]);

  const sources = useMemo(() => {
    const s = new Set<string>();
    txs.forEach(t => t.source && s.add(t.source));
    return ["all", ...Array.from(s).sort()];
  }, [txs]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return txs.filter(t => {
      if (filter !== "all" && t.type !== filter) return false;
      if (sourceFilter !== "all" && t.source !== sourceFilter) return false;
      if (query && !(`${t.description} ${t.source} ${t.reference ?? ""}`.toLowerCase().includes(query))) return false;
      return true;
    });
  }, [txs, filter, sourceFilter, q]);

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-black/70 border-b border-white/10 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase">Extrato</h1>
            <p className="text-xs text-white/60">Histórico completo de Moedas Fixxer</p>
          </div>
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 px-4 py-2 rounded-2xl">
            <Coins className="w-5 h-5 text-primary" />
            <div className="text-right">
              <div className="text-[10px] uppercase text-white/60 font-black">Saldo</div>
              <div className="text-xl font-black text-primary tracking-tighter">{balance.toLocaleString("pt-BR")}</div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 pt-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {(["all", "credit", "debit"] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider border transition-all ${
                filter === f
                  ? "bg-primary text-black border-primary"
                  : "bg-white/5 text-white/70 border-white/10 hover:border-white/30"
              }`}
            >
              {f === "all" ? "Tudo" : f === "credit" ? "Créditos" : "Débitos"}
            </button>
          ))}
          <button
            onClick={() => userId && loadFirstPage(userId)}
            className="ml-auto px-3 py-2 rounded-full text-xs font-black uppercase bg-white/5 border border-white/10 hover:border-white/30 flex items-center gap-1"
            title="Recarregar"
          >
            <RefreshCcw className="w-3.5 h-3.5" /> Atualizar
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar por descrição, origem ou referência..."
              className="w-full bg-white/5 border border-white/10 focus:border-primary/50 rounded-xl pl-10 pr-3 py-3 text-sm outline-none"
            />
          </div>
          <div className="relative">
            <FilterIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="bg-white/5 border border-white/10 focus:border-primary/50 rounded-xl pl-10 pr-8 py-3 text-sm outline-none appearance-none"
            >
              {sources.map(s => <option key={s} value={s}>{s === "all" ? "Todas origens" : s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-white/60 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Carregando extrato...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-white/50 border border-dashed border-white/10 rounded-2xl">
            Nenhuma transação encontrada com os filtros atuais.
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map(tx => {
              const isCredit = tx.type === "credit";
              const isOpen = expandedId === tx.id;
              return (
                <li
                  key={tx.id}
                  className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all"
                >
                  <button
                    onClick={() => setExpandedId(isOpen ? null : tx.id)}
                    className="w-full flex items-start gap-3 text-left"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCredit ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                    }`}>
                      {isCredit ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-sm truncate">{tx.description}</div>
                        <div className={`font-black text-sm tracking-tighter whitespace-nowrap ${
                          isCredit ? "text-emerald-400" : "text-rose-400"
                        }`}>
                          {isCredit ? "+" : "−"}{tx.amount.toLocaleString("pt-BR")} <Coins className="inline w-3 h-3" />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-white/50 uppercase tracking-wide">
                        <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">{tx.source}</span>
                        {tx.operation && (
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary/80">
                            {tx.operation}
                          </span>
                        )}
                        {tx.origin && (
                          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                            via {tx.origin}
                          </span>
                        )}
                        <span className="ml-auto">{fmtDate(tx.created_at)}</span>
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="mt-3 pt-3 border-t border-white/5 text-[11px] text-white/60 space-y-1 font-mono">
                      <div><span className="text-white/40">ID:</span> {tx.id}</div>
                      {tx.reference && <div><span className="text-white/40">Referência:</span> {tx.reference}</div>}
                      {tx.metadata && (
                        <div className="mt-2">
                          <div className="flex items-center gap-1 text-white/40 mb-1"><Info className="w-3 h-3" /> Metadados</div>
                          <pre className="bg-black/40 p-2 rounded-lg overflow-x-auto text-[10px]">
{JSON.stringify(tx.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {hasMore && !loading && (
          <div className="flex justify-center mt-6">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="px-6 py-3 rounded-full text-xs font-black uppercase tracking-wider bg-white/5 border border-white/10 hover:border-primary/50 disabled:opacity-50 flex items-center gap-2"
            >
              {loadingMore ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando...</> : "Carregar mais"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
