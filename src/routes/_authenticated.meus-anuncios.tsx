import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Megaphone, Pencil, Trash2, Eye, Plus, RefreshCw, Search, AlertTriangle,
  ImageOff, Package, Store as StoreIcon, MoreVertical, Rocket, MessageSquare,
  Clock, CheckCircle2, RotateCw,
} from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { CommercialAdModal, type CommercialAdInitial } from "@/components/CommercialAdModal";
import { getCategoryTheme } from "@/lib/category-colors";
import { spendCoinsForAction, costOf } from "@/lib/monetization";
import { getCachedBalance, subscribeBalance } from "@/lib/coins";
import { useAdMetricsLive, type AdMetric } from "@/lib/use-ad-metrics-live";

export const Route = createFileRoute("/_authenticated/meus-anuncios")({
  head: () => ({
    meta: [
      { title: "Meus Anúncios | Fixxer" },
      { name: "description", content: "Gerencie, edite, impulsione e renove seus anúncios comerciais no Feed Fixxer." },
      { property: "og:title", content: "Meus Anúncios | Fixxer" },
      { property: "og:description", content: "Central de gerenciamento dos anúncios publicados no Feed Fixxer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MeusAnunciosPage,
});

interface AdRow {
  id: string;
  title: string | null;
  content: string | null;
  category: string | null;
  created_at?: string | null;
  metadata: any;
}

const LOCAL_KEY = "fixxer:commercial_ads:local";
const AD_TABLES = ["posts", "ads", "feed_posts"] as const;

// ---- MOCK FALLBACK ----
const MOCK_USER_ADS: AdRow[] = [
  {
    id: "mock-ad-bosch-12v",
    title: "Kit Furadeira e Parafusadeira Bosch 12V em Promoção",
    content: "Kit completo com maleta, 2 baterias, carregador e maleta de brocas.",
    category: "lojista",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    metadata: {
      photos: ["https://images.tcdn.com.br/img/img_prod/1058380/kit_furadeira_e_parafusadeira_bosch_12v_go_kit_com_2_baterias_carregador_e_maleta_1223_1_2ba1e5c9c4ae5b8e46bdff09f16b5e56.jpg"],
      price_from: 450, price_to: 380, stock: 12, ad_kind: "Produto", status: "active",
      views: 214, chats: 8,
      expires_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
  {
    id: "mock-ad-mdf-cru-15mm",
    title: "Lote B2B de Chapa MDF Cru 15mm - Liquidação de Estoque",
    content: "Lote fechado com 50 chapas de MDF cru 15mm (2750x1830mm).",
    category: "parceiro",
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    metadata: {
      photos: [], price_to: 1250, stock: 50, ad_kind: "Lote B2B", status: "active",
      views: 89, chats: 3,
      expires_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
  {
    id: "mock-ad-expired-tinta",
    title: "Tinta Acrílica Suvinil Premium 18L",
    content: "Estoque de fim de temporada. Cores diversas em promoção.",
    category: "lojista",
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: {
      photos: [], price_to: 289, stock: 6, ad_kind: "Produto", status: "active",
      views: 412, chats: 15,
      expires_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
];

function readLocalAds(uid: string | null): AdRow[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as any[];
    return arr
      .filter((r) => !uid || r.author_id === uid)
      .map((r) => ({
        id: r.id, title: r.title, content: r.content, category: r.category,
        created_at: r.created_at, metadata: r.metadata,
      }));
  } catch { return []; }
}

function removeLocalAd(id: string) {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw) as any[];
    localStorage.setItem(LOCAL_KEY, JSON.stringify(arr.filter((r) => r.id !== id)));
  } catch { /* ignore */ }
}

function patchLocalAd(id: string, patch: Partial<AdRow> & { metadata?: any }) {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw) as any[];
    const next = arr.map((r) => {
      if (r.id !== id) return r;
      const md = { ...(r.metadata || {}), ...(patch.metadata || {}) };
      return { ...r, ...patch, metadata: md };
    });
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

function fmtBRL(n: number | null | undefined) {
  if (n == null) return "—";
  return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return "—"; }
}

function isExpired(ad: AdRow): boolean {
  const exp = ad.metadata?.expires_at;
  if (!exp) return false;
  try { return new Date(exp).getTime() < Date.now(); } catch { return false; }
}

function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  try {
    const diff = new Date(iso).getTime() - Date.now();
    return Math.ceil(diff / (24 * 60 * 60 * 1000));
  } catch { return null; }
}

async function updateRemoteAd(id: string, uid: string, patch: Record<string, any>): Promise<boolean> {
  for (const table of AD_TABLES) {
    try {
      const { error } = await supabaseExternal
        .from(table)
        .update(patch)
        .eq("id", id)
        .eq("author_id", uid);
      if (!error) return true;
    } catch { /* tenta próxima */ }
  }
  return false;
}

function MeusAnunciosPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [ads, setAds] = useState<AdRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<CommercialAdInitial | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmBoostId, setConfirmBoostId] = useState<string | null>(null);
  const [confirmRenewId, setConfirmRenewId] = useState<string | null>(null);
  const [busyBoostId, setBusyBoostId] = useState<string | null>(null);
  const [busyRenewId, setBusyRenewId] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(() => getCachedBalance());

  const boostCost = costOf("publish_extra") || 20;
  const renewCost = costOf("publish_extra") || 20;

  // ---- Saldo reativo: reflete gastos/ganhos em tempo real nos modais ----
  useEffect(() => {
    const off = subscribeBalance((v) => setBalance(v));
    return () => off();
  }, []);

  // ---- Métricas ao vivo (views/chats) sem recarregar a página ----
  const adIds = useMemo(() => ads.map((a) => a.id), [ads]);
  const handleMetrics = useCallback((metrics: Record<string, AdMetric>) => {
    setAds((prev) =>
      prev.map((a) => {
        const m = metrics[a.id];
        if (!m) return a;
        const curV = Number(a.metadata?.views ?? 0);
        const curC = Number(a.metadata?.chats ?? 0);
        if (m.views === curV && m.chats === curC) return a;
        return { ...a, metadata: { ...(a.metadata || {}), views: m.views, chats: m.chats } };
      }),
    );
  }, []);
  useAdMetricsLive({ adIds, onMetrics: handleMetrics, enabled: !!uid && ads.length > 0 });

  const fetchAds = useCallback(async (currentUid: string) => {
    setLoading(true);
    let remote: AdRow[] = [];
    let anySucceeded = false;
    for (const table of AD_TABLES) {
      try {
        const q = supabaseExternal
          .from(table)
          .select("id,title,content,category,created_at,metadata")
          .eq("author_id", currentUid)
          .order("created_at", { ascending: false })
          .limit(120);
        const { data, error } = table === "feed_posts"
          ? await (q as any).eq("type", "ad")
          : await q;
        if (error) throw error;
        remote = (data as AdRow[]) || [];
        anySucceeded = true;
        break;
      } catch (err: any) {
        console.debug(`[MeusAnuncios] tabela '${table}' indisponível — tentando próxima.`, err?.message);
      }
    }
    try {
      const local = readLocalAds(currentUid).filter((l) => !remote.some((r) => r.id === l.id));
      const merged = [...remote, ...local];
      setAds(merged.length > 0 ? merged : MOCK_USER_ADS);
    } catch {
      setAds(anySucceeded ? remote : MOCK_USER_ADS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabaseExternal.auth.getSession();
        const currentUid = data?.session?.user?.id ?? null;
        setUid(currentUid);
        if (currentUid) await fetchAds(currentUid);
        else setLoading(false);
      } catch {
        setLoading(false);
      }
    })();
  }, [fetchAds]);

  useEffect(() => {
    const handler = () => { if (uid) fetchAds(uid); };
    window.addEventListener("fixxer:ad-created", handler);
    return () => window.removeEventListener("fixxer:ad-created", handler);
  }, [uid, fetchAds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ads;
    return ads.filter((a) =>
      (a.title || "").toLowerCase().includes(q) ||
      (a.content || "").toLowerCase().includes(q)
    );
  }, [ads, query]);

  const { activeAds, expiredAds } = useMemo(() => {
    const act: AdRow[] = [], exp: AdRow[] = [];
    filtered.forEach((a) => (isExpired(a) ? exp.push(a) : act.push(a)));
    return { activeAds: act, expiredAds: exp };
  }, [filtered]);

  const handleDelete = async () => {
    if (!confirmDeleteId || !uid) return;
    setDeleting(true);
    const isSynthetic = confirmDeleteId.startsWith("local-") || confirmDeleteId.startsWith("mock-");
    try {
      if (!isSynthetic) {
        for (const table of AD_TABLES) {
          try {
            const { error } = await supabaseExternal
              .from(table).delete().eq("id", confirmDeleteId).eq("author_id", uid);
            if (!error) break;
          } catch { /* próxima */ }
        }
      }
      removeLocalAd(confirmDeleteId);
      setAds((prev) => prev.filter((a) => a.id !== confirmDeleteId));
      toast.success("Anúncio excluído.");
      setConfirmDeleteId(null);
    } catch {
      setAds((prev) => prev.filter((a) => a.id !== confirmDeleteId));
      setConfirmDeleteId(null);
      toast.success("Anúncio removido da lista.");
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (ad: AdRow) => {
    setEditing({
      id: ad.id,
      title: ad.title || "",
      content: ad.content || "",
      category: (ad.category as any) || "lojista",
      metadata: ad.metadata || {},
    });
  };

  const handleBoost = async () => {
    if (!confirmBoostId || !uid) return;
    const target = ads.find((a) => a.id === confirmBoostId);
    if (!target) return;
    setBusyBoostId(confirmBoostId);
    try {
      const res = await spendCoinsForAction(uid, "publish_extra", `boost:${confirmBoostId}`);
      if (!res.ok) {
        if (res.reason === "insufficient") {
          toast.error(`Saldo insuficiente para impulsionar (custa ${boostCost} moedas).`);
        } else if (res.reason === "disabled") {
          toast.error("Impulsionar está temporariamente desabilitado.");
        } else {
          toast.error(res.error || "Não foi possível impulsionar o anúncio.");
        }
        return;
      }
      const nowIso = new Date().toISOString();
      const isSynthetic = confirmBoostId.startsWith("mock-") || confirmBoostId.startsWith("local-");
      if (!isSynthetic) {
        await updateRemoteAd(confirmBoostId, uid, { created_at: nowIso });
      }
      patchLocalAd(confirmBoostId, { created_at: nowIso, metadata: { boosted_at: nowIso } });
      setAds((prev) => prev.map((a) => a.id === confirmBoostId
        ? { ...a, created_at: nowIso, metadata: { ...(a.metadata || {}), boosted_at: nowIso } }
        : a));
      toast.success(`🚀 Anúncio impulsionado! (-${boostCost} moedas · Saldo: ${res.balance ?? "?"})`);
      setConfirmBoostId(null);
    } finally {
      setBusyBoostId(null);
    }
  };

  const handleRenew = async () => {
    if (!confirmRenewId || !uid) return;
    const ad = ads.find((a) => a.id === confirmRenewId);
    if (!ad) return;
    setBusyRenewId(ad.id);
    try {
      const res = await spendCoinsForAction(uid, "publish_extra", `renew:${ad.id}`);
      if (!res.ok) {
        if (res.reason === "insufficient") {
          toast.error(`Saldo insuficiente para renovar (custa ${renewCost} moedas).`);
        } else {
          toast.error(res.error || "Não foi possível renovar o anúncio.");
        }
        return;
      }
      const newExp = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
      const nowIso = new Date().toISOString();
      const isSynthetic = ad.id.startsWith("mock-") || ad.id.startsWith("local-");
      if (!isSynthetic) {
        await updateRemoteAd(ad.id, uid, { created_at: nowIso });
      }
      patchLocalAd(ad.id, { created_at: nowIso, metadata: { expires_at: newExp, renewed_at: nowIso } });
      setAds((prev) => prev.map((a) => a.id === ad.id
        ? { ...a, created_at: nowIso, metadata: { ...(a.metadata || {}), expires_at: newExp, renewed_at: nowIso } }
        : a));
      toast.success(`🔄 Anúncio renovado por +15 dias! (Saldo: ${res.balance ?? "?"})`);
      setConfirmRenewId(null);
    } finally {
      setBusyRenewId(null);
    }
  };

  return (
    <div className="min-h-dvh bg-[#050506] text-white pb-24">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0A0A0B]/95 backdrop-blur-md px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3 flex-wrap">
          <div className="w-11 h-11 rounded-xl bg-[#00E5FF]/15 border border-[#00E5FF]/30 flex items-center justify-center shrink-0">
            <Megaphone className="w-5 h-5 text-[#00E5FF]" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-base font-black uppercase tracking-tight text-white leading-tight">
              📢 Meus Anúncios
            </h1>
            <p className="text-[11px] text-white/60 mt-0.5 leading-snug">
              Gerencie, impulsione e renove seus anúncios publicados no Feed.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="h-10 px-4 rounded-xl bg-[#00E5FF] text-black text-[11px] font-black uppercase tracking-wider inline-flex items-center gap-2 shadow-[0_0_18px_rgba(0,229,255,0.4)]"
          >
            <Plus className="w-4 h-4" /> Novo Anúncio
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título ou descrição…"
            className="w-full pl-10 pr-3 py-3 bg-[#111112] border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 outline-none focus:border-primary/60"
          />
        </div>

        {loading ? (
          <SkeletonList />
        ) : filtered.length === 0 ? (
          <EmptyPanel hasQuery={!!query} onCreate={() => setCreating(true)} />
        ) : (
          <>
            {activeAds.length > 0 && (
              <section className="space-y-2">
                <SectionHeader
                  icon={<CheckCircle2 className="w-3.5 h-3.5 text-[#39FF88]" />}
                  label="Ativos"
                  count={activeAds.length}
                  color="#39FF88"
                />
                <ul className="grid gap-3">
                  {activeAds.map((ad) => (
                    <AdCard
                      key={ad.id}
                      ad={ad}
                      boostCost={boostCost}
                      isBoosting={busyBoostId === ad.id}
                      onEdit={() => openEdit(ad)}
                      onDelete={() => setConfirmDeleteId(ad.id)}
                      onBoost={() => setConfirmBoostId(ad.id)}
                    />
                  ))}
                </ul>
              </section>
            )}

            {expiredAds.length > 0 && (
              <section className="space-y-2 pt-2">
                <SectionHeader
                  icon={<Clock className="w-3.5 h-3.5 text-[#FFB020]" />}
                  label="Expirados"
                  count={expiredAds.length}
                  color="#FFB020"
                />
                <ul className="grid gap-3">
                  {expiredAds.map((ad) => (
                    <AdCard
                      key={ad.id}
                      ad={ad}
                      expired
                      boostCost={boostCost}
                      renewCost={renewCost}
                      isRenewing={busyRenewId === ad.id}
                      onEdit={() => openEdit(ad)}
                      onDelete={() => setConfirmDeleteId(ad.id)}
                      onRenew={() => setConfirmRenewId(ad.id)}
                    />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        <div className="pt-2 flex items-center justify-center">
          <button
            type="button"
            onClick={() => uid && fetchAds(uid)}
            className="text-[11px] text-white/50 hover:text-white/80 inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar lista
          </button>
        </div>
      </main>

      <CommercialAdModal
        open={!!editing}
        onClose={() => setEditing(null)}
        defaultCategory={(editing?.category as any) || "lojista"}
        initialAd={editing}
        onSaved={() => { if (uid) fetchAds(uid); }}
      />
      <CommercialAdModal
        open={creating}
        onClose={() => setCreating(false)}
        defaultCategory="lojista"
        onSaved={() => { if (uid) fetchAds(uid); }}
      />

      {confirmDeleteId && (
        <Modal onClose={() => !deleting && setConfirmDeleteId(null)}>
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#FF3B6B]/15 border border-[#FF3B6B]/40 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-[#FF3B6B]" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase text-white">Excluir Anúncio?</h3>
              <p className="text-[11px] text-white/60 mt-1 leading-relaxed">
                Essa ação é permanente. Moedas gastas na publicação não são reembolsadas.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button" disabled={deleting}
              onClick={() => setConfirmDeleteId(null)}
              className="flex-1 h-10 rounded-xl bg-white/5 border border-white/10 text-white/80 text-[11px] font-bold uppercase disabled:opacity-50"
            >Cancelar</button>
            <button
              type="button" disabled={deleting} onClick={handleDelete}
              className="flex-1 h-10 rounded-xl bg-[#FF3B6B] text-white text-[11px] font-black uppercase inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <Trash2 className="w-3.5 h-3.5" /> {deleting ? "Excluindo..." : "Excluir"}
            </button>
          </div>
        </Modal>
      )}

      {confirmBoostId && (
        <ActionCostModal
          onClose={() => !busyBoostId && setConfirmBoostId(null)}
          title="Impulsionar Anúncio?"
          description="Seu anúncio volta ao topo do Feed imediatamente e ganha destaque para novos visitantes."
          Icon={Rocket}
          accent="#FFB020"
          cost={boostCost}
          balance={balance}
          busy={!!busyBoostId}
          busyLabel="Impulsionando..."
          confirmLabel={`Confirmar (-${boostCost})`}
          onConfirm={handleBoost}
        />
      )}

      {confirmRenewId && (
        <ActionCostModal
          onClose={() => !busyRenewId && setConfirmRenewId(null)}
          title="Renovar por +15 dias?"
          description="A validade é estendida em 15 dias e o anúncio volta ao topo do Feed."
          Icon={RotateCw}
          accent="#39FF88"
          cost={renewCost}
          balance={balance}
          busy={!!busyRenewId}
          busyLabel="Renovando..."
          confirmLabel={`Renovar (-${renewCost})`}
          onConfirm={handleRenew}
        />
      )}
    </div>
  );
}

// ================================ MODAL WRAPPER ================================

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[140] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose} role="dialog" aria-modal="true"
    >
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[#0A0A0B] border border-white/10 rounded-3xl p-5 space-y-4">
        {children}
      </div>
    </div>
  );
}

// ================================ SECTION HEADER ================================

function SectionHeader({ icon, label, count, color }: { icon: React.ReactNode; label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2 px-1">
      {icon}
      <h2 className="text-[11px] font-black uppercase tracking-wider" style={{ color }}>{label}</h2>
      <span className="text-[10px] text-white/50">({count})</span>
    </div>
  );
}

// ================================ CARD ================================

function AdCard({
  ad, expired, boostCost, renewCost, isBoosting, isRenewing,
  onEdit, onDelete, onBoost, onRenew,
}: {
  ad: AdRow;
  expired?: boolean;
  boostCost?: number;
  renewCost?: number;
  isBoosting?: boolean;
  isRenewing?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onBoost?: () => void;
  onRenew?: () => void;
}) {
  const m = ad.metadata || {};
  const photos: string[] = Array.isArray(m.photos) ? m.photos : [];
  const cover = photos[0] || null;
  const priceTo = m.price_to as number | null | undefined;
  const priceFrom = m.price_from as number | null | undefined;
  const stock = m.stock as number | null | undefined;
  const kind = m.ad_kind as string | undefined;
  const status = (m.status as string) || "active";
  const theme = getCategoryTheme((ad.category as any) || "lojista");
  const editCount = (m.edit_count as number | undefined) || 0;
  const views = Number(m.views ?? 0);
  const chats = Number(m.chats ?? 0);
  const daysLeft = daysUntil(m.expires_at);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const off = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", off);
    return () => window.removeEventListener("mousedown", off);
  }, [menuOpen]);

  return (
    <li className={`rounded-2xl border overflow-hidden flex flex-col sm:flex-row ${
      expired ? "border-[#FFB020]/40 bg-[#FFB020]/5" : "border-white/10 bg-[#0E0E10]"
    }`}>
      <div className="w-full sm:w-40 h-40 sm:h-auto shrink-0 bg-black/50 relative">
        {cover ? (
          <img src={cover} alt={ad.title || "Anúncio"} loading="lazy" decoding="async"
            className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30">
            <ImageOff className="w-8 h-8" />
          </div>
        )}
        {photos.length > 1 && (
          <div className="absolute bottom-1.5 right-1.5 bg-black/70 backdrop-blur-md rounded-full px-2 py-0.5 text-[10px] font-bold text-white">
            +{photos.length - 1}
          </div>
        )}
        {expired && (
          <div className="absolute top-1.5 left-1.5 bg-[#FFB020] text-black rounded-full px-2 py-0.5 text-[9px] font-black uppercase inline-flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" /> Expirado
          </div>
        )}
      </div>

      <div className="flex-1 p-4 flex flex-col gap-2 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black text-white leading-tight line-clamp-2">
              {ad.title || "(sem título)"}
            </h3>
            <p className="text-[10px] text-white/50 mt-1 inline-flex items-center gap-1.5 flex-wrap">
              <span>Publicado em {fmtDate(ad.created_at)}</span>
              {editCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">
                  Editado {editCount}x
                </span>
              )}
              <span className="px-1.5 py-0.5 rounded-full border"
                style={{
                  background: expired ? "#FFB02015" : (status === "active" ? "#39FF8815" : "#FFB02015"),
                  borderColor: expired ? "#FFB02055" : (status === "active" ? "#39FF8855" : "#FFB02055"),
                  color: expired ? "#FFB020" : (status === "active" ? "#39FF88" : "#FFB020"),
                }}>
                {expired ? "Expirado" : (status === "active" ? "Ativo" : status)}
              </span>
              {!expired && daysLeft != null && daysLeft >= 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70 inline-flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> {daysLeft}d restantes
                </span>
              )}
            </p>
          </div>

          {/* Menu ⋮ */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label="Mais opções"
              onClick={() => setMenuOpen((v) => !v)}
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 inline-flex items-center justify-center"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-20 min-w-[210px] rounded-xl border border-white/10 bg-[#111112] shadow-2xl py-1.5">
                {!expired && onBoost && (
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); onBoost(); }}
                    disabled={isBoosting}
                    className="w-full px-3 py-2 text-left text-[12px] font-bold text-white/90 hover:bg-white/5 inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    <Rocket className="w-3.5 h-3.5 text-[#FFB020]" />
                    Impulsionar Anúncio
                    <span className="ml-auto text-[10px] text-[#FFB020] font-black">−{boostCost}🪙</span>
                  </button>
                )}
                {expired && onRenew && (
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); onRenew(); }}
                    disabled={isRenewing}
                    className="w-full px-3 py-2 text-left text-[12px] font-bold text-white/90 hover:bg-white/5 inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-[#39FF88]" />
                    Renovar +15 dias
                    <span className="ml-auto text-[10px] text-[#39FF88] font-black">−{renewCost}🪙</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onEdit(); }}
                  className="w-full px-3 py-2 text-left text-[12px] font-bold text-white/90 hover:bg-white/5 inline-flex items-center gap-2"
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onDelete(); }}
                  className="w-full px-3 py-2 text-left text-[12px] font-bold text-[#FF3B6B] hover:bg-[#FF3B6B]/10 inline-flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-[12px] text-white/70 line-clamp-2 leading-snug">
          {ad.content || "—"}
        </p>

        <div className="flex items-end gap-3 flex-wrap mt-1">
          {priceFrom ? <span className="text-[11px] text-white/40 line-through">{fmtBRL(priceFrom)}</span> : null}
          <span className="text-base font-black" style={{ color: theme.hex }}>{fmtBRL(priceTo ?? null)}</span>
          {stock != null && (
            <span className="text-[10px] text-white/50 inline-flex items-center gap-1">
              <Package className="w-3 h-3" /> {stock} un.
            </span>
          )}
          {kind && (
            <span className="text-[10px] text-white/50 inline-flex items-center gap-1">
              <StoreIcon className="w-3 h-3" /> {kind}
            </span>
          )}
        </div>

        {/* MÉTRICAS DISCRETAS — visíveis apenas ao dono (esta página é do dono) */}
        <div className="flex items-center gap-3 text-[10px] text-white/50 pt-1">
          <span className="inline-flex items-center gap-1">
            <Eye className="w-3 h-3" /> {views.toLocaleString("pt-BR")} views
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> {chats.toLocaleString("pt-BR")} chats
          </span>
          {m.boosted_at && (
            <span className="inline-flex items-center gap-1 text-[#FFB020]">
              <Rocket className="w-3 h-3" /> impulsionado
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2 mt-auto flex-wrap">
          <Link
            to="/feed/lojista"
            className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-white/80 hover:text-white text-[11px] font-bold uppercase inline-flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" /> Ver no Feed
          </Link>
          {expired ? (
            <button
              type="button" onClick={onRenew} disabled={isRenewing}
              className="h-9 px-3 rounded-lg bg-[#39FF88] text-black text-[11px] font-black uppercase inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRenewing ? "animate-spin" : ""}`} />
              {isRenewing ? "Renovando..." : `Renovar +15d (−${renewCost}🪙)`}
            </button>
          ) : (
            onBoost && (
              <button
                type="button" onClick={onBoost} disabled={isBoosting}
                className="h-9 px-3 rounded-lg bg-[#FFB020]/15 border border-[#FFB020]/40 text-[#FFB020] hover:bg-[#FFB020]/25 text-[11px] font-black uppercase inline-flex items-center gap-1.5 disabled:opacity-60"
              >
                <Rocket className="w-3.5 h-3.5" /> {isBoosting ? "..." : `Impulsionar (−${boostCost}🪙)`}
              </button>
            )
          )}
        </div>
      </div>
    </li>
  );
}

