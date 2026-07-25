import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, ChevronRight, Handshake, EyeOff, Eye } from "lucide-react";

const DISMISS_KEY = "fixxer_b2b_suggestions_dismissed_v1";

function readDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDismissed(v: boolean) {
  try {
    if (v) window.localStorage.setItem(DISMISS_KEY, "1");
    else window.localStorage.removeItem(DISMISS_KEY);
    window.dispatchEvent(
      new CustomEvent("fixxer:b2b-suggestions-visibility", { detail: { dismissed: v } }),
    );
  } catch {
    /* noop */
  }
}

import { supabaseExternal } from "@/lib/supabaseExternal";
import {
  getB2BSuggestions,
  normalizeBranches,
  type B2BCandidate,
  type B2BSuggestion,
} from "@/lib/activity-branches";
import { useCurrentCategory } from "@/lib/user-category";
import { getCategoryTheme } from "@/lib/category-colors";

const DEFAULT_RADIUS_KM = 25;

function readRadius(): number {
  if (typeof window === "undefined") return DEFAULT_RADIUS_KM;
  const v = Number(window.localStorage.getItem("fixxer_radius_km"));
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_RADIUS_KM;
}

/**
 * Card compacto que sugere parcerias B2B cruzadas com base nos ramos
 * salvos no perfil do usuário (incluindo ramos customizados). Filtra
 * candidatos reais pelo raio de atuação e reordena por recência.
 */
function B2BSuggestionsCardInner() {
  const [suggestions, setSuggestions] = useState<B2BSuggestion[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const category = useCurrentCategory();
  const theme = getCategoryTheme(category);
  const branchesRef = useRef<string[]>([]);
  const userLocRef = useRef<{ lat: number; lng: number } | null>(null);
  const candidatesRef = useRef<B2BCandidate[]>([]);

  const recompute = useCallback(() => {
    const radiusKm = readRadius();
    const list = getB2BSuggestions(branchesRef.current, {
      radiusKm,
      userLocation: userLocRef.current,
      candidates: candidatesRef.current,
    }).slice(0, 4);
    setSuggestions(list);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: auth } = await supabaseExternal.auth.getUser();
        const uid = auth?.user?.id;
        if (!uid) return;
        const { data: p } = await supabaseExternal
          .from("profiles")
          .select("business_category, custom_branch, lat, lng, service_radius_km")
          .eq("id", uid)
          .maybeSingle();
        if (cancelled) return;
        branchesRef.current = normalizeBranches(p ?? undefined);
        if (p?.lat != null && p?.lng != null) {
          userLocRef.current = { lat: Number(p.lat), lng: Number(p.lng) };
        }
        // Candidatos reais: profiles com lat/lng e business_category preenchidos
        try {
          const { data: cands } = await supabaseExternal
            .from("profiles")
            .select("id, company_name, full_name, business_category, lat, lng, updated_at")
            .not("business_category", "is", null)
            .not("lat", "is", null)
            .not("lng", "is", null)
            .neq("id", uid)
            .limit(80);
          if (!cancelled && Array.isArray(cands)) {
            const flat: B2BCandidate[] = [];
            for (const row of cands as any[]) {
              const branches = String(row.business_category ?? "")
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean);
              for (const br of branches) {
                flat.push({
                  title: (row.company_name || row.full_name || "Parceiro FIXXER") + " — " + br,
                  targetBranch: br,
                  lat: row.lat,
                  lng: row.lng,
                  updatedAt: row.updated_at,
                });
              }
            }
            candidatesRef.current = flat;
          }
        } catch {
          /* sem candidatos reais — usa fallback estático */
        }
        if (!cancelled) recompute();
      } catch {
        /* silencioso — sem sugestões */
      }
    })();

    const onRadiusChange = () => recompute();
    if (typeof window !== "undefined") {
      window.addEventListener("fixxer:radius-change", onRadiusChange);
    }
    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("fixxer:radius-change", onRadiusChange);
      }
    };
  }, [recompute]);

  if (dismissed || suggestions.length === 0) return null;

  return (
    <div
      className="rounded-2xl p-3 space-y-2 border"
      style={{
        borderColor: `${theme.hex}33`,
        background: `linear-gradient(135deg, ${theme.hex}0F, transparent 70%)`,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${theme.hex}22`, color: theme.hex }}
          >
            <Handshake className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-tight truncate">
              Rede de Afiliados B2B
            </p>
            <p className="text-[9px] text-white/50 truncate">
              Parcerias sugeridas para o seu ramo
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-[9px] font-black uppercase text-white/40 hover:text-white/70 shrink-0"
          aria-label="Fechar sugestões"
        >
          Ocultar
        </button>
      </div>

      <div className="grid gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s.title}
            className="w-full text-left bg-white/[0.03] hover:bg-white/[0.06] active:bg-white/[0.08] rounded-xl px-2.5 py-2 flex items-center gap-2 transition-colors"
          >
            <span className="text-base shrink-0">{s.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-white truncate">{s.title}</p>
              <p className="text-[9px] text-white/50 truncate flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" style={{ color: theme.hex }} />
                {s.hint}
              </p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-white/30 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

export const B2BSuggestionsCard = memo(B2BSuggestionsCardInner);

