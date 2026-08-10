import { useCallback, useEffect, useState } from "react";
import { supabaseExternal } from "@/lib/supabaseExternal";

export type StatOrder = {
  id: string;
  title: string | null;
  status: string | null;
  price: number | null;
  created_at: string | null;
};

export type StatReview = {
  id: string;
  rating: number | null;
  comment: string | null;
  created_at: string | null;
  reviewer_name?: string | null;
};

export type StatTx = {
  id: string;
  amount: number | null;
  reason?: string | null;
  source?: string | null;
  created_at: string | null;
};

export type ProviderStats = {
  loading: boolean;
  userId: string | null;
  activeOrders: StatOrder[];
  doneOrders: StatOrder[];
  reviews: StatReview[];
  ratingAvg: number | null;
  transactions: StatTx[];
  balance: number;
  balanceReservations: number;
  balanceProducts: number;
  balanceServices: number;
  period: string;
  setPeriod: (p: string) => void;
  reload: () => void;
};

const DONE = ["concluido", "concluída", "concluida", "concluído", "completed", "done", "finalizado", "finalizada"];
const CANCELED = ["cancelado", "cancelada", "canceled", "cancelled", "recusado", "rejeitado"];

function isDone(s: string | null) {
  return DONE.includes(String(s ?? "").toLowerCase().trim());
}
function isCanceled(s: string | null) {
  return CANCELED.includes(String(s ?? "").toLowerCase().trim());
}

export function useProviderStats(): ProviderStats {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [orders, setOrders] = useState<StatOrder[]>([]);
  const [reviews, setReviews] = useState<StatReview[]>([]);
  const [transactions, setTransactions] = useState<StatTx[]>([]);
  const [balance, setBalance] = useState(0);
  const [period, setPeriod] = useState("30");
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: sess } = await supabaseExternal.auth.getSession();
        const uid = sess.session?.user?.id ?? null;
        if (cancelled) return;
        setUserId(uid);
        if (!uid) return;

        try {
          const { data } = await supabaseExternal
            .from("service_orders")
            .select("id, title, status, price, created_at")
            .or(`owner_id.eq.${uid},invitee_id.eq.${uid},provider_id.eq.${uid}`)
            .order("created_at", { ascending: false })
            .limit(200);
          if (!cancelled && Array.isArray(data)) setOrders(data as StatOrder[]);
        } catch { /* tabela indisponível */ }

        try {
          const { data } = await supabaseExternal
            .from("reviews")
            .select("*")
            .eq("reviewed_user_id", uid)
            .order("created_at", { ascending: false })
            .limit(200);
          if (!cancelled && Array.isArray(data)) setReviews(data as StatReview[]);
        } catch { /* ignore */ }

        try {
          const { data } = await supabaseExternal
            .from("user_coins")
            .select("balance")
            .eq("user_id", uid)
            .maybeSingle();
          if (!cancelled && data && typeof (data as any).balance === "number") {
            setBalance((data as any).balance as number);
          }
        } catch { /* ignore */ }

        try {
          const { data } = await supabaseExternal
            .from("coin_transactions")
            .select("*")
            .eq("user_id", uid)
            .order("created_at", { ascending: false })
            .limit(100);
          if (!cancelled && Array.isArray(data)) setTransactions(data as StatTx[]);
        } catch { /* ignore */ }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tick]);

  const activeOrders = orders.filter((o) => !isDone(o.status) && !isCanceled(o.status));
  const doneOrders = orders.filter((o) => isDone(o.status));
  const nums = reviews.map((r) => Number(r?.rating)).filter((n) => Number.isFinite(n));
  const ratingAvg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;

  // Mock de saldos categorizados (em moedas, escala 10x p/ visualização)
  const balanceReservations = balance * 0.3;
  const balanceProducts = balance * 0.2;
  const balanceServices = balance * 0.5;

  return {
    loading,
    userId,
    activeOrders,
    doneOrders,
    reviews,
    ratingAvg,
    transactions,
    balance,
    balanceReservations,
    balanceProducts,
    balanceServices,
    period,
    setPeriod,
    reload,
  };
}