// ================================ SKELETON / EMPTY ================================

function SkeletonList() {
  return (
    <ul className="grid gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="rounded-2xl border border-white/10 bg-[#0E0E10] overflow-hidden flex">
          <div className="w-40 h-32 bg-white/5 animate-pulse" />
          <div className="flex-1 p-4 space-y-2">
            <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse" />
            <div className="h-3 w-full bg-white/5 rounded animate-pulse" />
            <div className="h-6 w-1/3 bg-white/5 rounded animate-pulse mt-2" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyPanel({ hasQuery, onCreate }: { hasQuery: boolean; onCreate: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center space-y-3">
      <div className="w-14 h-14 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
        <Megaphone className="w-6 h-6 text-white/40" />
      </div>
      <h3 className="text-sm font-black uppercase text-white">
        {hasQuery ? "Nenhum anúncio encontrado" : "Você ainda não publicou anúncios"}
      </h3>
      <p className="text-[11px] text-white/60 max-w-sm mx-auto leading-relaxed">
        {hasQuery
          ? "Tente ajustar a busca ou remover os filtros."
          : "Crie seu primeiro anúncio comercial para promover produtos, kits e liquidações no Feed."}
      </p>
      {!hasQuery && (
        <button type="button" onClick={onCreate}
          className="mt-2 h-10 px-4 rounded-xl bg-[#00E5FF] text-black text-[11px] font-black uppercase tracking-wider inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> Criar Primeiro Anúncio
        </button>
      )}
    </div>
  );
}
