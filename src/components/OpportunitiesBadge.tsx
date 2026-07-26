/**
 * FIXXER — Banner de Oportunidades Próximas (dados reais).
 * ---------------------------------------------------------
 * • Consulta a tabela `profiles` no Supabase externo e conta perfis
 *   reais da categoria-alvo dentro do raio configurado do usuário.
 * • Aparece com paleta VERMELHO→LARANJA pulsante para maximizar
 *   atenção (substitui o antigo badge estático em ciano).
 * • Clique navega para o feed correspondente ao alvo.
 *
 * Uso: colocar dentro do `badgeSlot` do `FeedFiltersBar` em cada feed.
 */

import { memo, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Flame, ChevronRight } from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { cityCoords, useUserCoords } from "@/lib/geo-distance";
import { haversineKm } from "@/lib/activity-branches";

type SourceCategory = "lojista" | "prestador" | "cliente" | "fornecedor";

type Config = {
  targetPath: string;
  labelSingular: string;
  labelPlural: string;
  emoji: string;
  targetMatch: (raw: string) => boolean;
};

const CONFIG: Record<SourceCategory, Config> = {
  lojista: {
    targetPath: "/feed/cliente",
    labelSingular: "Nova Oportunidade de Cliente Final",
    labelPlural: "Novas Oportunidades de Clientes Finais",
    emoji: "🔥",
    targetMatch: (s) => /client|customer|final/i.test(s),
  },
  prestador: {
    targetPath: "/feed/cliente",
    labelSingular: "O.S. aberta de Cliente",
    labelPlural: "O.S. abertas de Clientes",
    emoji: "⚡",
    targetMatch: (s) => /client|customer|final/i.test(s),
  },
  cliente: {
    targetPath: "/feed/lojista",
    labelSingular: "Loja verificada próxima",
    labelPlural: "Lojas verificadas próximas",
    emoji: "🌟",
    targetMatch: (s) => /lojista|loja|store/i.test(s),
  },
  fornecedor: {
    targetPath: "/feed/lojista",
    labelSingular: "Lojista buscando orçamento",
    labelPlural: "Lojistas buscando orçamentos",
    emoji: "📦",
    targetMatch: (s) => /lojista|loja|store/i.test(s),
  },
};

const DEFAULT_RADIUS_KM = 15;

function readRadius(): number {
  if (typeof window === "undefined") return DEFAULT_RADIUS_KM;
  const v = Number(window.localStorage.getItem("fixxer_radius_km"));
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_RADIUS_KM;
}

export const OpportunitiesBadge = memo(function OpportunitiesBadge(props: {
  category: SourceCategory;
}) {
  const cfg = CONFIG[props.category];
  const userCoords = useUserCoords();
  const [count, setCount] = useState<number | null>(null);
  const [cityLabel, setCityLabel] = useState<string | null>(null);
  const [radius, setRadius] = useState<number>(() => readRadius());

  // Sincroniza raio quando outro componente dispara evento global.
  useEffect(() => {
    const onRadius = () => setRadius(readRadius());
    if (typeof window === "undefined") return;
    window.addEventListener("fixxer:radius-change", onRadius);
    return () => window.removeEventListener("fixxer:radius-change", onRadius);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Descobre localização do usuário via profile (fallback quando o
        // geolocation do browser ainda não respondeu).
        let origin = userCoords;
        let city: string | null = null;
        let state: string | null = null;
        try {
          const { data: auth } = await supabaseExternal.auth.getUser();
          const uid = auth?.user?.id;
          if (uid) {
            const { data: me } = await supabaseExternal
              .from("profiles")
              .select("lat, lng, city, state")
              .eq("id", uid)
              .maybeSingle();
            if (me?.city) city = String(me.city);
            if (me?.state) state = String(me.state);
            if (!origin && me?.lat != null && me?.lng != null) {
              origin = { lat: Number(me.lat), lng: Number(me.lng) };
            }
            if (!origin) {
              const c = cityCoords(city);
              if (c) origin = c;
            }
          }
        } catch {
          /* silencioso */
        }
        if (cancelled) return;
        if (city || state) {
          setCityLabel([city, state].filter(Boolean).join("/"));
        }

        // Puxa candidatos reais e filtra por categoria + raio.
        const { data, error } = await supabaseExternal
          .from("profiles")
          .select("id, category, role, lat, lng, city")
          .limit(500);
        if (error) throw error;
        if (cancelled) return;

        const now = Date.now();
        void now;
        let matched = 0;
        for (const row of (data ?? []) as any[]) {
          const catRaw = String(row.category ?? row.role ?? "");
          if (!cfg.targetMatch(catRaw)) continue;
          let d: number | null = null;
          if (origin) {
            if (row.lat != null && row.lng != null) {
              d = haversineKm(origin, { lat: Number(row.lat), lng: Number(row.lng) });
            } else {
              const c = cityCoords(row.city);
              if (c) d = haversineKm(origin, c);
            }
          }
          if (d == null || d <= radius) matched++;
        }
        if (!cancelled) setCount(matched);
      } catch {
        if (!cancelled) setCount(0);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cfg, radius, userCoords]);

  const label = useMemo(() => {
    if (count == null) return "Buscando oportunidades próximas…";
    if (count === 0) {
      return `Nenhuma oportunidade nova em ${radius} km${cityLabel ? " (" + cityLabel + ")" : ""}`;
    }
    const noun = count === 1 ? cfg.labelSingular : cfg.labelPlural;
    return `${count} ${noun} a menos de ${radius} km${cityLabel ? " (" + cityLabel + ")" : " de você"}`;
  }, [count, cfg, radius, cityLabel]);

  const disabled = count === 0 || count == null;

  return (
    <div className="w-full px-3 sm:px-4 pb-2">
      <Link
        to={cfg.targetPath as any}
        aria-label={label}
        className={[
          "group relative w-full flex items-center gap-2 rounded-2xl px-3 py-2.5 text-[12px] font-black text-white",
          "border-2 border-[#FF3B30] bg-gradient-to-r from-[#FF3B30]/25 via-[#FF6B00]/20 to-[#FFB800]/15",
          "shadow-[0_0_18px_rgba(255,59,48,0.35)] hover:shadow-[0_0_28px_rgba(255,107,0,0.55)]",
          "transition-shadow overflow-hidden",
          disabled ? "pointer-events-none opacity-70" : "",
        ].join(" ")}
      >
        {/* Pulso de fundo para chamar atenção */}
        {!disabled && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-2xl bg-[#FF3B30]/10 animate-pulse pointer-events-none"
          />
        )}
        <span
          aria-hidden
          className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FF3B30] text-white shadow-[0_0_12px_rgba(255,59,48,0.85)]"
        >
          <Flame className="h-4 w-4" />
        </span>
        <span className="relative leading-tight flex-1">
          <span className="mr-1">{cfg.emoji}</span>
          {label}
        </span>
        {!disabled && (
          <ChevronRight className="relative h-4 w-4 shrink-0 text-white/90 transition-transform group-hover:translate-x-0.5" />
        )}
      </Link>
    </div>
  );
});

export default OpportunitiesBadge;
