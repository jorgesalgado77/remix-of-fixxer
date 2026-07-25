/**
 * FIXXER — Resolução centralizada do perfil do destinatário do chat.
 *
 * Estratégia (com cache em memória):
 *   1) profiles por id
 *   2) profiles por user_id
 *   3) custom_sections.__extras (display_name / avatar)
 *   4) store_profiles (logo_url / company_name / display_name)
 *
 * Retorna SEMPRE um objeto renderizável (name + initials), mesmo em falha.
 */
import { supabaseExternal } from "@/lib/supabaseExternal";

export type PeerProfile = {
  id: string;
  name: string;
  initials: string;
  avatarUrl: string | null;
  role: string | null;
  source: string[]; // origens dos dados encontrados (para diagnóstico)
};

const CACHE = new Map<string, { at: number; value: PeerProfile }>();
const TTL_MS = 60_000;
const DEBUG = typeof window !== "undefined" && (window as any).__FIXXER_CHAT_DEBUG__ === true;

export function initialsOf(name: string): string {
  const clean = String(name || "").trim();
  if (!clean) return "?";
  const parts = clean.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || clean[0]!.toUpperCase();
}

export function fallbackPeer(peerId: string): PeerProfile {
  return { id: peerId, name: "Conversa", initials: "?", avatarUrl: null, role: null, source: ["fallback"] };
}

export function clearPeerCache(peerId?: string) {
  if (peerId) CACHE.delete(peerId);
  else CACHE.clear();
}

function pickFromExtras(extras: any): { name?: string; avatar?: string } {
  if (!extras || typeof extras !== "object") return {};
  const name = extras.display_name || extras.displayName || extras.full_name || extras.name;
  const avatar =
    extras.avatar_url || extras.photo_url || extras.profile_photo || extras.profile_image || extras.image_url;
  return { name: name ? String(name) : undefined, avatar: avatar ? String(avatar) : undefined };
}

export async function resolvePeerProfile(peerId: string): Promise<PeerProfile> {
  if (!peerId) return fallbackPeer("");
  const cached = CACHE.get(peerId);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;

  const source: string[] = [];
  let name = "";
  let avatarUrl: string | null = null;
  let role: string | null = null;
  let ownerUid: string | null = null;

  try {
    let prof: any = null;
    const { data: p1 } = await supabaseExternal
      .from("profiles")
      .select("id, user_id, full_name, display_name, avatar_url, role, custom_sections")
      .eq("id", peerId)
      .maybeSingle();
    prof = p1;
    if (prof) source.push("profiles.id");
    if (!prof) {
      const { data: p2 } = await supabaseExternal
        .from("profiles")
        .select("id, user_id, full_name, display_name, avatar_url, role, custom_sections")
        .eq("user_id", peerId)
        .maybeSingle();
      prof = p2;
      if (prof) source.push("profiles.user_id");
    }
    if (prof) {
      name = prof.display_name || prof.full_name || "";
      avatarUrl = prof.avatar_url ?? null;
      role = prof.role ?? null;
      ownerUid = prof.user_id || prof.id || peerId;
      const extras = pickFromExtras(prof?.custom_sections?.__extras);
      if (!name && extras.name) { name = extras.name; source.push("extras.name"); }
      if (!avatarUrl && extras.avatar) { avatarUrl = extras.avatar; source.push("extras.avatar"); }
    }
  } catch (e) {
    if (DEBUG) console.warn("[chat-peer] profiles lookup failed", e);
  }

  if (!name || !avatarUrl) {
    try {
      const { data: sp } = await supabaseExternal
        .from("store_profiles")
        .select("logo_url, company_name, display_name")
        .eq("user_id", ownerUid || peerId)
        .maybeSingle();
      if (sp) {
        if (!name && ((sp as any).display_name || (sp as any).company_name)) {
          name = (sp as any).display_name || (sp as any).company_name;
          source.push("store_profiles.name");
        }
        if (!avatarUrl && (sp as any).logo_url) {
          avatarUrl = (sp as any).logo_url;
          source.push("store_profiles.logo");
        }
      }
    } catch (e) {
      if (DEBUG) console.warn("[chat-peer] store_profiles lookup failed", e);
    }
  }

  const finalName = name || "Conversa";
  const result: PeerProfile = {
    id: peerId,
    name: finalName,
    initials: initialsOf(finalName),
    avatarUrl: avatarUrl || null,
    role,
    source: source.length ? source : ["fallback"],
  };
  if (DEBUG) console.info("[chat-peer] resolved", peerId, result);
  CACHE.set(peerId, { at: Date.now(), value: result });
  return result;
}
