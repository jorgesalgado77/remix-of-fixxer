import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Star, MapPin, UserCircle2, RefreshCw, UsersRound } from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";

/**
 * Seção "Prestadores e Parceiros Recentes" — carrossel horizontal exibido
 * no Painel do Lojista.
 *
 * - Somente Prestadores (🛠️ âmbar) e Parceiros/Fornecedores B2B (🚚 violeta).
 * - Até 30 cards ordenados por `created_at DESC` e `rating DESC`.
 * - Skeletons fiéis ao layout do card durante o carregamento.
 * - Estado vazio com CTA quando não há parceiros.
 * - Pull-to-refresh mobile (arrastar a seção para baixo) + botão "Atualizar" desktop.
 * - Clique no card → sempre `/perfil/:userId` (rota unificada que roteia por role).
 */

type PartnerRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  activity_branch: string | null;
  city: string | null;
  uf: string | null;
  rating: number | null;
  created_at: string | null;
};

type PartnerKind = "prestador" | "fornecedor";
type PartnerCard = PartnerRow & { _kind: PartnerKind };

function classifyRole(role: string | null | undefined): PartnerKind | null {
  const r = (role || "").toLowerCase();
  if (r.includes("lojista") || r.includes("cliente") || r.includes("casual") || r.includes("admin")) return null;
  if (r.includes("prestador")) return "prestador";
  if (r.includes("fornec") || r.includes("parceiro") || r.includes("b2b")) return "fornecedor";
  return null;
}

const KIND_META: Record<PartnerKind, { emoji: string; label: string; color: string; borderClass: string; gradientClass: string }> = {
  prestador: {
    emoji: "🛠️",
    label: "Prestador",
    color: "#FF9F0A",
    borderClass: "border-[#FF9F0A]",
    gradientClass: "from-[#FF9F0A]/25 via-[#FF9F0A]/10 to-transparent",
  },
  fornecedor: {
    emoji: "🚚",
    label: "Parceiro Fornecedor",
    color: "#A855F7",
    borderClass: "border-[#A855F7]",
    gradientClass: "from-[#A855F7]/25 via-[#A855F7]/10 to-transparent",
  },
};

// Fallback obrigatório para o Preview: exibido quando o Supabase não retorna registros.
// Inclui os 4 perfis pedidos + 2 extras para garantir carrossel cheio.
const FALLBACK_PARTNERS: PartnerCard[] = [
  { id: "mock-jorge-salgado", full_name: "Jorge Salgado", avatar_url: null, role: "prestador", activity_branch: "Conferente Técnico", city: "Votorantim", uf: "SP", rating: 5.0, created_at: null, _kind: "prestador" },
  { id: "mock-carlos-silva", full_name: "Carlos Silva", avatar_url: null, role: "prestador", activity_branch: "Montador de Móveis", city: "Sorocaba", uf: "SP", rating: 4.9, created_at: null, _kind: "prestador" },
  { id: "mock-mdf-cia", full_name: "Mdf & Cia Atacado", avatar_url: null, role: "fornecedor", activity_branch: "Insumos e Ferragens", city: "Sorocaba", uf: "SP", rating: 4.8, created_at: null, _kind: "fornecedor" },
  { id: "mock-ana-paula", full_name: "Ana Paula", avatar_url: null, role: "prestador", activity_branch: "Designer de Interiores", city: "Votorantim", uf: "SP", rating: 5.0, created_at: null, _kind: "prestador" },
  { id: "mock-ferragens-real", full_name: "Ferragens Real", avatar_url: null, role: "fornecedor", activity_branch: "Ferragens B2B", city: "Osasco", uf: "SP", rating: 4.9, created_at: null, _kind: "fornecedor" },
  { id: "mock-rodrigo-marques", full_name: "Rodrigo Marques", avatar_url: null, role: "prestador", activity_branch: "Marcenaria Fina", city: "Campinas", uf: "SP", rating: 4.7, created_at: null, _kind: "prestador" },
];

