import { supabaseExternal } from "@/lib/supabaseExternal";
import type { CategoryKey } from "@/lib/category-colors";

export type PublicProfileCategory = Exclude<CategoryKey, "admin">;

const CATEGORY_VALUES: PublicProfileCategory[] = ["lojista", "prestador", "fornecedor", "cliente"];

export function categoryFromProfilePath(pathname: string): PublicProfileCategory | null {
  const p = String(pathname || "").toLowerCase();
  if (p.startsWith("/prestador/") || p.startsWith("/perfil/prestador")) return "prestador";
  if (p.startsWith("/parceiro/") || p.startsWith("/fornecedor/") || p.startsWith("/perfil/parceiro") || p.startsWith("/perfil/fornecedor")) return "fornecedor";
  if (p.startsWith("/cliente/") || p.startsWith("/perfil/cliente")) return "cliente";
  if (p.startsWith("/lojista/") || p.startsWith("/perfil/lojista")) return "lojista";
  return null;
}

export function publicProfilePathFor(category: PublicProfileCategory, id: string): string {
  const enc = encodeURIComponent(id);
  if (category === "prestador") return `/prestador/${enc}`;
  if (category === "fornecedor") return `/parceiro/${enc}`;
  if (category === "cliente") return `/cliente/${enc}`;
  return `/lojista/${enc}`;
}

function cleanText(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function categoryFromRoleText(...values: unknown[]): PublicProfileCategory | null {
  const text = values.map(cleanText).filter(Boolean).join(" ");
  if (!text) return null;

  if (text.includes("prestador") || text.includes("provider") || text.includes("servi")) return "prestador";
  if (text.includes("fornec") || text.includes("parceiro") || text.includes("b2b") || text.includes("supplier")) return "fornecedor";
  if (text.includes("lojista") || text.includes("store") || text.includes("loja")) return "lojista";
  if (text.includes("cliente") || text.includes("customer") || text.includes("casual") || text.includes("final")) return "cliente";

  // Removido: mapeamento de "user/usuario" → cliente. Esse fallback textual
  // se sobrepunha a fontes mais confiáveis (tabelas especializadas / rota
  // visitada) e classificava lojistas/prestadores antigos como cliente.
  return null;
}

export function categoryFromRow(row: any): PublicProfileCategory | null {
  if (!row || typeof row !== "object") return null;
  const extras = row?.custom_sections?.__extras || row?.__extras || row?.extras || {};
  return categoryFromRoleText(
    row.role,
    row.user_type,
    row.category,
    row.profile_type,
    row.business_category,
    extras.role,
    extras.user_type,
    extras.category,
    extras.profile_type,
  );
}

async function queryProfileCategory(table: string, id: string): Promise<PublicProfileCategory | null> {
  for (const column of ["user_id", "id"] as const) {
    try {
      const { data, error } = await supabaseExternal
        .from(table)
        .select("*")
        .eq(column, id)
        .limit(1)
        .maybeSingle();
      if (!error && data) {
        const category = categoryFromRow(data);
        if (category) return category;
      }
    } catch {
      // View/tabela opcional ou bloqueada por RLS: segue para a próxima fonte.
    }
  }
  return null;
}

async function hasSpecializedRow(table: string, id: string): Promise<boolean> {
  for (const column of ["user_id", "id"] as const) {
    try {
      const { data, error } = await supabaseExternal
        .from(table)
        .select(column)
        .eq(column, id)
        .limit(1)
        .maybeSingle();
      if (!error && data) return true;
    } catch {
      // Tabela opcional ou bloqueada por RLS: ignora.
    }
  }
  return false;
}

export async function resolvePublicProfileCategory(
  userId: string,
  options?: { profile?: any; routeHint?: PublicProfileCategory | null },
): Promise<PublicProfileCategory> {
  // Tabelas especializadas são a fonte autoritativa visual. Elas corrigem
  // cadastros antigos em que profiles.role ficou genérico ou incorreto.
  const specialized: Array<{ table: string; category: PublicProfileCategory }> = [
    { table: "provider_profiles", category: "prestador" },
    { table: "supplier_profiles", category: "fornecedor" },
    { table: "store_profiles", category: "lojista" },
  ];
  for (const source of specialized) {
    if (await hasSpecializedRow(source.table, userId)) return source.category;
  }

  const fromLoadedProfile = categoryFromRow(options?.profile);
  if (fromLoadedProfile) return fromLoadedProfile;

  // Fallback quando a política/RLS não permite ler as tabelas especializadas.
  for (const table of ["profiles_public", "profiles"] as const) {
    const category = await queryProfileCategory(table, userId);
    if (category) return category;
  }

  return options?.routeHint && CATEGORY_VALUES.includes(options.routeHint)
    ? options.routeHint
    : "cliente";
}