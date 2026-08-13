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
  Archive
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
  const [activeTab, setActiveTab] = useState<'products' | 'sales' | 'analytics'>('products');

  return (
    <div className="min-h-screen bg-background pb-32">
      <ProfileHeader role="prestador" title={<>CREATOR <span className="text-primary">STUDIO</span></>} subtitle="Gestão de Info Produtos e Vendas" />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10 space-y-8">
        {/* MENU NAVEGAÇÃO CREATOR */}
        <div className="flex items-center gap-2 p-1 bg-white/[0.03] border border-white/10 rounded-2xl w-fit backdrop-blur-xl">
          <TabButton 
            active={activeTab === 'products'} 
            onClick={() => setActiveTab('products')}
            icon={<Package className="w-4 h-4" />}
            label="Meus Produtos"
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

            {/* LISTAGEM DE PRODUTOS (PLACEHOLDER REAL) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               <EmptyState />
            </div>
          </div>
        )}
        
        {/* Placeholder para outras abas */}
        {activeTab !== 'products' && (
           <div className="py-20 text-center space-y-4 bg-white/[0.02] border border-dashed border-white/10 rounded-[32px]">
             <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto" />
             <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">Em breve: {activeTab === 'sales' ? 'Gestão de Vendas' : 'Analytics Detalhado'}</p>
           </div>
        )}
      </main>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <PanelActions role="prestador" />
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
