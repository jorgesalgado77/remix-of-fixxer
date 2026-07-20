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

    // Buscar o perfil e papel do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    return { 
      session,
      userRole: profile?.role || 'lojista'
    };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { userRole } = Route.useRouteContext();

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
              className="text-xs font-bold uppercase tracking-widest text-primary hover:shadow-[0_0_10px_rgba(0,255,135,0.4)] transition-all"
            >
              Admin
            </Link>
          )}
          <Link 
            to="/dashboard" 
            className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors"
          >
            Dashboard
          </Link>
          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/auth";
            }}
            className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors ml-2"
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
