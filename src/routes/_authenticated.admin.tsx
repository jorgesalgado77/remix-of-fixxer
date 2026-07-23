import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { 
  ShieldCheck, 
  Users, 
  FileText, 
  DollarSign, 
  Activity, 
  CheckCircle,
  Filter,
  Search,
  Truck,
  AlertTriangle,
  Eye,
  MapPin,
  Star,
  MoreVertical,
  CheckCircle2,
  User
} from "lucide-react";
import { usePerformanceMode } from "@/hooks/use-performance-mode";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminDashboardComponent,
});


export function AdminDashboardComponent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const { glassClass } = usePerformanceMode();

  // Estados do Feed Global Admin
  const [activeTab, setActiveTab] = useState<"os" | "fornecedores" | "prestadores" | "ocorrencias" | "categorias">("os");
  const [selectedCategory, setSelectedCategory] = useState("todas");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const checkAdminAccess = async () => {
      const email = typeof window !== 'undefined' ? localStorage.getItem('fixxer_user_email') || '' : '';
      const role = typeof window !== 'undefined' ? localStorage.getItem('fixxer_user_role') || '' : '';
      
      if (email.trim() !== 'jorgericardosalgado@gmail.com' && role.toLowerCase() !== 'admin') {
        console.warn("[ADMIN SECURITY]: Acesso negado. Redirecionando para a Dashboard...");
        navigate({ to: '/dashboard' as any });
        return;
      }
      setLoading(false);
    };

    checkAdminAccess();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#00FF87] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 font-medium animate-pulse uppercase text-[10px] tracking-widest">
            Autenticando Master FIXXER...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-24">
      {/* Header Admin */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00FF87]/10 border border-[#00FF87]/20 text-[#00FF87] text-[10px] font-black uppercase tracking-tighter italic">
            <ShieldCheck className="w-3 h-3" />
            FIXXER Master Admin Dashboard
          </div>
          <div className="flex flex-col">
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
              PAINEL <span className="text-[#00FF87]">ADMINISTRATIVO</span>
            </h1>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest max-w-md">
              Gestão global de usuários, auditoria de O.S. e controle da plataforma.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              const el = document.getElementById('admin-feed-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#00FF87] text-black font-black uppercase italic text-xs tracking-widest hover:shadow-[0_0_20px_rgba(0,255,135,0.4)] transition-all group"
          >
            <Activity className="w-4 h-4 group-hover:animate-pulse" />
            Acessar Feed da Categoria
          </button>
          <Link to="/_authenticated/profile" className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all">
            <User className="w-5 h-5" />
          </Link>
        </div>
      </div>


      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-5 h-5 text-[#00FF87]" />} label="Usuários" value="1,240" color="bg-[#00FF87]/10" />
        <StatCard icon={<FileText className="w-5 h-5 text-blue-500" />} label="O.S. Totais" value="482" color="bg-blue-500/10" />
        <StatCard icon={<DollarSign className="w-5 h-5 text-yellow-500" />} label="Volume" value="R$ 125k" color="bg-yellow-500/10" />
        <StatCard icon={<AlertTriangle className="w-5 h-5 text-red-500" />} label="Disputas" value="03" color="bg-red-500/10" />
      </div>

      <div id="admin-feed-section" className="pt-8 space-y-8">
        {/* Barra de Filtros Operacionais */}
        <div className={`${glassClass} border border-white/5 rounded-3xl p-4 md:p-6 space-y-4`}>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex items-center gap-3 p-3 rounded-2xl bg-black/40 border border-white/10 group focus-within:border-[#00FF87]/50 transition-all">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Pesquisar por ID, Nome ou E-mail..." 
                className="bg-transparent border-none outline-none text-xs text-white w-full font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/40 border border-white/10">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select 
                className="bg-transparent border-none outline-none text-[10px] font-black uppercase text-white w-full md:w-40 appearance-none cursor-pointer"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="todas">Todas Categorias</option>
                <option value="lojista">Lojistas</option>
                <option value="prestador">Prestadores</option>
                <option value="fornecedor">Fornecedores</option>
                <option value="casual">Casuais</option>
              </select>
            </div>
          </div>

          {/* Abas de Navegação (Scroll Invisível Mobile) */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none md:justify-start">
            <TabButton active={activeTab === 'os'} onClick={() => setActiveTab('os')} label="📋 Ordens de Serviço" icon={<FileText className="w-3 h-3" />} />
            <TabButton active={activeTab === 'fornecedores'} onClick={() => setActiveTab('fornecedores')} label="🏬 Insumos B2B" icon={<Truck className="w-3 h-3" />} />
            <TabButton active={activeTab === 'prestadores'} onClick={() => setActiveTab('prestadores')} label="🛠️ Profissionais" icon={<Users className="w-3 h-3" />} />
            <TabButton active={activeTab === 'categorias'} onClick={() => setActiveTab('categorias')} label="📂 Categorias Globais" icon={<Filter className="w-3 h-3" />} />
            <TabButton active={activeTab === 'ocorrencias'} onClick={() => setActiveTab('ocorrencias')} label="⚠️ Auditoria" icon={<AlertTriangle className="w-3 h-3" />} />
          </div>
        </div>

        <div id="ts-visual-edit-probe-b218f2b25fc14b9a" className="hidden">
          onde esta o acesso ao feed do administrador, dentro do painel administrativo ? crie o botão para esse acesso
        </div>


        {/* Listagem de Conteúdo do Admin */}
        <div className="space-y-4">
          {activeTab === 'os' && (
            <>
              <AdminCard 
                type="OS"
                id="OS-2490"
                title="Montagem Dormitório Casal"
                owner="Móveis Premium Ltda"
                ownerType="Lojista"
                value="R$ 450,00"
                status="Em Execução"
                location="São Paulo/SP"
                assignedTo="Jorge Ricardo (Prestador)"
                onAction={() => {}}
              />
              <AdminCard 
                type="OS"
                id="OS-2512"
                title="Adequação Elétrica Cozinha"
                owner="Carlos Silva"
                ownerType="Casual"
                value="R$ 180,00"
                status="Pendente"
                location="São Bernardo/SP"
                onAction={() => {}}
              />
            </>
          )}

          {activeTab === 'fornecedores' && (
            <AdminCard 
              type="B2B"
              id="B2B-102"
              title="Lote Ferragens Italianas"
              owner="Ferragens Global"
              ownerType="Fornecedor"
              value="R$ 12.500,00"
              status="Em Análise"
              location="Curitiba/PR"
              onAction={() => {}}
            />
          )}

          {activeTab === 'prestadores' && (
            <AdminCard 
              type="USER"
              id="USR-442"
              title="Conferente Técnico Pleno"
              owner="Marcos Oliveira"
              ownerType="Prestador"
              value="Rating 4.9"
              status="Validado"
              location="Rio de Janeiro/RJ"
              onAction={() => {}}
            />
          )}

          {activeTab === 'ocorrencias' && (
            <AdminCard 
              type="ALERT"
              id="DISP-03"
              title="Avaliação Baixa (1.5★)"
              owner="Cliente ➔ Prestador"
              ownerType="Crítico"
              value="Disputa Aberta"
              status="Mediação"
              location="OS-2410"
              onAction={() => {}}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  return (
    <div className="bg-[#1A1A1A]/80 backdrop-blur-xl border border-white/5 p-4 rounded-3xl group hover:border-[#00FF87]/30 transition-all">
      <div className={`w-10 h-10 rounded-2xl ${color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div className="space-y-0.5">
        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">{label}</span>
        <span className="text-xl font-black text-white italic tracking-tighter">{value}</span>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, icon }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase italic transition-all shrink-0 border ${
        active 
          ? 'bg-[#00FF87] text-black border-[#00FF87] shadow-[0_0_15px_rgba(0,255,135,0.3)]' 
          : 'bg-white/5 text-muted-foreground border-white/10 hover:border-white/20'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function AdminCard({ type, id, title, owner, ownerType, value, status, location, assignedTo, onAction }: any) {
  return (
    <div className="bg-[#1A1A1A]/80 backdrop-blur-xl border border-white/5 p-5 rounded-3xl hover:border-[#00FF87]/30 transition-all group relative overflow-hidden">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-[10px] font-black italic ${type === 'ALERT' ? 'text-red-500' : 'text-[#00FF87]'}`}>
            {type}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-[#00FF87] uppercase italic">{id}</span>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-widest ${
                status === 'Em Execução' || status === 'Validado' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                status === 'Pendente' || status === 'Em Análise' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                {status}
              </span>
            </div>
            <h3 className="text-sm font-black text-white uppercase italic mt-0.5">{title}</h3>
          </div>
        </div>
        <button className="p-2 text-muted-foreground hover:text-white transition-colors">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-4 border-y border-white/5">
        <div className="flex flex-col gap-1">
          <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Solicitante</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-white italic truncate">{owner}</span>
            <span className="text-[7px] px-1 bg-white/5 rounded text-muted-foreground uppercase font-bold">{ownerType}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Valor/Info</span>
          <span className="text-[10px] font-black text-white italic">{value}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Localização</span>
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-[#00FF87]" />
            <span className="text-[10px] font-black text-white italic truncate">{location}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Atribuição</span>
          <span className="text-[10px] font-black text-white italic truncate">{assignedTo || '—'}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          {type === 'OS' && status === 'Concluída' && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#00FF87]/10 border border-[#00FF87]/20">
              <CheckCircle2 className="w-3 h-3 text-[#00FF87]" />
              <span className="text-[8px] font-black text-[#00FF87] uppercase italic">Custódia Liberada</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-black uppercase italic transition-all">
            <Eye className="w-3.5 h-3.5" /> Inspecionar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00FF87] text-black font-black uppercase italic text-[9px] hover:shadow-[0_0_15px_rgba(0,255,135,0.4)] transition-all">
            Ação Rápida
          </button>
        </div>
      </div>
    </div>
  );
}
