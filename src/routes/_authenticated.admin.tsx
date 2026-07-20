import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { usePerformanceMode } from "@/hooks/use-performance-mode";
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  ShieldAlert,
  Menu,
  X,
  ChevronRight
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'admin') {
      throw redirect({ to: "/dashboard" });
    }
    
    return { profile };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { glassClass } = usePerformanceMode();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
          <AdminNavItem icon={<LayoutDashboard />} label="Dashboard" isOpen={isSidebarOpen} active />
          <AdminNavItem icon={<Users />} label="Usuários" isOpen={isSidebarOpen} />
          <AdminNavItem icon={<ShieldAlert />} label="Segurança" isOpen={isSidebarOpen} />
          <AdminNavItem icon={<Settings />} label="Configurações" isOpen={isSidebarOpen} />
        </nav>
      </aside>

      {/* Área de Conteúdo */}
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}

function AdminNavItem({ icon, label, isOpen, active = false }: { icon: any, label: string, isOpen: boolean, active?: boolean }) {
  return (
    <button className={`
      w-full flex items-center gap-4 p-3 rounded-xl transition-all
      ${active ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,255,135,0.2)]' : 'text-muted-foreground hover:bg-white/5 hover:text-white'}
    `}>
      <div className="shrink-0">{icon}</div>
      {isOpen && <span className="text-sm font-bold">{label}</span>}
    </button>
  );
}
