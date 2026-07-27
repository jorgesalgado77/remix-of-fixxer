/**
 * Relevância por ramo de atividade — motor unificado usado em toda a app
 * (carrosséis, sugestões B2B e feeds) para responder à pergunta:
 * "esta card faz sentido para o ramo do usuário logado?"
 *
 * Níveis de score (do mais forte ao mais fraco):
 *   "exact"        → ramo ou subcategoria idêntica ao do usuário
 *   "subcategory"  → subcategoria da mesma macro que o usuário priorizou
 *                    em preferred_subcategories
 *   "macro"        → mesma macro-categoria
 *   "none"         → nenhuma afinidade
 *
 * A função retorna um objeto rico ({ level, matchedBranch, reason }) usado
 * pelo `<RelevanceBadge>` para explicar em tooltip por que o card apareceu.
 * `scoreRelevance` foi mantida com retorno string para compatibilidade com
 * o código existente.
 */
import { useEffect, useState } from "react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import {
  ACTIVITY_MATRIX,
  findMacroForBranch,
  normalizeBranches,
} from "@/lib/activity-branches";

export type Relevance = "exact" | "subcategory" | "macro" | "none";

export type RelevanceResult = {
  level: Relevance;
  matchedBranch: string | null;
  /** Frase curta, pt-BR, explicando por que o card foi recomendado. */
  reason: string | null;
};

export type BranchContext = {
  userId: string | null;
  branches: string[];
  branchKeys: Set<string>;
  macroIds: Set<string>;
  /** Nome legível da macro principal (para tooltips). */
  macroLabels: Map<string, string>;
  /** Subcategorias marcadas como prioritárias no perfil. */
  preferredSubs: Set<string>;
  /** Preferência do usuário: se `false`, filtro "🎯 Do meu ramo" fica desligado. */
  filterEnabled: boolean;
  hasContext: boolean;
};

const EMPTY: BranchContext = {
  userId: null,
  branches: [],
  branchKeys: new Set(),
  macroIds: new Set(),
  macroLabels: new Map(),
  preferredSubs: new Set(),
  filterEnabled: true,
  hasContext: false,
};

function buildContext(
  uid: string | null,
  business_category: string | null,
  custom_branch: string | null,
  preferredSubs: string[] | null,
  filterEnabled: boolean,
): BranchContext {
  const branches = normalizeBranches({ business_category, custom_branch });
  const branchKeys = new Set<string>();
  const macroIds = new Set<string>();
  const macroLabels = new Map<string, string>();
  for (const b of branches) {
    const k = b.trim().toLowerCase();
    if (!k) continue;
    branchKeys.add(k);
    const macro = findMacroForBranch(b);
    if (macro) {
      macroIds.add(macro.id);
      macroLabels.set(macro.id, macro.label);
    }
  }
  const subs = new Set<string>();
  for (const s of preferredSubs ?? []) {
    const k = String(s ?? "").trim().toLowerCase();
    if (k) subs.add(k);
  }
  return {
    userId: uid,
    branches,
    branchKeys,
    macroIds,
    macroLabels,
    preferredSubs: subs,
    filterEnabled,
    hasContext: branches.length > 0 && filterEnabled,
  };
}

/**
 * Descobre se um dos ramos do card cai dentro de alguma subcategoria da(s)
 * macro(s) do usuário — mesmo sem match textual direto. Ex.: usuário =
 * "Barbearia", card = "Colorimetria" (subcategoria de "Salão de Beleza")
 * dentro da mesma macro "Estética".
 */
function findSubcategoryMatch(
  cardBranches: string[],
  ctx: BranchContext,
): { label: string; macroLabel: string } | null {
  if (ctx.macroIds.size === 0) return null;
  const cardKeys = new Set(cardBranches.map((b) => b.trim().toLowerCase()).filter(Boolean));
  for (const macro of ACTIVITY_MATRIX) {
    if (!ctx.macroIds.has(macro.id)) continue;
    for (const branch of macro.branches) {
      const subs = branch.subcategories ?? [];
      for (const sub of subs) {
        const k = sub.toLowerCase();
        if (cardKeys.has(k) || ctx.preferredSubs.has(k)) {
          return { label: sub, macroLabel: macro.label };
        }
      }
    }
  }
  return null;
}

/**
 * Versão rica de scoreRelevance — retorna nível + ramo casado + razão em
 * pt-BR pronta para o tooltip.
 */
