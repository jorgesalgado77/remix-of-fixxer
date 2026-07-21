import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { User, Rss, LayoutDashboard, ShieldCheck, LogOut, Users, FileText, DollarSign, Activity, CheckCircle, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const { data: { session } } = await supabase.auth.getSession();
    let storedEmail = null;
    let storedRole = 'user';

    if (typeof window !== 'undefined') {
      storedEmail = localStorage.getItem('fixxer_user_email');
      storedRole = localStorage.getItem('fixxer_user_role') || 'user';
    }

    const isAdmin = (session?.user?.email === 'jorgericardosalgado@gmail.com') || 
                  (storedEmail === 'jorgericardosalgado@gmail.com') || 
                  (storedRole.toLowerCase() === 'admin');

    return { 
      session, 
      userRole: storedRole,
      userEmail: session?.user?.email || storedEmail,
      isAdmin,
      pathname: location.pathname
    };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const { isAdmin, pathname } = Route.useRouteContext();
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  useEffect(() => {
    // Sincroniza o estado showAdminPanel com a URL ou se for admin master
    if (isAdmin || pathname.includes('admin')) {
      setShowAdminPanel(true);
    } else {
      setShowAdminPanel(false);
    }
  }, [isAdmin, pathname]);

  useEffect(() => {
    const checkAuth = async () => {
      const isAuthenticated = typeof window !== 'undefined' && localStorage.getItem('fixxer_authenticated') === 'true';
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession && !isAuthenticated) {
        navigate({ to: "/auth" as any });
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div onClick={() => setShowAdminPanel(isAdmin)} className="flex items-center gap-2 cursor-pointer group">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-black text-xl shadow-[0_0_15px_rgba(0,255,135,0.3)] group-hover:scale-110 transition-transform">
              F
            </div>
            <span className="font-bold tracking-tight text-white group-hover:text-primary transition-colors">FIXXER</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {isAdmin && (
            <div 
              onClick={() => setShowAdminPanel(true)} 
              className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors ${showAdminPanel ? 'text-[#00FF87]' : 'text-muted-foreground hover:text-white'}`}
            >
              <ShieldCheck className="w-4 h-4" />
              Admin
            </div>
          )}

          <div 
            onClick={() => setShowAdminPanel(false)} 
            className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors ${!showAdminPanel ? 'text-[#00FF87]' : 'text-muted-foreground hover:text-white'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </div>

          <div className="h-4 w-[1px] bg-white/10 mx-1" />

          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              if (typeof window !== 'undefined') {
                localStorage.clear();
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
        {/* RENDERIZAÇÃO DIRETA DO PAINEL ADMIN MASTER SE FOR O ADMINISTRADOR */}
        {showAdminPanel && isAdmin ? (
          <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-4 mb-2">
              <button 
                onClick={() => setShowAdminPanel(false)}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-muted-foreground hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="h-8 w-[1px] bg-white/10" />
              <div className="flex items-center gap-2 text-[#00FF87]">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-widest">Acesso Privilegiado Master</span>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card to-background border border-white/10 p-8 shadow-2xl">
              <div className="relative z-10">
                <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
                  Painel Administrativo Master
                </h1>
                <p className="text-muted-foreground max-w-2xl">
                  Gestão global de usuários, auditoria de O.S. e controle da plataforma FIXXER.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 rounded-3xl group hover:border-[#00FF87]/30 transition-all">
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-4 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <div className="text-3xl font-black text-white mb-1">--</div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Usuários Totais</div>
              </div>

              <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 rounded-3xl group hover:border-[#00FF87]/30 transition-all">
                <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500 mb-4 group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="text-3xl font-black text-white mb-1">--</div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">O.S. Ativas</div>
              </div>

              <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 rounded-3xl group hover:border-[#00FF87]/30 transition-all">
                <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 mb-4 group-hover:scale-110 transition-transform">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div className="text-3xl font-black text-white mb-1">R$ 0,00</div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Volume Transacionado</div>
              </div>

              <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 rounded-3xl group hover:border-[#00FF87]/30 transition-all">
                <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 mb-4 group-hover:scale-110 transition-transform">
                  <Activity className="w-6 h-6" />
                </div>
                <div className="text-3xl font-black text-white mb-1">100%</div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status do Sistema</div>
              </div>
            </div>

            <div className="bg-[#00FF87]/5 border border-[#00FF87]/20 p-6 rounded-3xl flex items-start gap-4">
              <CheckCircle className="w-6 h-6 text-[#00FF87] shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-[#00FF87]">Painel Master Conectado Direct-Render</h3>
                <p className="text-sm text-[#00FF87]/70">
                  O sistema ignorou erros de roteamento e carregou a dashboard do administrador diretamente.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}