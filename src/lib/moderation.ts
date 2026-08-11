// =============================================================================
// Moderação de comunidade: denunciar e bloquear usuários.
// - Persistência local imediata (funciona sem backend).
// - Tentativa best-effort no Supabase externo (tabelas opcionais; falha silente).
// - Eventos globais para telas filtrarem em tempo real.
// =============================================================================

import { supabaseExternal } from "@/lib/supabaseExternal";

const LS_BLOCKS = "fixxer:blocked_users:v1";
const LS_REPORTS = "fixxer:user_reports:v1";

export type ReportReason =
  | "spam"
  | "assedio"
  | "conteudo_impróprio"
  | "golpe_fraude"
  | "pix_indevido"
  | "outro";

export const REPORT_REASONS: { key: ReportReason; label: string }[] = [
  { key: "spam", label: "Spam ou propaganda repetitiva" },
  { key: "assedio", label: "Assédio, ameaça ou linguagem ofensiva" },
  { key: "conteudo_impróprio", label: "Conteúdo impróprio ou ilegal" },
  { key: "golpe_fraude", label: "Golpe ou tentativa de fraude" },
  { key: "pix_indevido", label: "Solicitou PIX fora do sistema de custódia" },
  { key: "outro", label: "Outro motivo" },
];

// ------------------------------- BLOQUEIOS ----------------------------------

function readBlocks(): Record<string, { blockedAt: string; note?: string }> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LS_BLOCKS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeBlocks(map: Record<string, { blockedAt: string; note?: string }>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_BLOCKS, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent("fixxer:blocked-users-changed"));
  } catch {
    /* ignore */
  }
}

/**
 * Verifica se um usuário está bloqueado.
 * Prioriza cache local para UX, mas a validação final é backend via RLS.
 */
export function isUserBlocked(targetUserId: string | null | undefined): boolean {
  if (!targetUserId) return false;
  return !!readBlocks()[targetUserId];
}

export function getBlockedIds(): string[] {
  return Object.keys(readBlocks());
}

export async function blockUser(
  actorUserId: string | null,
  targetUserId: string,
  note?: string,
): Promise<{ ok: true }> {
  const map = readBlocks();
  map[targetUserId] = { blockedAt: new Date().toISOString(), note };
  writeBlocks(map);
  // Remote enforcement (essencial para RLS e sincronização)
  if (actorUserId && actorUserId !== targetUserId) {
    try {
      const { error } = await supabaseExternal.from("user_blocks").upsert({
        blocker_id: actorUserId,
        blocked_id: targetUserId,
        note: note ?? null,
      }, { onConflict: 'blocker_id,blocked_id' });
      if (error) console.error("[moderation] block error:", error);
    } catch (err) {
      console.error("[moderation] block exception:", err);
    }
  }
  return { ok: true };
}

export async function unblockUser(
  actorUserId: string | null,
  targetUserId: string,
): Promise<{ ok: true }> {
  const map = readBlocks();
  delete map[targetUserId];
  writeBlocks(map);
  if (actorUserId && actorUserId !== targetUserId) {
    try {
      await supabaseExternal
        .from("user_blocks")
        .delete()
        .eq("blocker_id", actorUserId)
        .eq("blocked_id", targetUserId);
    } catch {
      /* silencioso */
    }
  }
  return { ok: true };
}

export function subscribeBlockedUsers(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => fn();
  window.addEventListener("fixxer:blocked-users-changed", handler);
  return () => window.removeEventListener("fixxer:blocked-users-changed", handler);
}

// ------------------------------- DENÚNCIAS ----------------------------------

type ReportRecord = {
  id: string;
  targetUserId: string;
  reason: ReportReason;
  details?: string;
  context?: string; // ex.: "chat:abc", "card:feed_post:xyz"
  createdAt: string;
  synced: boolean;
};

function readReports(): ReportRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_REPORTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeReports(list: ReportRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_REPORTS, JSON.stringify(list.slice(0, 500)));
  } catch {
    /* ignore */
  }
}

/**
 * Registra uma denúncia. Grava localmente (comprovante para o denunciante)
 * e tenta enviar para o Supabase — falha remota não invalida a denúncia local.
 */
export async function reportUser(input: {
  reporterId: string | null;
  targetUserId: string;
  reason: ReportReason;
  details?: string;
  context?: string;
}): Promise<{ ok: boolean; synced: boolean; id: string }> {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `rep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const rec: ReportRecord = {
    id,
    targetUserId: input.targetUserId,
    reason: input.reason,
    details: input.details,
    context: input.context,
    createdAt: new Date().toISOString(),
    synced: false,
  };

  let synced = false;
  try {
    const { error } = await supabaseExternal.from("user_reports").insert({
      id,
      reporter_id: input.reporterId,
      target_user_id: input.targetUserId,
      reason: input.reason,
      details: input.details ?? null,
      context: input.context ?? null,
    });
    synced = !error;
  } catch {
    synced = false;
  }

  rec.synced = synced;
  const list = readReports();
  writeReports([rec, ...list]);
  return { ok: true, synced, id };
}

export function getRecentReportsFor(targetUserId: string): ReportRecord[] {
  return readReports().filter((r) => r.targetUserId === targetUserId);
}
