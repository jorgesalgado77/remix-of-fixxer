// Guard compartilhado para rotas /admin/*.
// Roda no beforeLoad (client-side, pois todas ficam sob _authenticated ssr:false)
// e bloqueia acesso ANTES de renderizar o componente — mesmo com token expirado
// ou perfil inconsistente. Fonte de verdade: supabaseExternal.auth.getUser() +
// public.user_roles(role='admin'). NENHUMA leitura de localStorage.
import { redirect } from "@tanstack/react-router";
import { getCurrentUserId, isCurrentUserAdmin } from "@/lib/current-user";

export async function requireAdmin() {
  const uid = await getCurrentUserId();
  if (!uid) {
    try { localStorage.removeItem("@fixxer:is_admin"); } catch {}
    throw redirect({ to: "/auth" as any });
  }
  const ok = await isCurrentUserAdmin(true);
  if (!ok) {
    try { localStorage.removeItem("@fixxer:is_admin"); } catch {}
    throw redirect({ to: "/dashboard" as any });
  }
  return { userId: uid, isAdmin: true as const };
}
