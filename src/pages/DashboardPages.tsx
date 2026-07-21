import { Navbar } from "../components/Navbar";
import { Activity, Users, FileText, DollarSign, CheckCircle, Search, Filter } from "lucide-react";

export function AdminPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-10">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-[#00FF87] bg-[#00FF87]/10 px-4 py-2 rounded-full border border-[#00FF87]/20">
            <Activity className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest">Acesso Privilegiado Master</span>
          </div>
          <h1 className="text-5xl font-black italic uppercase tracking-tighter">Painel Admin Master</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Usuários Totais", value: "1,240", icon: Users },
            { label: "O.S. Ativas", value: "382", icon: FileText },
            { label: "Volume (R$)", value: "R$ 45.2k", icon: DollarSign },
            { label: "Status Sistema", value: "100%", icon: CheckCircle },
          ].map((item, i) => (
            <div key={i} className="bg-[#1A1A1B] border border-white/10 p-8 rounded-[2rem] space-y-4">
              <item.icon className="w-8 h-8 text-[#00FF87]" />
              <div className="space-y-1">
                <div className="text-3xl font-black">{item.value}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-white/30">{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FeedPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-black italic uppercase">Feed Operacional</h1>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="flex-1 md:w-64 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input placeholder="Buscar O.S..." className="w-full bg-[#1A1A1B] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-[#00FF87]" />
            </div>
            <button className="bg-[#1A1A1B] border border-white/10 p-3 rounded-xl hover:bg-white/5 transition-all">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-[#1A1A1B] border border-white/10 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-white/20 transition-all">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase bg-[#00FF87]/10 text-[#00FF87] px-2 py-1 rounded">Pendente</span>
                  <span className="text-white/40 text-[10px] font-bold uppercase">OS #2839 - Há 2h</span>
                </div>
                <h3 className="font-bold text-lg">Montagem de Cozinha Planejada</h3>
                <p className="text-white/40 text-sm">Rua das Flores, 123 - São Paulo/SP</p>
              </div>
              <button className="w-full md:w-auto bg-white/5 hover:bg-white/10 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all">
                Ver Detalhes
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LojistaPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto p-6 space-y-10">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Dashboard Lojista</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-[#1A1A1B] border border-white/10 p-8 rounded-[2rem] space-y-4">
            <h3 className="font-black italic uppercase text-[#00FF87]">Ações Rápidas</h3>
            <button className="w-full bg-[#00FF87] text-black font-black py-4 rounded-xl uppercase text-[10px] tracking-widest">Nova Solicitação de Serviço</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PrestadorPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto p-6 space-y-10">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Dashboard Prestador</h1>
        <div className="bg-[#1A1A1B] border border-white/10 p-10 rounded-[2.5rem] text-center space-y-4">
          <Activity className="w-12 h-12 text-[#00FF87] mx-auto" />
          <h2 className="text-2xl font-black italic uppercase">Buscando novas O.S...</h2>
          <p className="text-white/40 max-w-md mx-auto">Suas O.S. aceitas aparecerão aqui. Fique atento ao feed operacional para novas oportunidades.</p>
        </div>
      </div>
    </div>
  );
}

export function ParceiroPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto p-6 space-y-10">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Dashboard Parceiro</h1>
        <div className="bg-[#1A1A1B] border border-white/10 p-10 rounded-[2.5rem]">
          <p className="text-white/40">Catálogo de Insumos e Peças em desenvolvimento.</p>
        </div>
      </div>
    </div>
  );
}

export function ClientePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto p-6 space-y-10">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Minhas Montagens</h1>
        <div className="bg-[#1A1A1B] border border-white/10 p-8 rounded-2xl">
          <p className="text-white/40">Acompanhe aqui o progresso do seu serviço.</p>
        </div>
      </div>
    </div>
  );
}
