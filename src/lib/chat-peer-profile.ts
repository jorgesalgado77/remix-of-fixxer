/**
 * FIXXER — Resolução centralizada do perfil do destinatário do chat.
 *
 * Estratégia (com cache em memória):
 *   1) profiles_public por id/user_id (view segura; não quebra com RLS da tabela privada)
 *   2) profiles por id/user_id (quando a política permitir)
 *   3) custom_sections.__extras (display_name / avatar)
 *   4) provider_profiles / store_profiles (foto e nome públicos por categoria)
 *
 * Retorna SEMPRE um objeto renderizável (name + initials), mesmo em falha.
 */
import { supabaseExternal } from "@/lib/supabaseExternal";
import { primePublicProfileCategory, type PublicProfileCategory } from "@/lib/public-profile-category";

export type PeerProfile = {
  id: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  role: string | null;
  isFallback: boolean;
  source: string[]; // origens dos dados encontrados (para diagnóstico)
  diagnostics: string[];
};

const CACHE = new Map<string, { at: number; value: PeerProfile }>();
const TTL_MS = 60_000;
function isDebugEnabled() {
  if (typeof window === "undefined") return false;
  try {
    return (window as any).__FIXXER_CHAT_DEBUG__ === true || window.localStorage.getItem("fixxer_chat_debug") === "1";
  } catch {
    return (window as any).__FIXXER_CHAT_DEBUG__ === true;
  }
}

export function initialsOf(name: string): string {
  const clean = String(name || "").trim();
  if (!clean) return "?";
  const parts = clean.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || clean[0]!.toUpperCase();
}

export function fallbackPeer(peerId: string): PeerProfile {
  return {
    id: peerId,
    name: "Conversa",
    initials: "C",
    avatarUrl: null,
    role: null,
    isFallback: true,
    source: ["fallback"],
    diagnostics: ["fallback: nenhum dado público de perfil encontrado"],
  };
}

export function clearPeerCache(peerId?: string) {
  if (peerId) CACHE.delete(peerId);
  else CACHE.clear();
}

function firstText(...values: unknown[]): string | undefined {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text && text.toLowerCase() !== "null" && text.toLowerCase() !== "undefined") return text;
  }
  return undefined;
}

function firstUrl(...values: unknown[]): string | undefined {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (/^(https?:|blob:|data:image\/)/i.test(text)) return text;
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" ? (value as Record<string, any>) : {};
}

function pickFromExtras(extras: any): { name?: string; avatar?: string; role?: string } {
  if (!extras || typeof extras !== "object") return {};
  const name = firstText(
    extras.display_name,
    extras.displayName,
    extras.full_name,
    extras.company_name,
    extras.social_name,
    extras.name,
    extras.responsible_name,
  );
  const avatar = firstUrl(
    extras.avatar_url,
    extras.photo_url,
    extras.profile_photo_url,
    extras.profile_photo,
    extras.profile_image_url,
    extras.profile_image,
    extras.image_url,
    extras.logo_url,
    extras.avatar,
  );
  const role = firstText(extras.role, extras.user_type, extras.category);
  return { name, avatar, role };
}

function absorbRow(
  row: any,
  label: string,
  current: { name: string; avatarUrl: string | null; role: string | null; ownerUid: string | null },
  source: string[],
  diagnostics: string[],
) {
  const r = asRecord(row);
  if (!Object.keys(r).length) return current;

  diagnostics.push(`${label}: campos encontrados [${Object.keys(r).sort().join(", ")}]`);

  const extras = pickFromExtras(asRecord(r.custom_sections).__extras ?? r.__extras ?? r.extras);
  const name = firstText(
    r.display_name,
    r.full_name,
    r.company_name,
    r.social_name,
    r.name,
    r.responsible_name,
    extras.name,
  );
  const avatar = firstUrl(
    r.avatar_url,
    r.photo_url,
    r.profile_photo_url,
    r.profile_image_url,
    r.image_url,
    r.logo_url,
    r.avatar,
    extras.avatar,
  );
  const role = firstText(r.role, r.user_type, r.category, r.profile_type, extras.role);
  const ownerUid = firstText(r.user_id, r.owner_id, r.auth_user_id, r.id);

  if (!current.name && name) {
    current.name = name;
    source.push(`${label}.name`);
  }
  if (!current.avatarUrl && avatar) {
    current.avatarUrl = avatar;
    source.push(`${label}.avatar`);
  }
  if (!current.role && role) {
    current.role = role;
    source.push(`${label}.role`);
  }
  if (!current.ownerUid && ownerUid) current.ownerUid = ownerUid;
  return current;
}