export function scoreRelevanceDetailed(
  partnerBranches: Array<string | null | undefined>,
  ctx: BranchContext,
): RelevanceResult {
  if (!ctx.hasContext) return { level: "none", matchedBranch: null, reason: null };
  const clean = partnerBranches
    .map((b) => (b ?? "").trim())
    .filter(Boolean);

  // 1) exact
  for (const b of clean) {
    if (ctx.branchKeys.has(b.toLowerCase())) {
      return {
        level: "exact",
        matchedBranch: b,
        reason: `Mesmo ramo do seu perfil: ${b}`,
      };
    }
  }

  // 2) preferred subcategory (ou subcategoria da macro em comum)
  const subMatch = findSubcategoryMatch(clean, ctx);
  if (subMatch) {
    return {
      level: "subcategory",
      matchedBranch: subMatch.label,
      reason: `Subcategoria próxima: ${subMatch.label} (${subMatch.macroLabel})`,
    };
  }

  // 3) macro
  for (const b of clean) {
    const macro = findMacroForBranch(b);
    if (macro && ctx.macroIds.has(macro.id)) {
      return {
        level: "macro",
        matchedBranch: b,
        reason: `Setor afim: ${macro.label}`,
      };
    }
  }

  return { level: "none", matchedBranch: null, reason: null };
}

/** Compatível com o código antigo — retorna apenas o nível. */
export function scoreRelevance(
  partnerBranches: Array<string | null | undefined>,
  ctx: BranchContext,
): Relevance {
  return scoreRelevanceDetailed(partnerBranches, ctx).level;
}

/** Peso numérico p/ sort estável. Menor = mais relevante. */
export function relevanceRank(level: Relevance): number {
  switch (level) {
    case "exact": return 0;
    case "subcategory": return 1;
    case "macro": return 2;
    default: return 3;
  }
}

/**
 * Fallback inteligente: se após filtrar por `minLevel` sobram menos de
 * `minCount` itens, devolve todos ordenados por relevância (para não deixar
 * a seção vazia em nichos pequenos).
 */
export function applyRelevanceFallback<T extends { _relevance: RelevanceResult }>(
  items: T[],
  minCount = 3,
): T[] {
  const strict = items.filter((i) => i._relevance.level !== "none");
  if (strict.length >= minCount) return strict;
  return [...items].sort(
    (a, b) => relevanceRank(a._relevance.level) - relevanceRank(b._relevance.level),
  );
}

/**
 * Hook: descobre contexto de ramo do usuário logado. Reage a
 * `fixxer:identity-change` e `fixxer:profile-updated` (disparado quando o
 * usuário altera preferências no perfil).
 */
export function useUserBranchContext(): BranchContext {
  const [ctx, setCtx] = useState<BranchContext>(EMPTY);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data: auth } = await supabaseExternal.auth.getUser();
        const uid = auth?.user?.id ?? null;
        if (!uid) { if (!cancelled) setCtx(EMPTY); return; }

        // Tenta ler com preferências novas. Se as colunas ainda não existem
        // no banco (SQL não aplicado), refaz o SELECT com o schema antigo.
        let bc: string | null = null;
        let cb: string | null = null;
        let subs: string[] | null = null;
        let enabled = true;
        try {
          const { data, error } = await supabaseExternal
            .from("profiles")
            .select("business_category, custom_branch, preferred_subcategories, branch_filter_enabled")
            .eq("id", uid)
            .maybeSingle();
          if (error) throw error;
          bc = (data as any)?.business_category ?? null;
          cb = (data as any)?.custom_branch ?? null;
          subs = ((data as any)?.preferred_subcategories as string[] | null) ?? null;
          const raw = (data as any)?.branch_filter_enabled;
          if (raw === false) enabled = false;
        } catch {
          const { data } = await supabaseExternal
            .from("profiles")
            .select("business_category, custom_branch")
            .eq("id", uid)
            .maybeSingle();
          bc = (data as any)?.business_category ?? null;
          cb = (data as any)?.custom_branch ?? null;
        }

        if (cancelled) return;
        setCtx(buildContext(uid, bc, cb, subs, enabled));
      } catch {
        if (!cancelled) setCtx(EMPTY);
      }
    };

    load();
    const handler = () => load();
    if (typeof window !== "undefined") {
      window.addEventListener("fixxer:identity-change", handler);
      window.addEventListener("fixxer:profile-updated", handler);
    }
    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("fixxer:identity-change", handler);
        window.removeEventListener("fixxer:profile-updated", handler);
      }
    };
  }, []);

  return ctx;
}
