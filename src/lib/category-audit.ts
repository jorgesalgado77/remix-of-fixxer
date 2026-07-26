/**
 * FIXXER — Auditoria de categorias / cores de usuários.
 *
 * Percorre todos os perfis conhecidos e valida se a categoria resolvida
 * (usada para pintar cor no chat e no perfil público) confere com a fonte
 * autoritativa (tabelas especializadas + profiles.role).
 *
 * Uso típico:
 *   const report = await auditProfileCategories();
 *   console.table(report.mismatches);
 *
 * O relatório inclui:
 *   - total de perfis lidos
 *   - contagem por categoria resolvida
 *   - lista de divergências (esperado × resolvido) com a origem do dado
 */
import { supabaseExternal } from "@/lib/supabaseExternal";
import {
  resolvePublicProfileCategory,
  categoryFromRow,
  clearPublicProfileCategoryCache,
  type PublicProfileCategory,
} from "@/lib/public-profile-category";
import { CATEGORY_LABEL, CATEGORY_COLORS } from "@/lib/category-colors";

export type AuditMismatch = {
  userId: string;
  displayName: string | null;
  expected: PublicProfileCategory | null;
  expectedSource: string;
  resolved: PublicProfileCategory;
  expectedColor: string | null;
  resolvedColor: string;
};

export type AuditReport = {
  scanned: number;
  byCategory: Record<PublicProfileCategory, number>;
  mismatches: AuditMismatch[];
  errors: Array<{ userId: string; error: string }>;
  finishedAt: string;
};

type ProgressCb = (done: number, total: number) => void;

async function collectSpecializedOwners(): Promise<Map<string, PublicProfileCategory>> {
  const owners = new Map<string, PublicProfileCategory>();
  const tables: Array<{ table: string; category: PublicProfileCategory }> = [
    { table: "provider_profiles", category: "prestador" },
    { table: "supplier_profiles", category: "fornecedor" },
    { table: "store_profiles", category: "lojista" },
  ];
  for (const { table, category } of tables) {
    try {
      const { data } = await supabaseExternal.from(table).select("user_id,id").limit(5000);
      for (const row of data ?? []) {
        const uid = (row as any).user_id || (row as any).id;
        if (uid && !owners.has(uid)) owners.set(uid, category);
      }
    } catch {
      // tabela opcional / RLS
    }
  }
  return owners;
}

async function collectProfilesTable(): Promise<Array<{ userId: string; name: string | null; row: any }>> {
  for (const table of ["profiles_public", "profiles"] as const) {
    try {
      const { data, error } = await supabaseExternal.from(table).select("*").limit(5000);
      if (!error && data && data.length) {
        return data
          .map((row: any) => {
            const uid = row.user_id || row.id;
            const name =
              row.display_name || row.full_name || row.company_name || row.social_name || row.name || null;
            return uid ? { userId: uid as string, name: (name as string) ?? null, row } : null;
          })
          .filter(Boolean) as Array<{ userId: string; name: string | null; row: any }>;
      }
    } catch {
      // segue para a próxima fonte
    }
  }
  return [];
}

export async function auditProfileCategories(options?: {
  onProgress?: ProgressCb;
  refresh?: boolean;
}): Promise<AuditReport> {
  if (options?.refresh) clearPublicProfileCategoryCache();

  const specialized = await collectSpecializedOwners();
  const profileRows = await collectProfilesTable();

  const allIds = new Set<string>([...specialized.keys(), ...profileRows.map((r) => r.userId)]);
  const rowsByUid = new Map(profileRows.map((r) => [r.userId, r] as const));

  const report: AuditReport = {
    scanned: 0,
    byCategory: { lojista: 0, prestador: 0, fornecedor: 0, cliente: 0 },
    mismatches: [],
    errors: [],
    finishedAt: "",
  };

  const total = allIds.size;
  let done = 0;

  for (const uid of allIds) {
    const row = rowsByUid.get(uid);
    try {
      // 1) Categoria "esperada" — fonte autoritativa priorizando tabelas especializadas.
      const specializedCat = specialized.get(uid) ?? null;
      const roleCat = row ? categoryFromRow(row.row) : null;
      const expected: PublicProfileCategory | null = specializedCat ?? roleCat;
      const expectedSource = specializedCat
        ? `specialized:${specializedCat}`
        : roleCat
          ? `profiles.role:${roleCat}`
          : "unknown";

      // 2) Categoria "resolvida" — mesma função usada por chat + perfil público.
      const resolved = await resolvePublicProfileCategory(uid, {
        profile: row?.row,
        refresh: options?.refresh,
      });

      report.scanned += 1;
      report.byCategory[resolved] += 1;

      if (expected && expected !== resolved) {
        report.mismatches.push({
          userId: uid,
          displayName: row?.name ?? null,
          expected,
          expectedSource,
          resolved,
          expectedColor: CATEGORY_COLORS[expected] ?? null,
          resolvedColor: CATEGORY_COLORS[resolved],
        });
      }
    } catch (e: any) {
      report.errors.push({ userId: uid, error: e?.message || String(e) });
    } finally {
      done += 1;
      options?.onProgress?.(done, total);
    }
  }

  report.finishedAt = new Date().toISOString();
  return report;
}

export function summarizeAudit(report: AuditReport): string {
  const lines: string[] = [];
  lines.push(`Auditoria de categorias — ${report.scanned} perfis analisados`);
  for (const cat of Object.keys(report.byCategory) as PublicProfileCategory[]) {
    lines.push(`  • ${CATEGORY_LABEL[cat]}: ${report.byCategory[cat]}`);
  }
  lines.push(`Divergências: ${report.mismatches.length}`);
  lines.push(`Erros: ${report.errors.length}`);
  return lines.join("\n");
}
