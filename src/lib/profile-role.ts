/**
 * FIXXER — helper de resolução do "cargo preferencial" do perfil.
 *
 * Cadeia de fallback única (mesma em toda a app):
 *   1) preferred_service (string simples)
 *   2) positions[].primary === true → título/nome/role
 *   3) primeiro positions[] com título válido
 *   4) primeiro item de job_roles (CSV separado por "||")
 *   5) activity_branch
 */
export function resolvePrimaryRole(profile: any): string | null {
  if (!profile) return null;
  const pref = String(profile.preferred_service ?? "").trim();
  if (pref) return pref;

  const arr: any[] = Array.isArray(profile.positions) ? profile.positions : [];
  const pick = (p: any) => (typeof p === "string" ? p : (p?.title || p?.name || p?.role));

  const primary = arr.find((p) => typeof p === "object" && p?.primary);
  if (primary) {
    const label = pick(primary);
    if (label) return String(label).trim();
  }
  for (const p of arr) {
    const label = pick(p);
    if (label) return String(label).trim();
  }

  const csv = String(profile.job_roles ?? "").trim();
  if (csv) {
    const first = csv.split("||").map((s) => s.trim()).filter(Boolean)[0];
    if (first) return first;
  }

  const branch = String(profile.activity_branch ?? "").trim();
  return branch || null;
}