async function querySingle(table: string, column: string, value: string, diagnostics: string[]) {
  try {
    const { data, error } = await supabaseExternal.from(table).select("*").eq(column, value).maybeSingle();
    if (error) {
      diagnostics.push(`${table}.${column}: ${error.message}`);
      return null;
    }
    if (!data) diagnostics.push(`${table}.${column}: sem linha`);
    return data ?? null;
  } catch (e: any) {
    diagnostics.push(`${table}.${column}: exceção ${e?.message || String(e)}`);
    return null;
  }
}

export async function resolvePeerProfile(peerId: string, options?: { refresh?: boolean }): Promise<PeerProfile> {
  if (!peerId) return fallbackPeer("");
  const cached = CACHE.get(peerId);
  if (!options?.refresh && cached && Date.now() - cached.at < TTL_MS) return cached.value;

  const source: string[] = [];
  const diagnostics: string[] = [];
  let current = { name: "", avatarUrl: null as string | null, role: null as string | null, ownerUid: null as string | null };

  // O `peerId` do chat é o UUID do auth.users. Por isso, priorizamos
  // user_id antes de id para não confundir o dono do perfil com o id interno
  // da linha/perfil.
  // A view pública é a primeira fonte porque a tabela `profiles` pode estar
  // corretamente protegida por RLS e bloquear leitura direta de terceiros.
  for (const [table, columns] of [
    ["profiles_public", ["user_id", "id"]],
    ["profiles", ["user_id", "id"]],
  ] as const) {
    for (const column of columns) {
      if (current.name && current.avatarUrl && current.role && current.ownerUid) break;
      const row = await querySingle(table, column, peerId, diagnostics);
      if (row) {
        source.push(`${table}.${column}`);
        current = absorbRow(row, `${table}.${column}`, current, source, diagnostics);
      }
    }
  }

  const owner = current.ownerUid || peerId;
  // Consulta todas as tabelas especializadas — elas são a fonte autoritativa
  // de categoria. Qualquer valor genérico em profiles.role ("user", "usuario")
  // NÃO deve sobrescrever a categoria real derivada da tabela específica.
  let storeHit = false;
  let providerHit = false;
  let supplierHit = false;
  for (const [table, columns] of [
    ["provider_profiles", ["user_id", "id"]],
    ["store_profiles", ["user_id", "id"]],
    ["supplier_profiles", ["user_id", "id"]],
  ] as const) {
    for (const column of columns) {
      const row = await querySingle(table, column, owner, diagnostics);
      if (row) {
        source.push(`${table}.${column}`);
        if (table === "store_profiles") storeHit = true;
        if (table === "provider_profiles") providerHit = true;
        if (table === "supplier_profiles") supplierHit = true;
        current = absorbRow(row, `${table}.${column}`, current, source, diagnostics);
        break;
      }
    }
  }

  // Override autoritativo: a existência de uma linha em
  // store/provider/supplier_profiles é o sinal mais confiável de categoria —
  // sobrepõe qualquer role genérico do profiles ("user", "usuario", etc.).
  if (providerHit) current.role = "prestador";
  else if (supplierHit) current.role = "fornecedor";
  else if (storeHit) current.role = "lojista";


  const finalName = current.name || "Conversa";

  const result: PeerProfile = {
    id: peerId,
    name: finalName,
    initials: initialsOf(finalName),
    avatarUrl: current.avatarUrl || null,
    role: current.role,
    isFallback: source.length === 0,
    source: source.length ? source : ["fallback"],
    diagnostics,
  };
  if (isDebugEnabled()) console.info("[chat-peer] resolved", peerId, result);
  // Não cacheia fallback puro para permitir recuperação imediata após ajuste de RLS/dados.
  if (source.length) CACHE.set(peerId, { at: Date.now(), value: result });
  return result;
}
