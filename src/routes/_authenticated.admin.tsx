import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Users, FileText, DollarSign, Activity, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminDashboardComponent,
});

export function AdminDashboardComponent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        // 1. Tenta obter pelo localStorage
        let email = typeof window !== 'undefined' ? (localStorage.getItem('fixxer_user_email') || '').trim() : '';
        let role = typeof window !== 'undefined' ? (localStorage.getItem('fixxer_user_role') || '').toLowerCase() : '';

        // 2. Se não encontrou no localStorage, busca diretamente na sessão do Supabase
        if (!email) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.email) {
            email = session.user.email.trim();
            localStorage.setItem('fixxer_user_email', email);
          }
        }

        // 3. Validação Master Irrestrita
        if (email === 'jorgericardosalgado@gmail.com' || role === 'admin') {
          setAuthorized(true);
        } else {
          console.warn("[ADMIN SECURITY]: Acesso negado para o e-mail:", email);
          // Redireciona para o login ou feed em vez de rota inexistente
          navigate({ to: '/_authenticated' as any });
          return;
        }
      } catch (error) {
        console.error("Erro na verificação admin:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#00FF87] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 font-medium animate-pulse">
            Validando Acesso Master FIXXER...
          </p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      {/* Header Admin */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00FF87]/10 border border-[#00FF87]/20 text-[#00FF87] text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3 h-3" />
            Acesso Privilegiado Master
          </div>
          <div className="flex flex-col">
            <h1 className="text-3xl font-black text-white tracking-tight">
              Painel Administrativo
            </h1>
            <p className="text-gray-400 text-sm max-w-md">
              Gestão global de usuários, auditoria de O.S. e controle da plataforma.
            </p>
          </div>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1A1A1A]/80 backdrop-blur-xl border border-white/5 p-6 rounded-2xl group hover:border-[#00FF87]/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-[#00FF87]/10 rounded-xl group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-[#00FF87]" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl font-black text-white">--</h3>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">
              Usuários Totais
            </p>
          </div>
        </div>

        <div className="bg-[#1A1A1A]/80 backdrop-blur-xl border border-white/5 p-6 rounded-2xl group hover:border-[#00FF87]/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl font-black text-white">--</h3>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">
              O.S. Ativas
            </p>
          </div>
        </div>

        <div className="bg-[#1A1A1A]/80 backdrop-blur-xl border border-white/5 p-6 rounded-2xl group hover:border-[#00FF87]/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-500/10 rounded-xl group-hover:scale-110 transition-transform">
              <DollarSign className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl font-black text-white">R$ 0,00</h3>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">
              Volume Transacionado
            </p>
          </div>
        </div>

        <div className="bg-[#1A1A1A]/80 backdrop-blur-xl border border-white/5 p-6 rounded-2xl group hover:border-[#00FF87]/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/10 rounded-xl group-hover:scale-110 transition-transform">
              <Activity className="w-6 h-6 text-purple-500" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl font-black text-white">100%</h3>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">
              Status do Sistema
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-[#1A1A1A]/80 backdrop-blur-xl border border-white/5 p-8 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <CheckCircle className="w-32 h-32 text-[#00FF87]" />
          </div>
          <div className="relative z-10 space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#00FF87]" />
              Infraestrutura Operacional
            </h2>
            <p className="text-gray-400 leading-relaxed">
              Sessão validada com sucesso. Você tem controle total do sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}