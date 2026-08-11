/**
 * FIXXER — Resolução centralizada do perfil do destinatário do chat.
 * Refatorado para usar o Identity Service Canônico (Prompt 15).
 */
import { resolveIdentity } from "@/lib/identity/identity-service";
import type { PeerProfile } from "@/lib/identity/chat-peer-profile.types";

export type { PeerProfile };

const CACHE = new Map<string, { at: number; value: PeerProfile }>();
const TTL_MS = 60_000;

export function initialsOf(name: string): string {
  const clean = String(name || "").trim();
  if (!clean) return "?";
  const parts = clean.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || clean[0]!.toUpperCase();
}

/** Leitura síncrona do cache para render instantâneo. */
export function getCachedPeer(peerId: string): PeerProfile | null {
  const c = CACHE.get(peerId);
  return c && !c.value.isFallback ? c.value : null;
}

export function clearPeerCache(peerId?: string) {
  if (peerId) CACHE.delete(peerId);
  else CACHE.clear();
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

export async function resolvePeerProfile(peerId: string, options?: { refresh?: boolean }): Promise<PeerProfile> {
  if (!peerId) return fallbackPeer("");
  
  const cached = CACHE.get(peerId);
  if (!options?.refresh && cached && Date.now() - cached.at < TTL_MS) return cached.value;

  try {
    const resolved = await resolveIdentity(peerId, options);
    
    const peer: PeerProfile = {
      id: peerId,
      name: resolved.presentation.name,
      initials: resolved.presentation.initials,
      avatarUrl: resolved.presentation.avatarUrl,
      role: resolved.presentation.category,
      isFallback: false,
      source: ["canonical-identity"],
      diagnostics: [`Resolved via IdentityService as ${resolved.mainCategory}`]
    };

    CACHE.set(peerId, { at: Date.now(), value: peer });
    return peer;
  } catch (error) {
    console.warn("[chat-peer] Failed to resolve canonical identity, using legacy fallback", error);
    return fallbackPeer(peerId);
  }
}


