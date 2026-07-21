import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({
        to: "/auth",
        search: {
          redirect: location.href,
        },
      });
    }

    // Buscar o perfil e papel do usuário com retry (importante para o primeiro acesso)
    let profile = null;
    let retryCount = 0;
    while (retryCount < 3 && !profile) {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();
      
      if (data) {
        profile = data;
        break;
      }
      retryCount++;
      if (!profile) await new Promise(res => setTimeout(res, 500));
    }

    const role = profile?.role || 'lojista';

    // Bloqueio explícito para rotas de admin
    if (location.pathname.startsWith('/admin') && role !== 'admin') {
      console.warn("Acesso negado: Usuário não é administrador.");
      
      // Registrar tentativa de acesso não autorizado
      await supabase.from('access_logs').insert([{
        user_id: session.user.id,
        email: session.user.email,
        event_type: 'redirect_block',
        status: 'blocked',
        reason: `Tentativa de acesso a ${location.pathname} com role ${role}`,
        metadata: { path: location.pathname, role }
      }]);

      throw redirect({
        to: "/dashboard",
      });
    }

    return { 
      session,
      userRole: role
    };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { userRole, session } = Route.useRouteContext();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-black text-xl">F</div>
            <span className="font-bold tracking-tight">FIXXER</span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {userRole === 'admin' && (
            <Link 
              to="/admin" 
              className="text-xs font-bold uppercase tracking-widest text-primary hover:shadow-[0_0_10px_rgba(0,255,135,0.4)] transition-all active:scale-95"
            >
              Admin
            </Link>
          )}
          <Link 
            to="/_authenticated/profile" 
            className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors active:scale-95 flex items-center gap-2"
          >
            <User className="w-3 h-3" />
            Perfil
          </Link>
          <Link 
            to="/dashboard" 
            className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors active:scale-95"
          >
            Dashboard
          </Link>
          <div className="h-4 w-[1px] bg-white/10 mx-1" />
          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/auth";
            }}
            className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-red-400 transition-colors active:scale-95"
          >
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
