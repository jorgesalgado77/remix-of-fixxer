import { Zap, Calendar, Package, Radius, Hash, TagIcon, CreditCard } from "lucide-react";
import type { CSSProperties } from "react";

export type UrgencyTag = "urgente" | "normal" | "encomenda";

export const URGENCY_META: Record<
  UrgencyTag,
  { label: string; icon: typeof Zap; color: string; bg: string }
> = {
  urgente: { label: "Urgente / Hoje", icon: Zap, color: "#FF3B6B", bg: "rgba(255,59,107,0.14)" },
  normal: { label: "Normal", icon: Calendar, color: "#00E5FF", bg: "rgba(0,229,255,0.12)" },
  encomenda: { label: "Sob Encomenda", icon: Package, color: "#B084FF", bg: "rgba(176,132,255,0.14)" },
};

type Theme = {
  color?: CSSProperties;
  bgSoft?: CSSProperties;
  borderSoft?: CSSProperties;
  hex?: string;
};

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}

export function AdMetaBadges({
  urgency,
  radiusKm,
  tags,
  theme,
  compact = false,
  priceValue,
  originalValue,
  installments,
  installmentsInterestFree,
}: {
  urgency?: UrgencyTag | null;
  radiusKm?: number | null;
  tags?: string[] | null;
  theme?: Theme;
  compact?: boolean;
  priceValue?: number | null;
  originalValue?: number | null;
  installments?: number | null;
  installmentsInterestFree?: boolean | null;
}) {
  const items: React.ReactNode[] = [];
  if (urgency && URGENCY_META[urgency]) {
    const u = URGENCY_META[urgency];
    const Icon = u.icon;
    items.push(
      <span
        key="urg"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border"
        style={{ color: u.color, borderColor: `${u.color}55`, backgroundColor: u.bg }}
      >
        <Icon className="w-3 h-3" />
        {u.label}
      </span>,
    );
  }
  if (radiusKm && radiusKm > 0) {
    items.push(
      <span
        key="rad"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
        style={{ ...(theme?.bgSoft ?? {}), ...(theme?.color ?? {}), ...(theme?.borderSoft ?? {}) }}
      >
        <Radius className="w-3 h-3" />
        {radiusKm >= 999 ? "Toda a Região" : `${radiusKm} km`}
      </span>,
    );
  }
  const cleanTags = (tags ?? []).filter(Boolean).slice(0, compact ? 3 : 5);
  cleanTags.forEach((t, i) => {
    const label = t.startsWith("#") ? t : `#${t}`;
    items.push(
      <span
        key={`tag-${i}`}
        className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-white/5 border-white/10 text-white/70"
      >
        <Hash className="w-2.5 h-2.5" />
        {label.replace(/^#/, "")}
      </span>,
    );
  });
  if (items.length === 0) return null;
  return <div className="flex flex-wrap items-center gap-1.5">{items}</div>;
}

export function normalizeTagInput(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((t) => t.replace(/[^\p{L}\p{N}_-]+/gu, "").toLowerCase())
    .filter(Boolean)
    .slice(0, 5);
}
