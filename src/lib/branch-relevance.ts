/**
 * Relevância por ramo de atividade — usado para tornar os carrosséis
 * "Prestadores e Parceiros" / "Lojistas e Fornecedores" inteligentes:
 * mostram por padrão apenas perfis cujo ramo (ou macro-categoria) bate
 * com o do usuário logado.
 *
 * Regra:
 *  - Coleta ramos do usuário via `normalizeBranches` (business_category + custom_branch).
 *  - Para cada ramo, resolve a Macro-Categoria via `findMacroForBranch`.
 *  - Score de um card:
 *      "exact"  → ramo/subcategoria idêntico a um dos do usuário
 *      "macro"  → macro-categoria em comum
 *      "none"   → sem afinidade
 */
import { useEffect, useState } from "react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { findMacroForBranch, normalizeBranches } from "@/lib/activity-branches";

export type Relevance = "exact" | "macro" | "none";

export type BranchContext = {
  userId: string | null;
  branches: string[];     // labels normalizados (business_category + custom)
  branchKeys: Set<string>; // lower-case p/ comparação
  macroIds: Set<string>;   // ids das macro-categorias resolvidas
  hasContext: boolean;     // true se pelo menos 1 ramo detectado
};

const EMPTY: BranchContext = {
  userId: null,
  branches: [],
  branchKeys: new Set(),
  macroIds: new Set(),
  hasContext: false,
};

function buildContext(uid: string | null, business_category: string | null, custom_branch: string | null): BranchContext {
  const branches = normalizeBranches({ business_category, custom_branch });
  const branchKeys = new Set<string>();
  const macroIds = new Set<string>();
  for (const b of branches) {
    const k = b.trim().toLowerCase();
    if (!k) continue;
    branchKeys.add(k);
    const macro = findMacroForBranch(b);
    if (macro) macroIds.add(macro.id);
  }
  return {
    userId: uid,
    branches,
    branchKeys,
    macroIds,
    hasContext: branches.length > 0,
  };
}

/** Compara os ramos de um card ao contexto do usuário logado. */
export function scoreRelevance(
  partnerBranches: Array<string | null | undefined>,
  ctx: BranchContext,
): Relevance {
  if (!ctx.hasContext) return "none";
  let hasMacro = false;
  for (const raw of partnerBranches) {
    const b = (raw ?? "").trim();
    if (!b) continue;
    if (ctx.branchKeys.has(b.toLowerCase())) return "exact";
    const macro = findMacroForBranch(b);
    if (macro && ctx.macroIds.has(macro.id)) hasMacro = true;
  }
  return hasMacro ? "macro" : "none";
}

/**
 * Hook: descobre o contexto de ramo do usuário logado (uma vez por sessão).
 * Retorna `EMPTY` enquanto carrega ou quando não há sessão.
 */
export function useUserBranchContext(): BranchContext {
  const [ctx, setCtx] = useState<BranchContext>(EMPTY);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: auth } = await supabaseExternal.auth.getUser();
        const uid = auth?.user?.id ?? null;
        if (!uid) { if (!cancelled) setCtx(EMPTY); return; }
        const { data } = await supabaseExternal
          .from("profiles")
          .select("business_category, custom_branch")
          .eq("id", uid)
          .maybeSingle();
        if (cancelled) return;
        setCtx(buildContext(uid, (data as any)?.business_category ?? null, (data as any)?.custom_branch ?? null));
      } catch {
        if (!cancelled) setCtx(EMPTY);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return ctx;
}
