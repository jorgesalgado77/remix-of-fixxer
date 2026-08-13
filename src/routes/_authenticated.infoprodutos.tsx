import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { 
  BookOpen, 
  Package, 
  Plus, 
  TrendingUp, 
  ChevronRight, 
  LayoutGrid,
  Settings,
  AlertCircle,
  Clock,
  CheckCircle2,
  MoreVertical,
  Edit,
  Eye,
  Trash2,
  Pause,
  Play,
  Archive,
  Zap
} from 'lucide-react';
import { ProfileHeader } from '@/components/ProfileHeader';
import { PanelActions } from '@/components/PanelActions';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export const Route = createFileRoute('/_authenticated/infoprodutos')({
  component: CreatorStudioPage,
});

function CreatorStudioPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'products' | 'sales' | 'analytics' | 'coupons'>('products');

  return (
    <div className="min-h-screen bg-background pb-32">
      <ProfileHeader role="prestador" title="CREATOR STUDIO" subtitle="Gestão de Info Produtos e Vendas" />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10 space-y-8">
        {/* MENU NAVEGAÇÃO CREATOR */}
        <div className="flex items-center gap-2 p-1.5 bg-white/[0.03] border border-white/10 rounded-2xl w-fit backdrop-blur-xl overflow-x-auto max-w-full no-scrollbar">
          <TabButton 
            active={activeTab === 'products'} 
            onClick={() => setActiveTab('products')}
            icon={<Package className="w-4 h-4" />}
            label="Produtos"
          />
          <TabButton 
            active={activeTab === 'sales'} 
            onClick={() => setActiveTab('sales')}
            icon={<TrendingUp className="w-4 h-4" />}
            label="Vendas"
          />
          <TabButton 
            active={activeTab === 'analytics'} 
            onClick={() => setActiveTab('analytics')}
            icon={<LayoutGrid className="w-4 h-4" />}
            label="Analytics"
          />
          <TabButton 
            active={activeTab === 'coupons'} 
            onClick={() => setActiveTab('coupons')}
            icon={<Zap className="w-4 h-4 text-amber-400" />}
            label="Cupons"
          />
        </div>

        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Seus Info Produtos</h2>
                <p className="text-muted-foreground text-sm">Gerencie seus e-books, aulas e cursos digitais.</p>
              </div>
              
              <Button 
                onClick={() => toast.info('Fluxo de criação em desenvolvimento')}
                className="bg-primary text-primary-foreground font-black px-6 py-6 rounded-2xl shadow-[0_0_20px_rgba(0,255,135,0.3)] hover:scale-105 transition-all uppercase tracking-widest text-xs gap-2"
                title="Criar novo info produto — comece a vender seu conhecimento agora"
              >
                <Plus className="w-4 h-4" />
                Criar Produto
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               <EmptyState />
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard 
                label="Receita Bruta" 
                value="R$ 0,00" 
                icon={<TrendingUp className="text-emerald-400" />} 
                tip="Total acumulado de vendas antes das taxas."
              />
              <MetricCard 
                label="Receita Líquida" 
                value="R$ 0,00" 
                icon={<CheckCircle2 className="text-primary" />} 
                tip="Valor disponível para saque (85% do bruto)."
              />
              <MetricCard 
                label="Conversão" 
                value="0%" 
                icon={<Zap className="text-amber-400" />} 
                tip="Percentual de visitantes que realizaram a compra."
              />
              <MetricCard 
                label="Avaliações" 
                value="0.0" 
                icon={<LayoutGrid className="text-blue-400" />} 
                tip="Média de satisfação dos seus alunos."
              />
            </div>
            
            <div className="py-20 text-center space-y-4 bg-white/[0.02] border border-dashed border-white/10 rounded-[32px]">
              <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto" />
              <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm text-center px-4">Gráficos de desempenho em processamento...</p>
            </div>
          </div>
        )}
        
        {(activeTab === 'sales' || activeTab === 'coupons') && (
           <div className="py-20 text-center space-y-4 bg-white/[0.02] border border-dashed border-white/10 rounded-[32px]">
             <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto" />
             <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">Gestão de {activeTab === 'sales' ? 'Vendas' : 'Cupons'} em breve.</p>
           </div>
        )}
      </main>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <PanelActions role="prestador" />
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, tip }: { label: string; value: string; icon: React.ReactNode; tip: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/10 p-5 rounded-[24px] space-y-3 relative group overflow-hidden shadow-xl" title={tip}>
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{label}</p>
        <p className="text-xl font-black text-white italic tracking-tighter mt-0.5">{value}</p>
      </div>
      <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <AlertCircle className="w-3 h-3 text-muted-foreground/50" />
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
        active 
          ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,255,135,0.2)]' 
          : 'text-muted-foreground hover:text-white hover:bg-white/5'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full py-24 flex flex-col items-center justify-center text-center space-y-6 bg-white/[0.02] border border-dashed border-white/10 rounded-[40px]">
      <div className="w-20 h-20 bg-white/5 rounded-[32px] flex items-center justify-center text-muted-foreground/40">
        <BookOpen className="w-10 h-10" />
      </div>
      <div className="space-y-2 max-w-sm">
        <h3 className="text-xl font-bold text-white uppercase tracking-tight">Nenhum produto ainda</h3>
        <p className="text-sm text-muted-foreground">Você ainda não criou nenhum produto digital. Transforme seu conhecimento em renda passiva hoje mesmo.</p>
      </div>
    </div>
  );
}
