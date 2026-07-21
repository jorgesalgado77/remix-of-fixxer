import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { User, Rss, LayoutDashboard, ShieldCheck, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { AdminDashboardComponent } from "./_authenticated.admin";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  const [isPathAdmin, setIsPathAdmin] = useState(false);

  useEffect(() => {
    const handleLocationChange = () => {
      if (typeof window !== 'undefined') {
        const email = localStorage.getItem('fixxer_user_email') || '';
        const role = localStorage.getItem('fixxer_user_role') || '';
        setUserEmail(email);
        setUserRole(role);
        setIsPathAdmin(window.location.pathname.includes('/admin'));
      }
    };

    handleLocationChange();
    
    // Escuta mudanças de navegação para garantir que o bypass reaja
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);


  const getDashboardPath = (role: string) => {
    const r = role.toLowerCase();
    if (r.includes('lojista')) return '/_authenticated/lojista';
    if (r.includes('admin')) return '/_authenticated/admin';
    if (r.includes('parceiro') || r.includes('fornecedor')) return '/_authenticated/parceiro';
    if (r.includes('cliente')) return '/_authenticated/cliente';
    return '/_authenticated/prestador';
  };

  const dashboardPath = getDashboardPath(userRole);
  const isAdmin = userEmail.trim() === 'jorgericardosalgado@gmail.com' || userRole.toLowerCase() === 'admin';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link 
            to={dashboardPath as any} 
            className="flex items-center gap-2 group"
            onClick={() => setIsPathAdmin(false)}
          >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-black text-xl shadow-[0_0_15px_rgba(0,255,135,0.3)] group-hover:scale-110 transition-transform">
              F
            </div>
            <span className="font-bold tracking-tight text-white group-hover:text-primary transition-colors">FIXXER</span>
          </Link>
        </div>

        <div className="flex items-center gap-6">
          {isAdmin && (
            <div 
              onClick={() => {
                setIsPathAdmin(true);
                window.history.pushState({}, '', '/admin');
                navigate({ to: '/admin' as any });
              }}
              className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors ${isPathAdmin ? 'text-[#00FF87]' : 'text-muted-foreground hover:text-[#00FF87]'}`}
            >
              <ShieldCheck className="w-4 h-4" />
              Admin
            </div>
          )}

          <Link 
            to="/_authenticated/feed" 
            onClick={() => setIsPathAdmin(false)}
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Rss className="w-4 h-4" />
            Feed
          </Link>

          <Link 
            to={dashboardPath as any}
            onClick={() => setIsPathAdmin(false)}
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>

          <Link 
            to="/_authenticated/profile" 
            onClick={() => setIsPathAdmin(false)}
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
        {isPathAdmin && isAdmin ? (
          <AdminDashboardComponent />
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
