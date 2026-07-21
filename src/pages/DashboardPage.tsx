import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Users, FileText, DollarSign, Activity, CheckCircle, LogOut } from "lucide-react";

export function DashboardPage() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const email = (localStorage.getItem("fixxer_user_email") || "").trim().toLowerCase();
    const role = (localStorage.getItem("fixxer_user_role") || "").toLowerCase();

    if (email === "jorgericardosalgado@gmail.com") {
      setIsAdmin(true);
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center text-[#00FF87] font-black italic uppercase tracking-tighter">
        Carregando Painel FIXXER...
      </div>
    );
  }

  // DASHBOARD OPERACIONAL UNIFICADA
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
          {isAdmin && (
            <button 
              onClick={() => navigate("/admin")}
              className="flex items-center gap-2 bg-[#00FF87]/10 px-3 py-1.5 rounded-full border border-[#00FF87]/20 text-[#00FF87] hover:bg-[#00FF87]/20 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Painel Admin</span>
            </button>
          )}

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
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">
            Dashboard Operacional
          </h1>
          <p className="text-white/40 text-lg max-w-2xl leading-relaxed">
            Bem-vindo à plataforma FIXXER. Aqui você pode gerenciar suas solicitações e acompanhar o progresso das O.S.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#1A1A1B] border border-white/10 p-8 rounded-[2rem] space-y-4">
            <FileText className="w-8 h-8 text-[#00FF87]" />
            <div className="space-y-1">
              <div className="text-3xl font-black text-white">--</div>
              <div className="text-xs font-bold uppercase tracking-widest text-white/30">Minhas O.S.</div>
            </div>
          </div>

          <div className="bg-[#1A1A1B] border border-white/10 p-8 rounded-[2rem] space-y-4">
            <Activity className="w-8 h-8 text-[#00FF87]" />
            <div className="space-y-1">
              <div className="text-3xl font-black text-white">Ativo</div>
              <div className="text-xs font-bold uppercase tracking-widest text-white/30">Status da Conta</div>
            </div>
          </div>

          <div className="bg-[#1A1A1B] border border-white/10 p-8 rounded-[2rem] space-y-4">
            <CheckCircle className="w-8 h-8 text-[#00FF87]" />
            <div className="space-y-1">
              <div className="text-3xl font-black text-white">--</div>
              <div className="text-xs font-bold uppercase tracking-widest text-white/30">Solicitações Ativas</div>
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1B] border border-white/10 p-10 rounded-[2.5rem]">
          <h3 className="text-xl font-black italic uppercase mb-6">Feed de Atualizações</h3>
          <div className="text-white/20 text-sm italic">Nenhuma atualização disponível no momento.</div>
        </div>
      </div>
    </div>
  );
}