export function RecentPartnersCarousel() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PartnerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [pull, setPull] = useState(0);
  const startY = useRef<number | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const THRESHOLD = 60;
  const MAX_PULL = 90;

  const fetchPartners = useCallback(async () => {
    try {
      const { data } = await supabaseExternal
        .from("profiles")
        .select("id, full_name, avatar_url, role, activity_branch, city, uf, rating, created_at")
        .order("created_at", { ascending: false })
        .order("rating", { ascending: false })
        .limit(120);
      const rows = ((data as unknown as PartnerRow[]) ?? [])
        .map((r) => {
          const kind = classifyRole(r.role);
          return kind ? ({ ...r, _kind: kind } as PartnerCard) : null;
        })
        .filter((x): x is PartnerCard => !!x)
        .slice(0, 30);
      if (rows.length > 0) {
        setItems(rows);
        setUsingFallback(false);
      } else {
        setItems(FALLBACK_PARTNERS);
        setUsingFallback(true);
      }
    } catch {
      setItems(FALLBACK_PARTNERS);
      setUsingFallback(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchPartners();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchPartners]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    await fetchPartners();
    setTimeout(() => setRefreshing(false), 300);
  }, [fetchPartners, refreshing]);

  // Pull-to-refresh (mobile): gesto na própria seção. Só ativa quando o carrossel
  // horizontal está na posição inicial (scrollLeft ~ 0) para não conflitar com o swipe lateral.
  const onTouchStart = (e: React.TouchEvent) => {
    if (refreshing) return;
    const el = scrollerRef.current;
    if (el && el.scrollLeft > 4) return;
    startY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current == null || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setPull(Math.min(MAX_PULL, dy / 2.2));
  };
  const onTouchEnd = () => {
    if (startY.current == null) return;
    startY.current = null;
    if (pull >= THRESHOLD) handleRefresh();
    setPull(0);
  };

  const openProfile = (p: PartnerCard) => {
    const path = `/perfil/${encodeURIComponent(p.id)}`;
    try { navigate({ to: path as any }); } catch { window.location.href = path; }
  };

  const showSkeleton = loading;
  const showEmpty = !loading && items.length === 0;

  return (
    <section
      aria-label="Prestadores e parceiros recentes"
      className="bg-[#1A1A1B] border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-6 relative overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Indicador de pull-to-refresh */}
      {(pull > 0 || refreshing) && (
        <div
          className="absolute left-0 right-0 top-0 flex items-center justify-center text-[11px] font-bold text-white/80 pointer-events-none"
          style={{ height: refreshing ? 32 : Math.max(pull, 0), transition: refreshing ? "height 200ms" : undefined }}
        >
          <RefreshCw
            className="w-4 h-4 mr-1"
            style={{
              color: "#00FF87",
              animation: refreshing ? "spin 800ms linear infinite" : undefined,
              transform: refreshing ? undefined : `rotate(${Math.min(360, pull * 4)}deg)`,
            }}
          />
          {refreshing ? "Atualizando..." : pull >= THRESHOLD ? "Solte para atualizar" : "Puxe para atualizar"}
        </div>
      )}

      <header className="mb-3 md:mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-black italic uppercase text-white text-sm md:text-base tracking-wide">
            👥 Prestadores e Parceiros Recentes
          </h3>
          <p className="text-[11px] md:text-xs text-muted-foreground mt-1">
            Conecte-se com profissionais e fornecedores recomendados na sua região.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="shrink-0 inline-flex items-center gap-1 text-[11px] md:text-xs font-bold text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1.5 transition disabled:opacity-50"
          aria-label="Atualizar lista de parceiros"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          <span className="hidden md:inline">Atualizar</span>
        </button>
      </header>

      {showSkeleton ? (
        <div className="flex gap-3 pb-2 overflow-x-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-44 flex-shrink-0 rounded-2xl bg-[#1A1A1B] border border-white/10 overflow-hidden">
              <div className="w-full h-40 bg-white/5 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-3/4 rounded bg-white/10 animate-pulse" />
                <div className="h-2.5 w-1/2 rounded bg-white/5 animate-pulse" />
                <div className="h-2.5 w-2/3 rounded bg-white/5 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : showEmpty ? (
        <div className="flex flex-col items-center justify-center text-center py-10 px-4 border border-dashed border-white/10 rounded-2xl">
          <UsersRound className="w-10 h-10 text-white/40 mb-2" />
          <p className="text-sm font-bold text-white">Nenhum parceiro encontrado por aqui.</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Explore o feed completo de prestadores e fornecedores para descobrir profissionais próximos de você.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            <button
              type="button"
              onClick={() => { try { navigate({ to: "/feed/prestador" as any }); } catch { window.location.href = "/feed/prestador"; } }}
              className="text-xs font-bold bg-[#FF9F0A] text-black rounded-full px-4 py-2 hover:brightness-110 transition"
            >
              🛠️ Ver Prestadores
            </button>
            <button
              type="button"
              onClick={() => { try { navigate({ to: "/feed/parceiro" as any }); } catch { window.location.href = "/feed/parceiro"; } }}
              className="text-xs font-bold bg-[#A855F7] text-white rounded-full px-4 py-2 hover:brightness-110 transition"
            >
              🚚 Ver Parceiros
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              className="text-xs font-bold bg-white/10 text-white rounded-full px-4 py-2 hover:bg-white/20 transition inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
            </button>
          </div>
        </div>
      ) : (
        <div
          ref={scrollerRef}
          className="flex gap-3 pb-2 overflow-x-auto snap-x snap-mandatory scrollbar-none"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
        >
          {items.map((p) => {
            const meta = KIND_META[p._kind];
            const rating = typeof p.rating === "number" && p.rating > 0 ? p.rating : 5.0;
            const location = [p.city, p.uf].filter(Boolean).join(", ");
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => openProfile(p)}
                className={`w-44 flex-shrink-0 snap-start rounded-2xl bg-[#1A1A1B] overflow-hidden border-2 ${meta.borderClass} text-left transition-transform active:scale-[0.98] hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black`}
                style={{ boxShadow: `0 0 12px ${meta.color}22` }}
                aria-label={`Abrir perfil de ${p.full_name || "profissional"}`}
              >
                <div className="relative w-full h-40 bg-black/40">
                  {p.avatar_url ? (
                    <img
                      src={p.avatar_url}
                      alt={p.full_name || "Perfil"}
                      loading="lazy"
                      decoding="async"
                      className="h-40 w-full object-cover"
                      onError={(e) => {
                        const el = e.currentTarget;
                        el.style.display = "none";
                        const fb = el.nextElementSibling as HTMLElement | null;
                        if (fb) fb.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className="absolute inset-0 items-center justify-center bg-gradient-to-br from-black/60 to-black/30"
                    style={{ display: p.avatar_url ? "none" : "flex" }}
                  >
                    <UserCircle2 className="w-14 h-14" style={{ color: meta.color, opacity: 0.7 }} />
                  </div>
                  <span className="absolute top-2 right-2 text-xs font-bold text-yellow-400 bg-black/70 px-2 py-0.5 rounded-full backdrop-blur-sm inline-flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {rating.toFixed(1)}
                  </span>
                </div>

                <div className={`relative p-3 bg-gradient-to-t ${meta.gradientClass}`}>
                  <p className="font-black text-white text-sm truncate leading-tight">
                    {p.full_name || "Profissional"}
                  </p>
                  <p
                    className="text-[11px] font-bold mt-0.5 truncate"
                    style={{ color: meta.color }}
                    title={p.activity_branch || meta.label}
                  >
                    {meta.emoji} {p.activity_branch || meta.label}
                  </p>
                  {location ? (
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{location}</span>
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1 truncate italic">
                      <MapPin className="w-3 h-3 shrink-0" />
                      Localização não informada
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
