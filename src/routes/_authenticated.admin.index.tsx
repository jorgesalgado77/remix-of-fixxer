import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Users, FileText, DollarSign, Activity, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboardComponent,
});

function AdminDashboardComponent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminAccess = async () => {
      const email = typeof window !== 'undefined' ? localStorage.getItem('fixxer_user_email') || '' : '';
      const role = typeof window !== 'undefined' ? localStorage.getItem('fixxer_user_role') || '' : '';
      
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
        <div className="text-center space-y-4">
          <Activity className="w-12 h-12 text-[#00FF87] animate-pulse mx-auto" />
          <p className="text-white/60 font-medium animate-pulse text-sm tracking-widest uppercase">
            Carregando Painel Administrativo Master FIXXER...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white p-4 md:p-8 space-y-8 pb-24">
      {/* Header Admin */}
      <header className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-[#1A1A1B] to-[#0A0A0B] p-8 shadow-2xl">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00FF87]/10 border border-[#00FF87]/20 text-[#00FF87] text-[10px] font-bold uppercase tracking-widest">
            <ShieldCheck className="w-3 h-3" />
            Acesso Privilegiado Master
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white">
              Painel Administrativo
            </h1>
            <p className="text-white/40 text-sm max-w-xl">
              Gestão global de usuários, auditoria de O.S. e controle da plataforma.
            </p>
          </div>
        </div>
      </header>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1A1A1B] border border-white/5 rounded-2xl p-6 hover:border-[#00FF87]/30 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-[#00FF87]/10 rounded-xl group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-[#00FF87]" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">--</div>
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
              Usuários Totais
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1B] border border-white/5 rounded-2xl p-6 hover:border-blue-500/30 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">--</div>
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
              O.S. Ativas
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1B] border border-white/5 rounded-2xl p-6 hover:border-emerald-500/30 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl group-hover:scale-110 transition-transform">
              <DollarSign className="w-6 h-6 text-emerald-500" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">R$ 0,00</div>
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
              Volume Transacionado
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1B] border border-white/5 rounded-2xl p-6 hover:border-purple-500/30 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/10 rounded-xl group-hover:scale-110 transition-transform">
              <Activity className="w-6 h-6 text-purple-500" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">100%</div>
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
              Status do Sistema
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#1A1A1B] border border-white/5 rounded-2xl p-8">
        <div className="flex items-center gap-4 mb-6">
          <CheckCircle className="w-8 h-8 text-[#00FF87]" />
          <div>
            <h3 className="text-xl font-bold">Infraestrutura Operacional</h3>
            <p className="text-white/40 text-sm">
              Rota registrada com sucesso. Você tem controle total do sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}