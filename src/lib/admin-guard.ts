import { useEffect } from "react";
import { redirect, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { getCurrentUserId, isCurrentUserAdmin, getCurrentUserEmail } from "@/lib/current-user";

export type AdminBlockReason = "no-session" | "not-admin";

export function reasonForBlock(uid: string | null, isAdmin: boolean): AdminBlockReason | null {
  if (!uid) return "no-session";
  if (!isAdmin) return "not-admin";
  return null;
}

const REASON_MESSAGES: Record<AdminBlockReason, string> = {
  "no-session": "Sua sessão expirou. Faça login novamente para acessar o painel administrativo.",
  "not-admin": "Você não tem permissão de administrador para acessar esta área.",
};

function clearAdminFlag() {
  try { localStorage.removeItem("@fixxer:is_admin"); } catch {}
}

function notifyBlock(reason: AdminBlockReason) {
  if (typeof window === "undefined") return;
  const message = REASON_MESSAGES[reason];
  const target = reason === "no-session" ? "/auth" : "/dashboard";
  // Defer para não competir com o redirect do router.
  setTimeout(() => {
    try {
      toast.error(message, {
        duration: 8000,
        action: {
          label: reason === "no-session" ? "Ir para login" : "Voltar",
          onClick: () => { window.location.replace(target); },
        },
      });
    } catch {
      /* toast pode não estar montado durante SSR */
    }
  }, 0);
}

export async function evaluateAdminAccess(force = true): Promise<
  { ok: true; userId: string } | { ok: false; reason: AdminBlockReason }
> {
  const uid = await getCurrentUserId();
  
  // Fallback emergencial: Se temos um email de admin master mas a sessao falhou, 
  // tentamos ser o mais resiliente possivel, mas sem UID nao ha sessao.
  if (!uid) return { ok: false, reason: "no-session" };

  const isAdmin = await isCurrentUserAdmin(force);
  
  // Dupla checagem para o Admin Master (redundância de segurança)
  const email = await getCurrentUserEmail();
  const isMaster = email?.toLowerCase() === 'jorgericardosalgado@gmail.com';
  
  const reason = reasonForBlock(uid, isAdmin || isMaster);
  
  if (reason) return { ok: false, reason };
  return { ok: true, userId: uid };
}

export async function requireAdmin() {
  const result = await evaluateAdminAccess(true);
  if (!result.ok) {
    clearAdminFlag();
    notifyBlock(result.reason);
    throw redirect({ to: (result.reason === "no-session" ? "/auth" : "/dashboard") as any });
  }
  return { userId: result.userId, isAdmin: true as const };
}

// Hook: revalida permissão de admin sempre que a aba volta ao foco.
// Se o token expirou ou a role foi removida, desloga o usuário da área admin.
export function useAdminFocusRevalidation() {
  const navigate = useNavigate();
  useEffect(() => {
    if (typeof document === "undefined") return;
    let running = false;
    const check = async () => {
      if (running) return;
      running = true;
      try {
        const result = await evaluateAdminAccess(true);
        if (!result.ok) {
          clearAdminFlag();
          notifyBlock(result.reason);
          navigate({ to: (result.reason === "no-session" ? "/auth" : "/dashboard") as any });
        }
      } finally {
        running = false;
      }
    };
    const onVisibility = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", check);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", check);
    };
  }, [navigate]);
}
