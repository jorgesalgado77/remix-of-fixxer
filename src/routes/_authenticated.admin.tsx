import { createFileRoute, Outlet, Link, redirect, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { usePerformanceMode } from "@/hooks/use-performance-mode";
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  AlertTriangle,
  Menu,
  X,
  CreditCard,
  ChevronRight,
  Database
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    // PROTEÇÃO CRÍTICA: Apenas o administrador master tem acesso ao painel admin
    const { data: { session } } = await supabase.auth.getSession();
    
    let storedEmail = null;
    if (typeof window !== 'undefined') {
      storedEmail = localStorage.getItem('fixxer_user_email');
    }
    
    const userEmail = session?.user?.email || storedEmail;

    if (!userEmail || userEmail !== 'jorgericardosalgado@gmail.com') {
      console.warn("[FIXXER SECURITY]: Acesso negado ao painel admin para:", userEmail);
      throw redirect({ to: "/dashboard" });
    }

    return { userEmail };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { glassClass } = usePerformanceMode();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkConn = async () => {
      const { error } = await supabase.from('admin_config').select('id').limit(1);
      if (error) {
        toast.error("ALERTA: Conexão Supabase Inativa", {
          description: "O painel administrativo pode não funcionar corretamente.",
          duration: 10000,
        });
      } else {
        toast.success("Conexão Supabase Ativa", {
          description: "Status do banco: 100% operacional.",
          duration: 3000,
        });
      }
    };
    checkConn();
  }, []);

  return (
    <div className="flex h-[calc(100vh-65px)] bg-background">
      {/* Sidebar Administrativa */}
      <aside className={`
        ${isSidebarOpen ? 'w-64' : 'w-20'} 
        transition-all duration-300 border-r border-white/5 bg-black/20 backdrop-blur-xl flex flex-col
      `}>
        <div className="p-4 flex justify-between items-center">
          {isSidebarOpen && <span className="font-black text-primary text-xs tracking-widest uppercase">Admin Panel</span>}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/5 rounded-lg text-muted-foreground">
            {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <AdminNavItem 
            to="/admin" 
            icon={<LayoutDashboard className="w-4 h-4" />} 
            label="Dashboard" 
            isOpen={isSidebarOpen} 
            active={location.pathname === '/admin'} 
          />
          <AdminNavItem 
            to="/admin/users" 
            icon={<Users className="w-4 h-4" />} 
            label="Usuários" 
            isOpen={isSidebarOpen} 
            active={location.pathname === '/admin/users'} 
          />
          <AdminNavItem 
            to="/admin/plans" 
            icon={<CreditCard className="w-4 h-4" />} 
            label="Planos" 
            isOpen={isSidebarOpen} 
            active={location.pathname === '/admin/plans'} 
          />
          <AdminNavItem 
            to="/admin/integrations" 
            icon={<Settings className="w-4 h-4" />} 
            label="Integrações" 
            isOpen={isSidebarOpen} 
            active={location.pathname === '/admin/integrations'} 
          />
          <AdminNavItem 
            to="/admin" 
            icon={<AlertTriangle className="w-4 h-4" />} 
            label="Segurança" 
            isOpen={isSidebarOpen} 
            active={false} 
          />
        </nav>
      </aside>

      {/* Área de Conteúdo */}
      <main className="flex-1 overflow-auto p-4 md:p-8 bg-[#0a0a0c]">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function AdminNavItem({ to, icon, label, isOpen, active = false }: { to: string, icon: any, label: string, isOpen: boolean, active?: boolean }) {
  return (
    <Link 
      to={to}
      className={`
        w-full flex items-center gap-4 p-3 rounded-xl transition-all
        ${active ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,255,135,0.2)]' : 'text-muted-foreground hover:bg-white/5 hover:text-white'}
      `}
    >
      <div className="shrink-0">{icon}</div>
      {isOpen && <span className="text-sm font-bold">{label}</span>}
    </Link>
  );
}
