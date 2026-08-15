import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { User, Rss, LayoutDashboard, ShieldCheck, LogOut, Users, FileText, DollarSign, Activity, CheckCircle, HelpCircle } from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { getCurrentUser, isCurrentUserAdmin, clearCurrentUserCache, useCurrentUser, useIsAdmin } from "@/lib/current-user";
import { useEffect, useState, lazy, Suspense } from "react";
import { toast } from "sonner";
import { useCurrentCategory, getCategoryCssVars } from "@/lib/user-category";
import { useProviderStats } from "@/hooks/use-provider-stats";
import { InfoAdminSection } from "@/components/admin/InfoAdminSection";

const PixManagerModal = lazy(() => import("@/components/PixManagerModal").then(m => ({ default: m.PixManagerModal })));


export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    // Identidade sempre pela sessão real do Supabase (nunca por localStorage).
    const user = await getCurrentUser(true);
    return {
      userId: user?.id ?? null,
      userEmail: user?.email ?? null,
    };
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

  const email = user?.email ?? '';

  useEffect(() => {
    const handlePixModalEvent = (e: any) => {
      console.log("[AuthenticatedLayout] Evento fixxer:open-pix-modal recebido", e);
      setShowPixModal(true);
    };
    window.addEventListener('fixxer:open-pix-modal', handlePixModalEvent);
    return () => window.removeEventListener('fixxer:open-pix-modal', handlePixModalEvent);
  }, []);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      navigate({ to: "/auth" as any });
      return;
    }
  }, [user, userLoading, navigate]);

  // SEGURANÇA DE ROTA: Validação de privilégios baseada na URL visitada vs Role real.
  useEffect(() => {
    if (adminLoading || userLoading) return;
    if (!user) return;

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
        {/* RENDERIZAÇÃO DIRETA DO PAINEL ADMIN MASTER SE FOR O ADMINISTRADOR */}
        {showAdminPanel && isAdmin ? (
          <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card to-background border border-white/10 p-8 shadow-2xl">
              <div className="relative z-10">
                <div className="flex items-center gap-3 text-[#00FF87] mb-4">
                  <ShieldCheck className="w-6 h-6" />
                  <span className="text-sm font-bold uppercase tracking-widest">Acesso Privilegiado Master</span>
                </div>
                <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
                  Painel Administrativo Master
                </h1>
                <p className="text-muted-foreground max-w-2xl">
                  Gestão global de usuários, auditoria de O.S. e controle da plataforma FIXXER.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 rounded-3xl group hover:border-[#00FF87]/30 transition-all">
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-4 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <div className="text-3xl font-black text-white mb-1">--</div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Usuários Totais</div>
              </div>

              <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 rounded-3xl group hover:border-[#00FF87]/30 transition-all">
                <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500 mb-4 group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="text-3xl font-black text-white mb-1">--</div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">O.S. Ativas</div>
              </div>

              <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 rounded-3xl group hover:border-[#00FF87]/30 transition-all">
                <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 mb-4 group-hover:scale-110 transition-transform">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div className="text-3xl font-black text-white mb-1">R$ 0,00</div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Volume Transacionado</div>
              </div>

              <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-6 rounded-3xl group hover:border-[#00FF87]/30 transition-all">
                <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 mb-4 group-hover:scale-110 transition-transform">
                  <Activity className="w-6 h-6" />
                </div>
                <div className="text-3xl font-black text-white mb-1">100%</div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status do Sistema</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <InfoAdminSection />
               <div className="bg-card/50 backdrop-blur-xl border border-white/10 p-8 rounded-[40px] space-y-6 group hover:border-blue-500/30 transition-all flex flex-col justify-center items-center text-center opacity-50">
                  <ShieldCheck className="w-12 h-12 text-blue-500 mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Módulo Segurança & Auditoria em breve</p>
               </div>
            </div>

            <div className="bg-[#00FF87]/5 border border-[#00FF87]/20 p-6 rounded-3xl flex items-start gap-4">
              <CheckCircle className="w-6 h-6 text-[#00FF87] shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-[#00FF87]">Painel Master Conectado Direct-Render</h3>
                <p className="text-sm text-[#00FF87]/70">
                  O sistema ignorou erros de roteamento e carregou a dashboard do administrador diretamente.
                </p>
              </div>
              <div id="ts-visual-edit-probe-3f4bcf95f12749b9" className="hidden">LEIA OS RELATÓRIOS:\n\ndocs/FIXXER_CORE_BASELINE_AUDIT.md\n\ndocs/PROMPT_01_AUDIT.md\n\nOBJETIVO:\n\nConsolidar autenticação, papéis e autorização sem criar uma arquitetura paralela.\n\nPRIMEIRO:\n\nVerifique o banco real e descubra:\n\n- enum de roles realmente ativo;\n\n- roles existentes;\n\n- user_roles;\n\n- policies;\n\n- has_role();\n\n- requireAdmin();\n\n- referências antigas a:\n\n  fornecedor\n\n  parceiro\n\n  prestador\n\n  lojista\n\n  cliente\n\n  casual\n\n  admin\n\nNÃO CRIE UM NOVO ENUM ANTES DE VERIFICAR O EXISTENTE.\n\nDEFINA UM MODELO CANÔNICO DE IDENTIDADE:\n\nUSUÁRIO → ROLE PRINCIPAL → PERFIL ESPECIALIZADO\n\nExemplo conceitual:\n\nauth.users\n\n   ↓\n\nprofiles\n\n   ↓\n\nuser_roles\n\n   ↓\n\nrole principal\n\n   ↓\n\nperfil especializado existente quando aplicável\n\nPRESERVAR COMPATIBILIDADE COM:\n\n- lojista\n\n- prestador\n\n- fornecedor/parceiro\n\n- cliente\n\n- admin\n\nIMPLEMENTAR:\n\n1. Uma única fonte confiável para autorização.\n\n2. Compatibilidade com dados existentes.\n\n3. Migration segura para valores legados.\n\n4. Nenhuma verificação de role apenas no frontend.\n\n5. Rotas protegidas no frontend E no backend.\n\n6. Admin Master validado por role real.\n\n7. Nenhum email hardcoded para autorização.\n\nREVISE:\n\n- login;\n\n- cadastro;\n\n- onboarding;\n\n- redirects;\n\n- guards;\n\n- páginas por role;\n\n- APIs;\n\n- RPCs;\n\n- RLS;\n\n- painel administrativo.\n\nAUDITORIA OBRIGATÓRIA:\n\nTeste conceitualmente e, quando possível, execute:\n\nANÔNIMO:\n\n- não acessa dados privados.\n\nLOJISTA:\n\n- acessa apenas seus dados privados e dados públicos permitidos.\n\nPRESTADOR:\n\n- idem.\n\nFORNECEDOR/PARCEIRO:\n\n- idem.\n\nCLIENTE:\n\n- idem.\n\nADMIN:\n\n- acessa apenas o necessário para administração.\n\nTESTE TAMBÉM:\n\n- tentativa de trocar role pelo frontend;\n\n- tentativa de alterar user_id de outro usuário;\n\n- acesso direto à rota Admin;\n\n- manipulação de localStorage;\n\n- atualização de perfil de terceiros.\n\nCRIE:\n\ndocs/PROMPT_02_AUDIT.md\n\nNão prossiga deixando inconsistências silenciosas entre roles antigas e novas.</div>
            </div>
          </div>
        ) : (
          <Outlet />
        )}

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