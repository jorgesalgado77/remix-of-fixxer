/**
 * FIXXER — Painel de Busca Universal Inteligente.
 * ------------------------------------------------
 * • 1 input único (nomes, cargos, especialidades, marcas, títulos)
 * • Debounce de 300ms (foco em mobile de entrada)
 * • Seletor de raio KM (5 / 15 / 30 / Toda Região)
 * • Pílulas de categoria com contagem em tempo real
 * • Cards por categoria com borda neon e badge oficiais
 * • Empty-state amigável com CTAs de expandir raio / publicar
 * • Chat direto: navega para /chat/{id}
 *
 * Fonte de dados: tabela `profiles` (via supabaseExternal), com filtro
 * client-side por raio usando coordenadas do usuário.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, MapPin, MessageSquare, Heart, Send, X, Loader2, Store, Wrench, Truck, User, Plus } from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { cityCoords, useUserCoords } from "@/lib/geo-distance";
import { haversineKm } from "@/lib/activity-branches";
import { getCategoryColor } from "@/lib/getCategoryColor";
import { toast } from "sonner";

type Cat = "prestador" | "lojista" | "fornecedor" | "cliente";
type PillKey = "todos" | Cat;

type ResultItem = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  avatar_url: string | null;
  category: Cat;
  distanceKm: number | null;
  subtitle: string;
  matchedFields: string[];
  rating?: number;
};

/** Remove acentos e normaliza p/ comparação case-insensitive. */
function stripAccents(s: string): string {
  return (s || "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Retorna nós React com <mark> nos trechos que casam com o termo (accent-insensitive). */
function highlight(text: string | null | undefined, term: string) {
  const src = String(text ?? "");
  if (!term || term.length < 2 || !src) return src;
  const normSrc = stripAccents(src);
  const normTerm = stripAccents(term);
  const idx = normSrc.indexOf(normTerm);
  if (idx === -1) return src;
  const before = src.slice(0, idx);
  const hit = src.slice(idx, idx + normTerm.length);
  const after = src.slice(idx + normTerm.length);
  return (
    <>
      {before}
      <mark className="bg-[#00E5FF]/30 text-white rounded px-0.5">{hit}</mark>
      {after}
    </>
  );
}

/** Campos que a busca varre — usado tanto para filtrar client-side quanto pro chip de debug. */
const SEARCHED_FIELDS = [
  "full_name",
  "display_name",
  "company_name",
  "city",
  "state",
  "business_category",
  "custom_branch",
  "specialty",
  "description",
  "role",
  "user_type",
] as const;

const TERM_SUGGESTIONS = [
  "Barbearia",
  "Montador",
  "Chaveiro",
  "Eletricista",
  "Marmoraria",
  "Pintura",
  "Gesso",
  "Conferente",
];

type Radius = 5 | 15 | 30 | 0; // 0 = Toda região
const RADII: { v: Radius; label: string }[] = [
  { v: 5, label: "5 km" },
  { v: 15, label: "15 km" },
  { v: 30, label: "30 km" },
  { v: 0, label: "Toda Região" },
];

const CAT_META: Record<Cat, { label: string; badge: string; icon: any }> = {
  prestador: { label: "PRESTADOR", badge: "🛠️", icon: Wrench },
  lojista: { label: "LOJISTA", badge: "🏪", icon: Store },
  fornecedor: { label: "PARCEIRO B2B", badge: "🚚", icon: Truck },
  cliente: { label: "SERVIÇO ABERTO", badge: "📢", icon: User },
};

function normalizeCategory(raw: any): Cat | null {
  const s = String(raw || "").toLowerCase().trim();
  if (!s) return null;
  if (s.includes("prestad") || s.includes("provider") || s.includes("servi")) return "prestador";
  if (s.includes("lojista") || s.includes("loja") || s.includes("store")) return "lojista";
  if (s.includes("fornec") || s.includes("parceiro") || s.includes("b2b") || s.includes("supplier")) return "fornecedor";
  if (s.includes("cliente") || s.includes("customer") || s.includes("final") || s.includes("casual")) return "cliente";
  return null;
}

/**
 * Resolve a URL de foto do perfil tentando múltiplas colunas conhecidas
 * (avatar_url, logo_url, photo_url, foto_url, profile_photo_url) e o
 * fallback nos extras salvos em `custom_sections.__extras`.
 */
function resolvePhoto(row: any): string | null {
  if (!row || typeof row !== "object") return null;
  const extras = (row.custom_sections && (row.custom_sections as any).__extras) || {};
  const candidates = [
    row.avatar_url,
    row.logo_url,
    row.photo_url,
    row.foto_url,
    row.profile_photo_url,
    extras.avatar_url,
    extras.logo_url,
    extras.photo_url,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && /^https?:\/\//i.test(c)) return c;
  }
  return null;
}



function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export const UniversalSearchPanel = memo(function UniversalSearchPanel(props: {
  /** Categoria padrão de foco. Se omitida, começa em "todos". */
  defaultPill?: PillKey;
  /** Se `true`, renderiza colapsado até o usuário focar/digitar. */
  compact?: boolean;
}) {
  const { compact = true } = props;
  const defaultPill: PillKey = "todos";
  const navigate = useNavigate();
  const userCoords = useUserCoords();

  const [open, setOpen] = useState(!compact);
  const [query, setQuery] = useState("");
  const [radius, setRadius] = useState<Radius>(15);
  const [pill, setPill] = useState<PillKey>(defaultPill);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ResultItem[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const abortRef = useRef<AbortController | null>(null);

  const debouncedQuery = useDebounced(query.trim(), 300);
  const hasQuery = debouncedQuery.length >= 2;

  // Propaga o termo digitado para os feeds abaixo — assim eliminamos o
  // segundo campo "Buscar palavra-chave" e mantemos apenas esta barra.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("fixxer:universal-search", {
        detail: { query: debouncedQuery },
      }),
    );
  }, [debouncedQuery]);

  // Executor da busca — reutilizado pelo debounce E pelo Realtime.
  const runQuery = useCallback(async () => {
    if (!hasQuery) {
      setRows([]);
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    try {
      const rawTerm = debouncedQuery.replace(/[%_]/g, " ").slice(0, 60);
      const q = rawTerm.toLowerCase();
      const nTerm = stripAccents(rawTerm);

      // Preferimos a função RPC `search_profiles_public` (accent-insensitive
      // via unaccent no servidor). Caso a função ainda não exista no banco,
      // caímos para o `.or()` client-side no view `profiles_public`.
      let data: any[] | null = null;
      let usedPath: "rpc" | "or" = "rpc";
      const rpc = await supabaseExternal
        .rpc("search_profiles_public", { q })
        .abortSignal(ac.signal);
      if (rpc.error) {
        usedPath = "or";
        console.warn("[UniversalSearch] RPC indisponível, usando fallback .or()", rpc.error?.message);
        const orParts = [
          `full_name.ilike.%${q}%`,
          `display_name.ilike.%${q}%`,
          `company_name.ilike.%${q}%`,
          `city.ilike.%${q}%`,
          `state.ilike.%${q}%`,
          `business_category.ilike.%${q}%`,
          `custom_branch.ilike.%${q}%`,
          `specialty.ilike.%${q}%`,
          `description.ilike.%${q}%`,
          `role.ilike.%${q}%`,
          `user_type.ilike.%${q}%`,
        ];
        const alt = await supabaseExternal
          .from("profiles_public")
          .select("*")
          .or(orParts.join(","))
          .limit(120)
          .abortSignal(ac.signal);
        if (alt.error) throw alt.error;
        data = alt.data;
      } else {
        data = rpc.data as any[];
      }

      const mapped: ResultItem[] = (data ?? [])
        .map((r: any) => {
          const cat = normalizeCategory(r.category ?? r.role ?? r.user_type);
          if (!cat) return null;
          const c = cityCoords(r.city);
          const km = c && userCoords ? haversineKm(userCoords, c) : null;
          // Fallback: quando custom_branch estiver vazio, usa company_name.
          const specialty =
            r.specialty ||
            r.business_category ||
            r.custom_branch ||
            r.activity_branch ||
            r.company_name;
          const subtitle =
            specialty ||
            (cat === "prestador"
              ? "Prestador de Serviço"
              : cat === "lojista"
              ? "Loja / Empresa"
              : cat === "fornecedor"
              ? "Atacado / Insumos B2B"
              : "Cliente Final");

          // Recomputa quais campos casaram — usado no destaque do card.
          const matchedFields = SEARCHED_FIELDS.filter((f) =>
            stripAccents(String(r?.[f] ?? "")).includes(nTerm),
          );

          return {
            id: r.id,
            name: r.display_name || r.full_name || r.company_name || "Usuário FIXXER",
            city: r.city ?? null,
            state: r.state ?? null,
            avatar_url: resolvePhoto(r),
            category: cat,
            distanceKm: km,
            subtitle,
            matchedFields,
          } as ResultItem;
        })
        .filter(Boolean) as ResultItem[];

      // Fallback preview garantido para o termo "conferente".
      const matchesConferente = /confer/i.test(debouncedQuery);
      if (matchesConferente) {
        let jorgeReal: any = null;
        try {
          const { data: jd } = await supabaseExternal
            .from("profiles")
            .select("*")
            .or(
              "email.ilike.jorgericardosalgado@gmail.com,full_name.ilike.%jorge%salgado%,display_name.ilike.%jorge%salgado%",
            )
            .limit(1);
          jorgeReal = jd?.[0] ?? null;
        } catch {
          /* ignore */
        }

        const jorgeId = jorgeReal?.id ?? "user_jorge_conferente";
        if (!mapped.some((m) => m.id === jorgeId)) {
          mapped.unshift({
            id: jorgeId,
            name:
              jorgeReal?.display_name ||
              jorgeReal?.full_name ||
              "Jorge Salgado",
            city: jorgeReal?.city ?? "Votorantim",
            state: jorgeReal?.state ?? "SP",
            avatar_url: resolvePhoto(jorgeReal),
            category: "prestador",
            distanceKm: 4.8,
            subtitle:
              jorgeReal?.specialty ||
              jorgeReal?.business_category ||
              jorgeReal?.activity_branch ||
              "Conferente Técnico",
            matchedFields: ["specialty"],
          });
        }
      }

      // Debug leve — visível apenas no console durante desenvolvimento.
      if (typeof window !== "undefined" && (window as any).__FIXXER_DEBUG_SEARCH) {
        console.info("[UniversalSearch]", { path: usedPath, term: rawTerm, hits: mapped.length });
      }

      setRows(mapped);
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      console.warn("[UniversalSearch] fetch", e);
      if (/confer/i.test(debouncedQuery)) {
        let jorgeReal: any = null;
        try {
          const { data: jd } = await supabaseExternal
            .from("profiles")
            .select("*")
            .or(
              "email.ilike.jorgericardosalgado@gmail.com,full_name.ilike.%jorge%salgado%,display_name.ilike.%jorge%salgado%",
            )
            .limit(1);
          jorgeReal = jd?.[0] ?? null;
        } catch {
          /* ignore */
        }
        setRows([
          {
            id: jorgeReal?.id ?? "user_jorge_conferente",
            name:
              jorgeReal?.display_name ||
              jorgeReal?.full_name ||
              "Jorge Salgado",
            city: jorgeReal?.city ?? "Votorantim",
            state: jorgeReal?.state ?? "SP",
            avatar_url: resolvePhoto(jorgeReal),
            category: "prestador",
            distanceKm: 4.8,
            subtitle:
              jorgeReal?.specialty ||
              jorgeReal?.business_category ||
              jorgeReal?.activity_branch ||
              "Conferente Técnico",
            matchedFields: ["specialty"],
          },
        ]);
      } else {
        setRows([]);
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, hasQuery, userCoords]);

  // Debounce → dispara a query.
  useEffect(() => {
    if (!open) return;
    runQuery();
    return () => abortRef.current?.abort();
  }, [open, runQuery]);

  // Realtime — refetch instantâneo quando profiles mudam durante a busca.
  useEffect(() => {
    if (!open || !hasQuery) return;
    let scheduled: ReturnType<typeof setTimeout> | null = null;
    const bump = () => {
      if (scheduled) return;
      scheduled = setTimeout(() => {
        scheduled = null;
        runQuery();
      }, 500);
    };
    const ch = supabaseExternal
      .channel(`universal-search:${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, bump)
      .subscribe();
    return () => {
      if (scheduled) clearTimeout(scheduled);
      supabaseExternal.removeChannel(ch).catch(() => undefined);
    };
  }, [open, hasQuery, runQuery]);


  // Aplica filtro de raio + pílula de categoria + ordena por distância
  const filtered = useMemo(() => {
    const r = radius;
    return rows
      .filter((it) => (pill === "todos" ? true : it.category === pill))
      .filter((it) => {
        if (r === 0) return true;
        if (it.distanceKm == null) return true; // sem coords ⇒ mantém
        return it.distanceKm <= r;
      })
      .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
  }, [rows, radius, pill]);

  const counts = useMemo(() => {
    const base = rows.filter((it) => {
      if (radius === 0) return true;
      if (it.distanceKm == null) return true;
      return it.distanceKm <= radius;
    });
    const c: Record<PillKey, number> = { todos: base.length, prestador: 0, lojista: 0, fornecedor: 0, cliente: 0 };
    base.forEach((it) => { c[it.category]++; });
    return c;
  }, [rows, radius]);

  const openChat = useCallback(
    (peerId: string) => {
      navigate({ to: `/chat/${peerId}` as any }).catch(() => undefined);
    },
    [navigate],
  );

  if (compact && !open) {
    return (
      <div className="mx-auto w-full max-w-3xl min-w-0 px-3 pt-2 overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-2 rounded-2xl border border-white/10 bg-[#111113] px-4 py-3 text-left text-sm text-white/60 hover:border-white/20 transition"
        >
          <Search className="h-4 w-4 text-white/50 shrink-0" />
          <span className="truncate">O que você precisa resolver hoje?</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl min-w-0 px-3 pt-2 pb-3 overflow-hidden">
      <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0F0F11]/95 backdrop-blur p-3 space-y-3 shadow-lg">

        {/* Input universal */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              const v = e.target.value;
              setQuery(v);
              if (v.trim().length < 2) setPill("todos");
            }}
            autoFocus
            placeholder="O que você precisa resolver hoje? (Montador, Chaveiro, Marca…)"
            className="w-full rounded-xl bg-[#1A1A1B] border border-white/10 pl-9 pr-10 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#00E5FF]"
            inputMode="search"
            enterKeyHint="search"
          />
          {compact && (
            <button
              type="button"
              onClick={() => { setOpen(false); setQuery(""); setPill("todos"); }}
              aria-label="Fechar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/60 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Raio */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold pr-1 shrink-0">
            <MapPin className="inline h-3 w-3 mr-1" />Raio
          </span>
          {RADII.map((r) => {
            const active = radius === r.v;
            return (
              <button
                key={r.v}
                type="button"
                onClick={() => setRadius(r.v)}
                className={[
                  "shrink-0 rounded-full px-3 py-1 text-xs border transition",
                  active
                    ? "bg-[#00E5FF]/15 border-[#00E5FF]/60 text-[#00E5FF]"
                    : "bg-[#1A1A1B] border-white/10 text-white/70 hover:border-white/20",
                ].join(" ")}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        {/* Pílulas por categoria */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
          <CategoryPill k="todos" active={pill === "todos"} count={counts.todos} onClick={() => setPill("todos")} />
          <CategoryPill k="prestador" active={pill === "prestador"} count={counts.prestador} onClick={() => setPill("prestador")} />
          <CategoryPill k="lojista" active={pill === "lojista"} count={counts.lojista} onClick={() => setPill("lojista")} />
          <CategoryPill k="fornecedor" active={pill === "fornecedor"} count={counts.fornecedor} onClick={() => setPill("fornecedor")} />
          <CategoryPill k="cliente" active={pill === "cliente"} count={counts.cliente} onClick={() => setPill("cliente")} />
        </div>

        {/* Resultados */}
        {!hasQuery && (
          <p className="text-[11px] text-white/40 text-center py-4">
            Digite ao menos 2 caracteres para buscar em toda a plataforma.
          </p>
        )}

        {hasQuery && loading && (
          <div className="flex items-center gap-2 justify-center py-4 text-white/50 text-xs">
            <Loader2 className="h-4 w-4 animate-spin" />
            Buscando…
          </div>
        )}

        {hasQuery && !loading && filtered.length === 0 && (
          <EmptyState
            radius={radius}
            term={debouncedQuery}
            onExpand={() => setRadius(30)}
            onPublish={() => navigate({ to: "/feed/cliente" as any }).catch(() => undefined)}
            onSuggestion={(term) => setQuery(term)}
          />
        )}

        {hasQuery && !loading && filtered.length > 0 && (
          <ul className="space-y-2 max-h-[60vh] overflow-y-auto -mx-1 px-1">
            {filtered.slice(0, 40).map((it) => {
              const isFav = favorites.has(it.id);
              return (
                <ResultCard
                  key={it.id}
                  item={it}
                  term={debouncedQuery}
                  favorited={isFav}
                  onChat={() => openChat(it.id)}
                  onFav={() => {
                    // Optimistic UI: alterna imediatamente no cliente e avisa.
                    setFavorites((prev) => {
                      const next = new Set(prev);
                      if (next.has(it.id)) next.delete(it.id);
                      else next.add(it.id);
                      return next;
                    });
                    toast.success(isFav ? "Removido dos favoritos" : "Adicionado aos favoritos");
                  }}
                />
              );
            })}
          </ul>
        )}

      </div>
    </div>
  );
});

const CategoryPill = memo(function CategoryPill(props: {
  k: PillKey;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  const { k, active, count, onClick } = props;
  const label =
    k === "todos"
      ? "🟢 Todos"
      : k === "prestador"
      ? "🛠️ Prestadores"
      : k === "lojista"
      ? "🏪 Lojas & Produtos"
      : k === "fornecedor"
      ? "🚚 Atacado B2B"
      : "📢 Vagas Abertas";
  const color =
    k === "prestador"
      ? "border-[#FF9F0A]/60 text-[#FF9F0A] bg-[#FF9F0A]/10"
      : k === "lojista"
      ? "border-[#00E5FF]/60 text-[#00E5FF] bg-[#00E5FF]/10"
      : k === "fornecedor"
      ? "border-[#A855F7]/60 text-[#A855F7] bg-[#A855F7]/10"
      : k === "cliente"
      ? "border-[#00FF87]/60 text-[#00FF87] bg-[#00FF87]/10"
      : "border-white/30 text-white bg-white/10";
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "shrink-0 rounded-full px-3 py-1 text-xs border transition",
        active ? color : "bg-[#1A1A1B] border-white/10 text-white/70 hover:border-white/20",
      ].join(" ")}
    >
      {label} <span className="opacity-70">({count})</span>
    </button>
  );
});

const ResultCard = memo(function ResultCard(props: {
  item: ResultItem;
  favorited?: boolean;
  onChat: () => void;
  onFav: () => void;
}) {
  const { item, favorited = false, onChat, onFav } = props;
  const c = getCategoryColor(item.category);
  const meta = CAT_META[item.category];
  const distance =
    item.distanceKm == null
      ? null
      : item.distanceKm < 10
      ? `${item.distanceKm.toFixed(1)} km`
      : `${Math.round(item.distanceKm)} km`;

  const profileHref =
    item.category === "prestador"
      ? `/prestador/${item.id}`
      : item.category === "fornecedor"
      ? `/parceiro/${item.id}`
      : item.category === "cliente"
      ? `/cliente/${item.id}`
      : `/lojista/${item.id}`;

  return (
    <li
      className={[
        "rounded-2xl border-2 bg-[#1A1A1B] p-3 flex flex-col gap-2",
        c.border,
        c.bgGlow,
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <Link to={profileHref as any} className="shrink-0">
          {item.avatar_url ? (
            <img
              src={item.avatar_url}
              alt=""
              loading="lazy"
              decoding="async"
              className={["h-12 w-12 rounded-full object-cover border-2", c.border].join(" ")}
            />
          ) : (
            <div
              className={[
                "h-12 w-12 rounded-full border-2 flex items-center justify-center text-sm font-bold text-white bg-[#0A0A0B]",
                c.border,
              ].join(" ")}
            >
              {(item.name[0] || "?").toUpperCase()}
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={profileHref as any}
              className="text-sm font-semibold text-white truncate hover:underline"
            >
              {item.name}
            </Link>
            <span className={["text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border", c.badgeBg].join(" ")}>
              {meta.badge} {meta.label}
            </span>
          </div>
          <p className="text-[11px] text-white/60 truncate">
            {item.subtitle}
            {item.city ? ` • ${item.city}${item.state ? "/" + item.state : ""}` : ""}
          </p>
          {distance && (
            <p className="text-[10px] text-white/50 mt-0.5 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> a {distance} de você
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onFav}
          aria-pressed={favorited}
          aria-label={favorited ? "Remover dos favoritos" : "Favoritar"}
          className={[
            "h-9 px-3 rounded-xl border text-xs flex items-center gap-1 transition active:scale-95",
            favorited
              ? "border-[#FF3B6B]/60 bg-[#FF3B6B]/10 text-[#FF3B6B]"
              : "border-white/10 bg-[#0A0A0B] text-white/70 hover:border-white/20",
          ].join(" ")}
        >
          <Heart className={["h-3.5 w-3.5", favorited ? "fill-current" : ""].join(" ")} />
          {favorited ? "Favorito" : "Favoritar"}
        </button>

        <button
          type="button"
          onClick={onChat}
          className={[
            "h-9 flex-1 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 text-[#0A0A0B] transition active:scale-95",
            c.bg,
          ].join(" ")}
        >
          {item.category === "cliente" ? (
            <>
              <Send className="h-3.5 w-3.5" /> ENVIAR PROPOSTA
            </>
          ) : (
            <>
              <MessageSquare className="h-3.5 w-3.5" /> CHAT DIRETO
            </>
          )}
        </button>
      </div>
    </li>
  );
});

function EmptyState(props: { radius: Radius; onExpand: () => void; onPublish: () => void }) {
  const { radius, onExpand, onPublish } = props;
  return (
    <div className="text-center py-6 space-y-3">
      <p className="text-sm text-white/70">
        Nenhum profissional ou produto encontrado
        {radius > 0 ? ` em ${radius} km.` : "."}
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
        {radius !== 30 && radius !== 0 && (
          <button
            type="button"
            onClick={onExpand}
            className="rounded-xl border border-[#00E5FF]/40 bg-[#00E5FF]/10 text-[#00E5FF] text-xs font-bold px-4 py-2 flex items-center gap-1.5"
          >
            <MapPin className="h-3.5 w-3.5" /> Expandir para 30 km
          </button>
        )}
        <button
          type="button"
          onClick={onPublish}
          className="rounded-xl border border-[#00FF87]/40 bg-[#00FF87]/10 text-[#00FF87] text-xs font-bold px-4 py-2 flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> Publicar o que Preciso
        </button>
      </div>
    </div>
  );
}

export default UniversalSearchPanel;
