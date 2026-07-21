import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Utilitário de emergência para corrigir o estado do localStorage e redirecionar
 * em caso de loops de autenticação ou falhas no roteamento TanStack.
 */
export const fixAuthAndPreview = () => {
  if (typeof window === 'undefined') return;

  const email = localStorage.getItem('fixxer_user_email');
  const isAuthenticated = localStorage.getItem('fixxer_authenticated') === 'true';

  console.log("[PREVIEW FIXER]: Verificando estado...", { email, isAuthenticated });

  // Se estivermos na dashboard e algo parecer errado, tentamos limpar e reenviar
  if (window.location.pathname.includes('dashboard') && !isAuthenticated) {
     toast.error("Sessão inválida. Redirecionando...");
     localStorage.clear();
     window.location.href = "/auth";
  }

  // Bypass para admin master se os dados estiverem no storage
  if (email === 'jorgericardosalgado@gmail.com' && !window.location.pathname.includes('admin')) {
     console.log("[PREVIEW FIXER]: Forçando bypass do Admin Master");
     window.location.assign('/admin');
  }
};
