import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Users, FileText, DollarSign, Activity, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminDashboardComponent,
});

function AdminDashboardComponent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, osActive: 0, volume: 0 });

  useEffect(() => {
    // Validação de acesso exclusivo do administrador master
    const checkAdminAccess = async () => {
      const email = typeof window !== 'undefined' ? localStorage.getItem('fixxer_user_email') || '' : '';
      const role = typeof window !== 'undefined' ? localStorage.getItem('fixxer_user_role') || '' : '';
      
      // Se não for o email admin master ou role Admin, redireciona para a dashboard genérica
      if (email.trim() !== 'jorgericardosalgado@gmail.com' && role.toLowerCase() !== 'admin') {
        console.warn("[ADMIN SECURITY]: Acesso negado a não-administrador. Redirecionando...");
        navigate({ to: '/_authenticated/dashboard' as any });
        return;
      }
      setLoading(false);
    };

    checkAdminAccess();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-6">
        <div className="text-zinc-400 animate-pulse flex flex-col items-center gap-4">
          <ShieldCheck className="w-12 h-12 text-blue-500 opacity-50" />
          <p className="text-sm font-medium tracking-wider">Carregando Painel Administrativo Master FIXXER...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 p-4 md:p-8 space-y-8">
      {/* Header Admin */}
      <div className="relative overflow-hidden rounded-3xl bg-zinc-900/50 border border-zinc-800/50 p-8 backdrop-blur-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <ShieldCheck className="w-32 h-32 text-blue-500" />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest">
            <ShieldCheck className="w-3 h-3" />
            Acesso Privilegiado Master
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase italic">
            Painel Administrativo
          </h1>
          <p className="text-zinc-400 max-w-2xl text-lg font-light leading-relaxed">
            Gestão global de usuários, auditoria de O.S. e controle da plataforma.
          </p>
        </div>
      </div>

      {/* Cards de Métricas Globais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 hover:border-blue-500/30 transition-all group">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white tracking-tighter">--</p>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Usuários Totais</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 hover:border-emerald-500/30 transition-all group">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white tracking-tighter">--</p>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">O.S. Ativas</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 hover:border-amber-500/30 transition-all group">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white tracking-tighter">R$ 0,00</p>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Volume Transacionado</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 hover:border-purple-500/30 transition-all group">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white tracking-tighter">100%</p>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Status do Sistema</p>
            </div>
          </div>
        </div>
      </div>

      {/* Seção de Alertas do Sistema */}
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 flex items-start gap-4">
        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 mt-1">
          <CheckCircle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-white font-bold mb-1 italic uppercase tracking-wider text-sm">Infraestrutura Operacional</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            O módulo administrativo foi registrado com sucesso na árvore do TanStack Router (<code>/_authenticated/admin</code>). Você tem controle total das configurações, categorias e perfis.
          </p>
        </div>
      </div>
    </div>
  );
}