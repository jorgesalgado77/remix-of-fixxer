/**
 * Persistência offline do rascunho do formulário de perfil.
 *
 * Guarda em `localStorage` apenas os campos editáveis "leves"
 * (about_bio, default_radius, activity_branch, custom_sections) com
 * timestamp. Quando o UPDATE no Supabase falha por rede/CORS o rascunho
 * fica marcado como `pending`, permitindo reenvio automático assim que a
 * conexão voltar.
 */
export type ProfileDraft = {
  about_bio?: string | null;
  default_radius?: number | null;
  activity_branch?: string | null;
  custom_sections?: unknown;
  savedAt: number;
  pending: boolean;
};

const KEY = (userId: string) => `fixxer_profile_draft_${userId}`;

function safeGetStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function saveDraft(userId: string, patch: Omit<ProfileDraft, "savedAt" | "pending">, pending = false): void {
  const s = safeGetStorage();
  if (!s || !userId) return;
  try {
    const payload: ProfileDraft = { ...patch, savedAt: Date.now(), pending };
    s.setItem(KEY(userId), JSON.stringify(payload));
  } catch {
    /* quota / privado — ignora */
  }
}

export function loadDraft(userId: string): ProfileDraft | null {
  const s = safeGetStorage();
  if (!s || !userId) return null;
  try {
    const raw = s.getItem(KEY(userId));
    if (!raw) return null;
    return JSON.parse(raw) as ProfileDraft;
  } catch {
    return null;
  }
}

export function clearDraft(userId: string): void {
  const s = safeGetStorage();
  if (!s || !userId) return;
  try {
    s.removeItem(KEY(userId));
  } catch {
    /* noop */
  }
}

export function markPending(userId: string, pending: boolean): void {
  const current = loadDraft(userId);
  if (!current) return;
  saveDraft(
    userId,
    {
      about_bio: current.about_bio,
      default_radius: current.default_radius,
      activity_branch: current.activity_branch,
      custom_sections: current.custom_sections,
    },
    pending,
  );
}

/**
 * Decide se o rascunho local é mais recente/relevante que o valor vindo
 * do servidor. Retorna os campos que devem ser mesclados ao estado.
 */
export function pickDraftPatch(
  server: { about_bio?: string | null; default_radius?: number | null; activity_branch?: string | null; custom_sections?: unknown } | null | undefined,
  draft: ProfileDraft | null,
): Partial<ProfileDraft> | null {
  if (!draft) return null;
  // Se estava pendente (falha de rede prévia), sempre restaura.
  if (draft.pending) {
    return {
      about_bio: draft.about_bio,
      default_radius: draft.default_radius,
      activity_branch: draft.activity_branch,
      custom_sections: draft.custom_sections,
    };
  }
  // Caso contrário, restaura apenas campos que divergem do servidor
  // (rascunho local ainda não salvo).
  const patch: Partial<ProfileDraft> = {};
  if (server?.about_bio !== draft.about_bio && draft.about_bio != null) patch.about_bio = draft.about_bio;
  if (server?.default_radius !== draft.default_radius && draft.default_radius != null) patch.default_radius = draft.default_radius;
  if (server?.activity_branch !== draft.activity_branch && draft.activity_branch != null) patch.activity_branch = draft.activity_branch;
  return Object.keys(patch).length ? patch : null;
}
