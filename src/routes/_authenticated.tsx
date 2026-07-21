import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Users, FileText, DollarSign, Activity, CheckCircle, LogOut, LayoutDashboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

export function AuthenticatedLayout() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const storedEmail = typeof window !== 'undefined' ? (localStorage.getItem('fixxer_user_email') || '').trim() : '';
        const storedRole = typeof window !== 'undefined' ? (localStorage.getItem('fixxer_user_role') || '').toLowerCase() : '';
        
        // Se for o e-mail master ou role admin
        if (storedEmail === 'jorgericardosalgado@gmail.com' || storedRole === 'admin') {
          setIsAdmin(true);
        } else {
          // Checa na sessão Supabase se o e-mail for o seu
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.email === 'jorgericardosalgado@gmail.com') {
            setIsAdmin(true);
            localStorage.setItem('fixxer_user_email', session.user.email);
            localStorage.setItem('fixxer_user_role', 'Admin');
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#00FF87] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 font-medium animate-pulse">
            Iniciando FIXXER...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Topbar Fixa */}
      <nav className="border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#00FF87] rounded-lg flex items-center justify-center text-black font-black text-xl">
            F
          </div>
          <span className="font-bold tracking-tighter text-white text-xl">FIXXER</span>
        </div>

        <div className="flex items-center gap-6">
          {isAdmin && (
            <div className="text-[#00FF87] text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" />
              Admin Master
            </div>
          )}

          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              localStorage.clear();
              window.location.href = "/auth";
            }}
            className="text-xs font-bold uppercase tracking-wider text-white/50 hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </nav>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-auto">
        {/* SE FOR O ADMINISTRADOR MASTER, EXIBE O PAINEL ADMIN DIRETO SEM PASSAR PELAS ROTAS DA URL */}
        {isAdmin ? (
          <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#111] to-black border border-white/5 p-10 shadow-2xl">
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-[#00FF87] mb-6">
                  <ShieldCheck className="w-6 h-6" />
                  <span className="text-sm font-black uppercase tracking-[0.2em]">Acesso Privilegiado Master</span>
                </div>

                <div className="space-y-4">
                  <h1 className="text-6xl font-black text-white tracking-tighter leading-none">
                    Painel Administrativo Master
                  </h1>
                  <p className="text-gray-400 text-lg max-w-2xl leading-relaxed">
                    Gestão global de usuários, auditoria de O.S. e controle da plataforma FIXXER.
                  </p>
                </div>
              </div>
            </div>

            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-[#111] border border-white/5 p-8 rounded-[2rem] hover:border-[#00FF87]/30 transition-all group">
                <div className="w-14 h-14 bg-[#00FF87]/10 rounded-2xl flex items-center justify-center text-[#00FF87] mb-6 group-hover:scale-110 transition-transform">
                  <Users className="w-7 h-7" />
                </div>
                <div className="text-4xl font-black text-white mb-2">--</div>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-500">Usuários Totais</div>
              </div>

              <div className="bg-[#111] border border-white/5 p-8 rounded-[2rem] hover:border-blue-500/30 transition-all group">
                <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
                  <FileText className="w-7 h-7" />
                </div>
                <div className="text-4xl font-black text-white mb-2">--</div>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-500">O.S. Ativas</div>
              </div>

              <div className="bg-[#111] border border-white/5 p-8 rounded-[2rem] hover:border-yellow-500/30 transition-all group">
                <div className="w-14 h-14 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-500 mb-6 group-hover:scale-110 transition-transform">
                  <DollarSign className="w-7 h-7" />
                </div>
                <div className="text-4xl font-black text-white mb-2">R$ 0,00</div>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-500">Volume Transacionado</div>
              </div>

              <div className="bg-[#111] border border-white/5 p-8 rounded-[2rem] hover:border-purple-500/30 transition-all group">
                <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 mb-6 group-hover:scale-110 transition-transform">
                  <Activity className="w-7 h-7" />
                </div>
                <div className="text-4xl font-black text-white mb-2">100%</div>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-500">Status do Sistema</div>
              </div>
            </div>

            <div className="bg-[#00FF87]/5 border border-[#00FF87]/20 p-8 rounded-[2rem] flex items-center gap-6">
              <div className="w-12 h-12 bg-[#00FF87]/20 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle className="w-6 h-6 text-[#00FF87]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-[#00FF87]">Painel Master Ativo</h3>
                <p className="text-gray-400">
                  O painel administrativo foi montado diretamente e está totalmente operacional.
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