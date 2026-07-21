import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    let isAuthenticated = false;
    let storedEmail = null;
    let storedRole = 'user';

    if (typeof window !== 'undefined') {
      isAuthenticated = localStorage.getItem('fixxer_authenticated') === 'true';
      storedEmail = localStorage.getItem('fixxer_user_email');
      storedRole = localStorage.getItem('fixxer_user_role') || 'user';
    }

    if (!session && !isAuthenticated) {
      throw redirect({ to: "/auth" });
    }

    // Busca o perfil para injetar o role no contexto
    const userId = session?.user?.id;
    let userRole = storedRole;

    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      if (profile?.role) {
        userRole = profile.role;
        if (typeof window !== 'undefined') {
          localStorage.setItem('fixxer_user_role', userRole);
        }
      }
    }

    return { 
      session, 
      userRole,
      userEmail: session?.user?.email || storedEmail
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
            to="/profile" 
            className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors active:scale-95 flex items-center gap-2"
          >
            <User className="w-3 h-3" />
            Perfil
          </Link>
          <Link 
            to="/feed" 
            className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors active:scale-95"
          >
            Feed
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
