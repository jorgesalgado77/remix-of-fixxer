// Deslogamento automático quando o admin bloqueia o usuário.
// Escuta `postgres_changes` na linha do profile logado e força signOut + redirect.
import { supabaseExternal as supabase } from "@/lib/supabaseExternal";
import { toast } from "sonner";

let currentChannel: any = null;
let currentUserId: string | null = null;

async function enforceBlockedNow(userId: string) {
  try {
    // PROMPT 23: O Administrador Master é IMUNE ao bloqueio de status
    const isMasterBypass = typeof window !== 'undefined' && localStorage.getItem('fixxer:master-bypass') === 'true';
    if (isMasterBypass) {
      console.warn("[BlockedGuard] Tentativa de bloqueio ignorada para Admin Master.");
      return;
    }

    try {
      const { data } = await supabase.from("profiles").select("status").eq("id", userId).maybeSingle();
      if (data?.status !== "bloqueado") return;
    } catch { /* seguir mesmo em erro para não travar UI */ }
    try { await supabase.auth.signOut(); } catch {}
    if (typeof window !== "undefined") {
      // A limpeza global de chaves legadas é feita centralmente em current-user
      // (listener onAuthStateChange → SIGNED_OUT). Aqui apenas notificamos o UX.
      toast.error("Sua conta foi SUSPENSA pelo administrador. Sessão encerrada.");
      setTimeout(() => { window.location.replace("/auth?blocked=1"); }, 400);
    }
  } catch (e) {
    console.warn("[blocked-guard] falha ao aplicar bloqueio", e);
  }
}


export async function subscribeBlockedStatus(userId: string) {
  if (!userId) return;
  if (currentChannel && currentUserId === userId) return; // já assinado
  // Descarta canal anterior se usuário mudou
  if (currentChannel) {
    try { await supabase.removeChannel(currentChannel); } catch {}
    currentChannel = null;
  }
  currentUserId = userId;

  // Checa imediatamente ao iniciar (evita reingresso via cache)
  try {
    const { data } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", userId)
      .maybeSingle();
    if (data?.status === "bloqueado") {
      await enforceBlockedNow(userId);
      return;
    }
  } catch (e) { /* segue mesmo com erro */ }

  currentChannel = supabase
    .channel(`profile:blocked:${userId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
      async (payload: any) => {
        if (payload?.new?.status === "bloqueado") {
          await enforceBlockedNow(userId);
        }
      }
    )
    .subscribe();
}
