import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Star, MapPin, UserCircle2 } from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";

/**
 * Seção "Prestadores e Parceiros Recentes" — carrossel horizontal exibido
 * no Painel do Lojista logo acima de "Solicitações no Período".
 *
 * Regras:
 * - Somente perfis de Prestador (🛠️ laranja âmbar) e Parceiro/Fornecedor B2B
 *   (🚚 roxo violeta). Lojistas e Clientes Finais são excluídos.
 * - Até 30 cards ordenados por `created_at DESC` e `rating DESC`.
 * - Otimizado para mobile: snap horizontal, imagens lazy e fallback de avatar.
 * - Card inteiro clicável → `/prestador/:id` ou `/parceiro/:id` conforme o role.
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

const KIND_META: Record<PartnerKind, { emoji: string; label: string; color: string; borderClass: string; gradientClass: string; route: (id: string) => string }> = {
  prestador: {
    emoji: "🛠️",
    label: "Prestador",
    color: "#FF9F0A",
    borderClass: "border-[#FF9F0A]",
    gradientClass: "from-[#FF9F0A]/25 via-[#FF9F0A]/10 to-transparent",
    route: (id) => `/prestador/${encodeURIComponent(id)}`,
  },
  fornecedor: {
    emoji: "🚚",
    label: "Parceiro Fornecedor",
    color: "#A855F7",
    borderClass: "border-[#A855F7]",
    gradientClass: "from-[#A855F7]/25 via-[#A855F7]/10 to-transparent",
    route: (id) => `/parceiro/${encodeURIComponent(id)}`,
  },
};

// Mock leve para quando o banco não retorna dados suficientes (rede offline, tabela vazia, etc.).
const FALLBACK_PARTNERS: PartnerCard[] = [
  { id: "mock-p-1", full_name: "Jorge Salgado", avatar_url: null, role: "prestador", activity_branch: "Conferente Técnico", city: "Votorantim", uf: "SP", rating: 5.0, created_at: null, _kind: "prestador" },
  { id: "mock-p-2", full_name: "Carla Ribeiro", avatar_url: null, role: "prestador", activity_branch: "Elétrica Predial", city: "Sorocaba", uf: "SP", rating: 4.9, created_at: null, _kind: "prestador" },
  { id: "mock-f-1", full_name: "MDF Atacado Brasil", avatar_url: null, role: "fornecedor", activity_branch: "Atacado de MDF", city: "São Paulo", uf: "SP", rating: 4.8, created_at: null, _kind: "fornecedor" },
  { id: "mock-p-3", full_name: "Rodrigo Marques", avatar_url: null, role: "prestador", activity_branch: "Marcenaria Fina", city: "Campinas", uf: "SP", rating: 4.7, created_at: null, _kind: "prestador" },
  { id: "mock-f-2", full_name: "Ferragens Real", avatar_url: null, role: "fornecedor", activity_branch: "Ferragens B2B", city: "Osasco", uf: "SP", rating: 4.9, created_at: null, _kind: "fornecedor" },
  { id: "mock-p-4", full_name: "Amanda Souza", avatar_url: null, role: "prestador", activity_branch: "Design de Interiores", city: "Itu", uf: "SP", rating: 5.0, created_at: null, _kind: "prestador" },
];

export function RecentPartnersCarousel() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PartnerCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabaseExternal
          .from("profiles")
          .select("id, full_name, avatar_url, role, activity_branch, city, uf, rating, created_at")
          .order("created_at", { ascending: false })
          .order("rating", { ascending: false })
          .limit(120);
        if (cancelled) return;
        const rows = ((data as unknown as PartnerRow[]) ?? [])
          .map((r) => {
            const kind = classifyRole(r.role);
            if (!kind) return null;
            return { ...r, _kind: kind } as PartnerCard;
          })
          .filter((x): x is PartnerCard => !!x)
          .slice(0, 30);
        setItems(rows.length > 0 ? rows : FALLBACK_PARTNERS);
      } catch {
        if (!cancelled) setItems(FALLBACK_PARTNERS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const openProfile = (p: PartnerCard) => {
    const path = KIND_META[p._kind].route(p.id);
    try { navigate({ to: path as any }); } catch { window.location.href = path; }
  };

  return (
    <section
      aria-label="Prestadores e parceiros recentes"
      className="bg-[#1A1A1B] border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-6"
    >
      <header className="mb-3 md:mb-4">
        <h3 className="font-black italic uppercase text-white text-sm md:text-base tracking-wide">
          👥 Prestadores e Parceiros Recentes
        </h3>
        <p className="text-[11px] md:text-xs text-muted-foreground mt-1">
          Conecte-se com profissionais e fornecedores recomendados na sua região.
        </p>
      </header>

      {loading ? (
        <div className="flex gap-3 pb-2 overflow-x-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-44 flex-shrink-0 h-64 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
          ))}
        </div>
      ) : (
        <div
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
                  {location && (
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{location}</span>
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
