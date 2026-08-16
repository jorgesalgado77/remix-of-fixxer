import { createFileRoute, Outlet, Link, useNavigate, useRouterState, redirect } from "@tanstack/react-router";
import { User, Rss, LayoutDashboard, ShieldCheck, LogOut, Users, FileText, DollarSign, Activity, CheckCircle, HelpCircle } from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { getCurrentUser, isCurrentUserAdmin, isCurrentUserAdminSync, clearCurrentUserCache, useCurrentUser, useIsAdmin } from "@/lib/current-user";
import { useEffect, useState, lazy, Suspense } from "react";
import { toast } from "sonner";
import { useCurrentCategory, getCategoryCssVars } from "@/lib/user-category";
import { useProviderStats } from "@/hooks/use-provider-stats";
import { InfoAdminSection } from "@/components/admin/InfoAdminSection";

const PixManagerModal = lazy(() => import("@/components/PixManagerModal").then(m => ({ default: m.PixManagerModal })));


export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    console.log("[Route Guard] Running beforeLoad for:", location.pathname);
    
    // 1. Bypass Master Admin
    const emailMaster = 'jorgericardosalgado@gmail.com';
    const isMasterEmail = 'jorgericardosalgado@gmail.com';
    const hasMasterBypass = typeof window !== 'undefined' && localStorage.getItem('fixxer:master-bypass') === 'true';
    
    console.log("[Route Guard] Bypass Info:", { hasMasterBypass, location: location.pathname });

    // 2. Verificação de Usuário via storage
    let session = null;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('fixxer-auth-token-v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.user || parsed.session?.user)) {
            session = parsed.session || parsed;
          }
        }
        
        if (!session && !hasMasterBypass) {
          const { data } = await supabaseExternal.auth.getSession();
          session = data.session;
        }
      } catch (e) {
        console.warn("[Route Guard] Erro ao ler sessão:", e);
      }
    }
    
    const user = session?.user;

    // 3. LOGICA DE REDIRECIONAMENTO E BYPASS
    if (user || hasMasterBypass) {
      console.log("[Route Guard] Usuário autenticado:", user?.email || 'Master Bypass');
      
      // Se o usuário está logado e tenta acessar /auth, mandamos para o feed
      if (location.pathname === '/auth' || location.pathname === '/auth/' || location.pathname.startsWith('/auth/')) {
        console.log("[Route Guard] Redirecionando usuário logado de /auth para /feed via window.location");
        if (typeof window !== 'undefined') {
          // Pequeno delay para garantir que o token no localStorage esteja estável
          setTimeout(() => {
            window.location.href = window.location.origin + '/feed';
          }, 100);
          return { userId: '', userEmail: '', isAdmin: false, bypass: false }; 
        }
        throw redirect({ to: "/feed" as any });
      }

      // Verificação de Admin (Resiliente)
      let isAdmin = hasMasterBypass;
      if (!isAdmin && user) {
        if (user.email?.toLowerCase() === emailMaster) {
          isAdmin = true;
        } else {
          isAdmin = isCurrentUserAdminSync() || await isCurrentUserAdmin().catch(() => false);
        }
      }

      return { 
        userId: user?.id ?? '6ba65048-803f-44f6-88d2-24d04fee1a0f', 
        userEmail: user?.email ?? emailMaster, 
        isAdmin, 
        bypass: hasMasterBypass 
      };
    }

    // 4. Se não estiver no /auth e não tiver sessão, redireciona para o login
    if (location.pathname === '/auth' || location.pathname === '/auth/') {
      return { userId: '', userEmail: '', isAdmin: false, bypass: false };
    }

    if (!location.pathname.startsWith('/auth')) {
      console.warn("[Route Guard] Sessão ausente. Redirecionando para /auth.");
      // Limpamos o cache para garantir que não haja resquícios de sessões anteriores
      clearCurrentUserCache();
      throw redirect({ to: "/auth" as any });
    }
    
    return { userId: '', userEmail: '', isAdmin: false, bypass: false };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useCurrentUser();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const currentCategory = useCurrentCategory();
  const providerStats = useProviderStats();
  const [showPixModal, setShowPixModal] = useState(false);

  const hasMasterBypass = typeof window !== 'undefined' && localStorage.getItem('fixxer:master-bypass') === 'true';
  const email = hasMasterBypass ? 'jorgericardosalgado@gmail.com' : (user?.email ?? '');

  useEffect(() => {
    const handlePixModalEvent = (e: any) => {
      console.log("[AuthenticatedLayout] Evento fixxer:open-pix-modal recebido", e);
      setShowPixModal(true);
    };
    window.addEventListener('fixxer:open-pix-modal', handlePixModalEvent);
    return () => window.removeEventListener('fixxer:open-pix-modal', handlePixModalEvent);
  }, []);

  useEffect(() => {
    // Se estiver carregando ou se o usuário estiver nulo, não fazemos nada aqui
    // para evitar redirecionamentos prematuros. O guard beforeLoad cuida da primeira barreira.
    if (userLoading) return;
    
    const isMasterEmail = user?.email?.toLowerCase() === 'jorgericardosalgado@gmail.com';
    const hasMasterBypass = typeof window !== 'undefined' && localStorage.getItem('fixxer:master-bypass') === 'true';
    const isMaster = isMasterEmail || hasMasterBypass;
    
    // REDIRECT FIX: Forçamos a saída de /auth se houver usuário
    if ((user || isMaster) && (pathname === '/auth' || pathname === '/auth/')) {
      console.log("[AuthenticatedLayout] Login detectado. Navegando para /feed.");
      // Usamos replace e then catch para garantir a navegação
      navigate({ to: "/feed" as any, replace: true }).catch(() => {
        window.location.assign('/feed');
      });
      return;
    }

    // Se NÃO houver usuário, NÃO for Master E NÃO estiver no /auth
    if (!user && !isMaster && !pathname.startsWith('/auth')) {
      console.warn("[AuthenticatedLayout] Sessão ausente. Redirecionando para login.");
      window.location.assign("/auth");
      return;
    }
  }, [user, userLoading, pathname]);

  // SEGURANÇA DE ROTA: Validação de privilégios baseada na URL visitada vs Role real.
  useEffect(() => {
    if (adminLoading || userLoading) return;

    const isMasterEmail = user?.email?.toLowerCase() === 'jorgericardosalgado@gmail.com';
    const hasMasterBypass = typeof window !== 'undefined' && localStorage.getItem('fixxer:master-bypass') === 'true';
    const isMaster = isMasterEmail || hasMasterBypass;

    if (!user && !isMaster) return;

    // Se é master, ignora as validações de role do banco para evitar redirect 500
    if (isMaster) {
       if (pathname.startsWith('/admin')) {
         console.log("[Security Guard] Master Admin acessando rota administrativa via bypass.");
         return;
       }
    }

    const isPathAdmin = pathname.startsWith('/admin');
    const isPathLojista = pathname.startsWith('/lojista') || pathname.startsWith('/dashboard/lojista');
    const isPathPrestador = pathname.startsWith('/prestador') || pathname.startsWith('/dashboard/prestador');
    const isPathFornecedor = pathname.startsWith('/parceiro');
    const isPathCliente = pathname.startsWith('/cliente');

    // 1. Bloqueio Admin
    if (isPathAdmin && !isAdmin) {
      toast.error("Acesso restrito ao Administrador Master.");
      navigate({ to: "/feed" as any });
      return;
    }

    // 2. Bloqueios de Segmentação (Cross-Role Prevention)
    // Se o usuário tentar acessar um painel que não é o dele, redirecionamos para o feed/home.
    // O Administrador Master tem passe livre para auditoria.
    if (!isAdmin) {
      if (isPathLojista && currentCategory !== 'lojista') {
        toast.error("Acesso restrito a Lojistas.");
        navigate({ to: "/feed" as any });
      } else if (isPathPrestador && currentCategory !== 'prestador') {
        toast.error("Acesso restrito a Prestadores.");
        navigate({ to: "/feed" as any });
      } else if (isPathFornecedor && currentCategory !== 'fornecedor') {
        toast.error("Acesso restrito a Fornecedores.");
        navigate({ to: "/feed" as any });
      } else if (isPathCliente && currentCategory !== 'cliente') {
        toast.error("Acesso restrito a Clientes.");
        navigate({ to: "/feed" as any });
      }
    }
  }, [user, isAdmin, currentCategory, adminLoading, userLoading, pathname, navigate]);

  useEffect(() => {
    // Notificações Realtime para mudança de status
    const channel = supabaseExternal
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_orders',
        },
        (payload) => {
          if (payload.new && payload.old && payload.new.status !== payload.old.status) {
            toast.info("Status Atualizado!", {
              description: `A O.S. #${payload.new.id} mudou para ${payload.new.status}`,
              duration: 5000,
              icon: <Activity className="w-4 h-4" />
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabaseExternal.removeChannel(channel);
    };
  }, []);


  const showAdminPanel = pathname.startsWith('/admin');



  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" style={getCategoryCssVars(currentCategory)}>

      <nav className="border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-[60] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div onClick={() => navigate({ to: isAdmin ? "/admin" as any : "/feed" as any })} className="flex items-center gap-2 cursor-pointer group">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-black text-xl shadow-[0_0_15px_rgba(0,255,135,0.3)] group-hover:scale-110 transition-transform">
              F
            </div>
            <span className="font-bold tracking-tight text-white group-hover:text-primary transition-colors">FIXXER</span>
          </div>

          <Link
            to="/ajuda"
            className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors ${pathname === '/ajuda' ? 'text-primary' : 'text-muted-foreground hover:text-white'}`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Ajuda
          </Link>
        </div>


        <div className="flex items-center gap-2 md:gap-6">
          {isAdmin && (
            <div
              onClick={() => navigate({ to: "/admin" as any })}
              className={`text-[10px] md:text-xs font-black uppercase tracking-widest md:tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors ${showAdminPanel ? 'text-[#00FF87]' : 'text-muted-foreground hover:text-white'}`}
            >
              <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Admin</span>
            </div>
          )}

          {/* Dashboard removido conforme solicitado para mobile e desktop */}

          <div className="h-4 w-[1px] bg-white/10 mx-0.5 md:mx-1" />

          <button 
            onClick={async () => {
              try { await supabaseExternal.auth.signOut(); } catch {}
              clearCurrentUserCache();
              window.location.href = "/auth";
            }}
            className="text-[10px] md:text-xs font-black uppercase tracking-widest md:tracking-wider text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 md:px-4 md:py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(220,38,38,0.2)] hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] border border-red-500/30"
          >
            <LogOut className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span>Sair</span>
          </button>
        </div>
      </nav>

      <main className="flex-1">
        <Outlet />

        {showPixModal && (
          <Suspense fallback={null}>
            <PixManagerModal 
              open={showPixModal}
              onClose={() => setShowPixModal(false)}
              profile={{
                id: user?.id,
                display_name: user?.user_metadata?.display_name || user?.email?.split('@')[0],
                avatar_url: user?.user_metadata?.avatar_url,
                pix_key: user?.user_metadata?.pix_key
              }}
              stats={providerStats}
              isLoadingStats={providerStats.loading}
            />
          </Suspense>
        )}
      </main>
    </div>
  );
}