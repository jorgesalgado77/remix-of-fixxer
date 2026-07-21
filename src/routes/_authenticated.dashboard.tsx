import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardRedirect,
});

function DashboardRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const resolveRoleAndNavigate = async () => {
      let role = localStorage.getItem('fixxer_user_role') || '';
      const email = localStorage.getItem('fixxer_user_email') || '';

      console.log(`[FIXXER REDIRECT]: Resolvendo rota para ${email} (Role: ${role})`);

      // Regra Prioritária Admin Master
      if (email.trim() === 'jorgericardosalgado@gmail.com' || role === 'admin' || role === 'Admin') {
        navigate({ to: '/_authenticated/admin' as any });
        return;
      }

      // Se a role não estiver no localStorage, busca no Supabase
      if (!role) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, user_type')
            .eq('id', session.user.id)
            .maybeSingle();
          
          role = profile?.role || profile?.user_type || 'prestador';
          if (typeof window !== 'undefined') {
            localStorage.setItem('fixxer_user_role', role);
          }
        }
      }

      // Normalização do redirecionamento por perfil
      const normalizedRole = role.toLowerCase();
      if (normalizedRole.includes('lojista')) {
        navigate({ to: '/_authenticated/lojista' as any });
      } else if (normalizedRole.includes('parceiro') || normalizedRole.includes('fornecedor')) {
        navigate({ to: '/_authenticated/parceiro' as any });
      } else if (normalizedRole.includes('admin')) {
        navigate({ to: '/_authenticated/admin' as any });
      } else if (normalizedRole.includes('cliente')) {
        navigate({ to: '/_authenticated/cliente' as any });
      } else {
        navigate({ to: '/_authenticated/prestador' as any });
      }
    };

    resolveRoleAndNavigate();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-muted-foreground font-bold uppercase tracking-widest animate-pulse">
        Redirecionando para seu painel...
      </p>
    </div>
  );
}