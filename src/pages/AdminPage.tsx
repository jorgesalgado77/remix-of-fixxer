import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Users, FileText, DollarSign, Activity, CheckCircle, LogOut } from "lucide-react";

export function AdminPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const email = (localStorage.getItem("fixxer_user_email") || "").trim().toLowerCase();
    const role = localStorage.getItem("fixxer_user_role");

    if (email !== "jorgericardosalgado@gmail.com" && role !== "Admin") {
      navigate("/dashboard");
    } else {
      setLoading(false);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center text-[#00FF87] font-black italic uppercase tracking-tighter">
        Verificando Acesso Master...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      {/* Top Navbar */}
      <div className="border-b border-white/5 bg-[#111]/50 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#00FF87] rounded-lg flex items-center justify-center text-black font-black text-xl shadow-[0_0_15px_rgba(0,255,135,0.3)]">
            F
          </div>
          <div className="font-black text-xl tracking-tighter italic uppercase text-white">FIXXER</div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
            <ShieldCheck className="w-4 h-4 text-[#00FF87]" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Acesso Privilegiado Master</span>
          </div>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-white/40 hover:text-red-500 transition-colors text-[10px] font-bold uppercase tracking-widest"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-10">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 text-[#00FF87] bg-[#00FF87]/10 px-4 py-2 rounded-full border border-[#00FF87]/20">
            <Activity className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest">Monitoramento em Tempo Real</span>
          </div>

          <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter">
            Painel Administrativo Master
          </h1>
          <p className="text-white/40 text-lg max-w-2xl leading-relaxed">
            Gestão global de usuários, O.S., auditoria e controle do ecossistema FIXXER.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#1A1A1B] border border-white/10 p-8 rounded-[2rem] space-y-4 relative overflow-hidden group hover:border-[#00FF87]/20 transition-all">
            <Users className="w-8 h-8 text-[#00FF87] relative z-10" />
            <div className="space-y-1 relative z-10">
              <div className="text-4xl font-black text-white">--</div>
              <div className="text-xs font-bold uppercase tracking-widest text-white/30">Usuários Totais</div>
            </div>
          </div>

          <div className="bg-[#1A1A1B] border border-white/10 p-8 rounded-[2rem] space-y-4 relative overflow-hidden group hover:border-[#00FF87]/20 transition-all">
            <FileText className="w-8 h-8 text-[#00FF87] relative z-10" />
            <div className="space-y-1 relative z-10">
              <div className="text-4xl font-black text-white">--</div>
              <div className="text-xs font-bold uppercase tracking-widest text-white/30">O.S. Ativas</div>
            </div>
          </div>

          <div className="bg-[#1A1A1B] border border-white/10 p-8 rounded-[2rem] space-y-4 relative overflow-hidden group hover:border-[#00FF87]/20 transition-all">
            <DollarSign className="w-8 h-8 text-[#00FF87] relative z-10" />
            <div className="space-y-1 relative z-10">
              <div className="text-4xl font-black text-white">R$ 0,00</div>
              <div className="text-xs font-bold uppercase tracking-widest text-white/30">Volume Transacionado</div>
            </div>
          </div>

          <div className="bg-[#1A1A1B] border border-white/10 p-8 rounded-[2rem] space-y-4 relative overflow-hidden group hover:border-[#00FF87]/20 transition-all">
            <CheckCircle className="w-8 h-8 text-[#00FF87] relative z-10" />
            <div className="space-y-1 relative z-10">
              <div className="text-4xl font-black text-white">100%</div>
              <div className="text-xs font-bold uppercase tracking-widest text-white/30">Status da Infraestrutura</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#1A1A1B] border border-white/10 p-8 rounded-[2rem]">
            <h3 className="text-xl font-black italic uppercase mb-6">Auditoria de Atividades</h3>
            <div className="space-y-4">
              <div className="text-white/20 text-sm italic">Nenhuma atividade recente registrada no log master.</div>
            </div>
          </div>
          
          <div className="bg-[#1A1A1B] border border-white/10 p-8 rounded-[2rem] space-y-6">
            <h3 className="text-xl font-black italic uppercase">Ações Rápidas</h3>
            <button className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-widest">
              Configurações Globais
            </button>
            <button className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-widest">
              Exportar Relatórios
            </button>
            <button onClick={() => navigate('/dashboard')} className="w-full bg-[#00FF87]/10 hover:bg-[#00FF87]/20 border border-[#00FF87]/30 text-[#00FF87] font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-widest">
              Voltar para Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
