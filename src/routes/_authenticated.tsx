import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { User, Rss, LayoutDashboard, ShieldCheck, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    // Carregamos a sessão mas não bloqueamos a renderização com redirect aqui
    // Isso evita telas brancas e loops se a hidratação demorar no preview
    const { data: { session } } = await supabase.auth.getSession();
    
    let storedEmail = null;
    let storedRole = 'user';

    if (typeof window !== 'undefined') {
      storedEmail = localStorage.getItem('fixxer_user_email');
      storedRole = localStorage.getItem('fixxer_user_role') || 'user';
    }

    return { 
      session, 
      userRole: storedRole,
      userEmail: session?.user?.email || storedEmail
    };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { userRole, session } = Route.useRouteContext();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirecionamento não bloqueante via useEffect
    const checkAuth = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const isAuthenticated = typeof window !== 'undefined' && localStorage.getItem('fixxer_authenticated') === 'true';
      
      if (!currentSession && !isAuthenticated) {
        console.log("[FIXXER]: Sessão não encontrada, redirecionando para /auth");
        navigate({ to: "/auth" as any });
      }
    };
    checkAuth();
  }, [navigate]);

  const getDashboardPath = (role: string) => {
    const r = role.toLowerCase();
    if (r.includes('lojista')) return '/_authenticated/lojista';
    if (r.includes('admin')) return '/_authenticated/admin';
    if (r.includes('parceiro') || r.includes('fornecedor')) return '/_authenticated/parceiro';
    if (r.includes('cliente')) return '/_authenticated/cliente';
    return '/_authenticated/prestador';
  };

  const dashboardPath = getDashboardPath(userRole);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to={dashboardPath as any} className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-black text-xl shadow-[0_0_15px_rgba(0,255,135,0.3)] group-hover:scale-110 transition-transform">
              F
            </div>
            <span className="font-bold tracking-tight text-white group-hover:text-primary transition-colors">FIXXER</span>
          </Link>
        </div>

        <div className="flex items-center gap-6">
          {(userRole === 'admin' || userRole === 'Admin') && (
            <Link 
              to="/_authenticated/admin" 
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              Admin
            </Link>
          )}

          <Link 
            to="/_authenticated/feed" 
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Rss className="w-4 h-4" />
            Feed
          </Link>

          <Link 
            to={dashboardPath as any}
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>

          <Link 
            to="/_authenticated/profile" 
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <User className="w-4 h-4" />
            Perfil
          </Link>

          <div className="h-4 w-[1px] bg-white/10 mx-1" />

          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              if (typeof window !== 'undefined') {
                localStorage.removeItem('fixxer_authenticated');
                localStorage.removeItem('fixxer_user_email');
                localStorage.removeItem('fixxer_user_role');
              }
              window.location.href = "/auth";
            }}
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </nav>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}