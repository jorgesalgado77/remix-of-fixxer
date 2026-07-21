import { createFileRoute, Link } from "@tanstack/react-router";
import { usePerformanceMode } from "@/hooks/use-performance-mode";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  MessageSquare, 
  TrendingUp,
  Package,
  Clock,
  Plus,
  ArrowRight,
  MapPin,
  Eye,
  Megaphone,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  Star,
  Search,
  FileText,
  User,
  Upload,
  Camera,
  Map,
  DollarSign,
  ChevronRight,
  Filter,
  Trash2
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";



export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { glassClass } = usePerformanceMode();
  const context = Route.useRouteContext();
  const { session } = context;
  const [userRole, setUserRole] = useState<string>(() => {
    const contextRole = context.userRole;
    if (contextRole) return contextRole;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fixxer_user_role') || 'user';
    }
    return 'user';
  });

  useEffect(() => {
    if (context.userRole && context.userRole !== userRole) {
      setUserRole(context.userRole);
    }
  }, [context.userRole]);
  
  const { data: profile } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, subscription_plans(*)')
        .eq('id', session?.user?.id)
        .maybeSingle();
      
      if (error) {
        console.error("[DASHBOARD PROFILE ERROR]:", error);
        throw error;
      }
      return data;
    },
    enabled: !!session?.user?.id
  });

  const isFreePlan = profile?.subscription_plans?.price === 0 || !profile?.subscription_plans;

  const handlePaywallAction = (e: React.MouseEvent, action: string) => {
    if (isFreePlan) {
      e.preventDefault();
      toast.error("Ação Bloqueada", {
        description: `O plano 'Teste Gratuito' não permite ${action}. Faça upgrade para o Plano Profissional.`,
        action: {
          label: "Upgrade",
          onClick: () => console.log("Upgrade clicked")
        }
      });
      return false;
    }
    return true;
  };


  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
      {/* Dynamic Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute -inset-1 bg-primary/20 rounded-full blur group-hover:bg-primary/40 transition-all duration-500"></div>
            <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-primary/30 bg-secondary flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-primary">{profile?.full_name?.[0] || 'U'}</span>
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
               <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-white uppercase italic">
                {profile?.company_name || profile?.full_name || 'Comando Fixxer'}
              </h1>
              {profile?.brand_flag && (
                <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {profile.brand_flag}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-primary">
                <span className="text-sm font-black">{profile?.karma_score?.toFixed(1) || '5.0'}</span>
                <div className="flex">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className={`w-2 h-2 rounded-full mx-0.5 ${i <= (profile?.karma_score || 5) ? 'bg-primary' : 'bg-white/10'}`}></div>
                  ))}
                </div>
              </div>
              <div className="h-3 w-[1px] bg-white/10"></div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                {userRole?.toLowerCase() === 'lojista' ? 'Módulo Gestão' : userRole?.toLowerCase() === 'prestador' ? 'Módulo Operacional' : 'Módulo Parceiro'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <Link 
            to="/profile"
            className={`flex items-center gap-3 p-3 rounded-2xl border border-white/10 hover:border-primary/50 transition-all ${glassClass} group`}
          >
            <Settings className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <div className="text-left pr-2">
              <p className="text-[10px] font-black uppercase tracking-tighter text-white">Minha Conta</p>
              <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Configurações</p>
            </div>
          </Link>
          {isFreePlan && (
             <button className="bg-primary hover:bg-primary-dark text-black font-black text-[10px] uppercase tracking-tighter px-4 py-3 rounded-xl shadow-[0_0_20px_rgba(0,255,135,0.3)] hover:scale-105 active:scale-95 transition-all">
               Fazer Upgrade
             </button>
          )}
        </div>
      </header>

      {/* Render Categorized Dashboard */}
      {userRole?.toLowerCase() === 'lojista' && <LojistaDashboard glassClass={glassClass} isFreePlan={isFreePlan} onAction={handlePaywallAction} profile={profile} />}
      {userRole?.toLowerCase() === 'prestador' && <PrestadorDashboard glassClass={glassClass} isFreePlan={isFreePlan} onAction={handlePaywallAction} />}
      {userRole?.toLowerCase() === 'fornecedor' && <FornecedorDashboard glassClass={glassClass} isFreePlan={isFreePlan} onAction={handlePaywallAction} />}

      {userRole === 'admin' && (
        <div className={`p-12 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center ${glassClass}`}>
          <LayoutDashboard className="w-12 h-12 text-primary mb-4 opacity-20" />
          <h2 className="text-xl font-black text-white uppercase italic">Dashboard Admin</h2>
          <p className="text-muted-foreground text-sm max-w-xs mb-6">Use o menu superior para acessar as ferramentas de gestão do sistema.</p>
          <Link to="/admin" className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition-all">Ir para Painel Admin</Link>
        </div>
      )}

    </div>
  );
}

// --- LOJISTA DASHBOARD ---
type ProposalDraft = {
  providerId: string | null;
  providerName: string;
  title: string;
  description: string;
  value: string;
};

function LojistaDashboard({ glassClass, isFreePlan, onAction, profile }: { glassClass: string, isFreePlan: boolean, onAction: (e: any, action: string) => boolean, profile: any }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'marketplace' | 'os' | 'profile'>('overview');
  const [osFilter, setOsFilter] = useState<'sent' | 'executing' | 'finished'>('sent');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [proposalModal, setProposalModal] = useState<ProposalDraft | null>(null);
  const queryClient = useQueryClient();

  const lojistaId = profile?.id;

  const categories = [
    "Projetos & Modulação",
    "Conferência Técnica",
    "Montagem Especializada",
    "Supervisão e Vistoria",
    "Frete & Entregas",
    "Peças & Fornecedores",
    "Marmoraria & Pedras",
    "Gesso & Drywall",
    "Pintura & Alvenaria",
    "Iluminação & Elétrica",
    "Decoração"
  ];

  // --- Fetch OS list ---
  const { data: osList, isLoading: osLoading, isError: osError, refetch: refetchOs } = useQuery({
    queryKey: ['lojista-os', lojistaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders_of_service')
        .select('*')
        .or(`lojista_id.eq.${lojistaId},client_id.eq.${lojistaId}`)
        .order('created_at', { ascending: false });
      if (error) {
        console.error("[DASHBOARD OS ERROR]:", error);
        throw error;
      }
      return data ?? [];
    },
    enabled: !!lojistaId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,   // 30 minutes
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),

  });

  // --- Realtime Subscriptions ---
  useEffect(() => {
    if (!lojistaId) return;

    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders_of_service', filter: `lojista_id=eq.${lojistaId}` },
        () => queryClient.invalidateQueries({ queryKey: ['lojista-os', lojistaId] })
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'os_messages' },
        () => queryClient.invalidateQueries({ queryKey: ['lojista-notifications', lojistaId] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lojistaId, queryClient]);

  // --- Fetch providers (marketplace) ---
  const { data: providers, isLoading: providersLoading, isError: providersError, refetch: refetchProviders } = useQuery({
    queryKey: ['marketplace-providers', selectedCategory],
    queryFn: async () => {
      let q = supabase.from('profiles').select('id, full_name, company_name, avatar_url, karma_score, specialty').eq('role', 'prestador').limit(50);
      if (selectedCategory) q = q.eq('specialty', selectedCategory);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 10,
    retry: 3,

  });

  // --- Notifications (latest messages on user's OS) ---
  const { data: notifications, isLoading: notifLoading, isError: notifError } = useQuery({
    queryKey: ['lojista-notifications', lojistaId],
    queryFn: async () => {
      const ids = (osList ?? []).map((o: any) => o.id);
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from('os_messages')
        .select('id, content, created_at, os_id')
        .in('os_id', ids)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!lojistaId && !!osList,
    staleTime: 1000 * 60 * 2,
    retry: 3,

  });

  // --- Metrics ---
  const metrics = useMemo(() => {
    const list = osList ?? [];
    const finalizedStatus = ['concluida', 'finalizada'];
    return {
      active: list.filter((o: any) => !finalizedStatus.includes(o.status) && o.status !== 'pendente').length,
      pending: list.filter((o: any) => o.status === 'pendente').length,
      finished: list.filter((o: any) => finalizedStatus.includes(o.status)).length,
    };
  }, [osList]);

  const filteredOs = useMemo(() => {
    const list = osList ?? [];
    if (osFilter === 'sent') return list.filter((o: any) => o.status === 'pendente');
    if (osFilter === 'finished') return list.filter((o: any) => ['concluida', 'finalizada'].includes(o.status));
    return list.filter((o: any) => !['pendente', 'concluida', 'finalizada'].includes(o.status));
  }, [osList, osFilter]);

  // --- Send proposal mutation ---
  const sendProposal = useMutation({
    mutationFn: async (draft: ProposalDraft) => {
      if (!lojistaId) throw new Error("Usuário não identificado");
      const value = parseFloat((draft.value || '0').replace(/\./g, '').replace(',', '.'));
      if (!draft.title.trim()) throw new Error("Informe o título da O.S.");
      if (!value || value <= 0) throw new Error("Valor inválido");

      const { data: os, error: osErr } = await supabase
        .from('orders_of_service')
        .insert({
          lojista_id: lojistaId,
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          contract_value: value,
          status: 'pendente',
          current_professional_id: draft.providerId,
        })
        .select()
        .single();
      if (osErr) throw osErr;

      if (draft.providerId) {
        const { error: propErr } = await supabase
          .from('proposals')
          .insert({
            os_id: os.id,
            prestador_id: draft.providerId,
            value,
            status: 'pendente',
          });
        if (propErr) throw propErr;
      }
      return os;
    },
    onSuccess: () => {
      toast.success("Proposta enviada!", { description: "A O.S. foi movida para a aba 'Enviadas'." });
      queryClient.invalidateQueries({ queryKey: ['lojista-os', lojistaId] });
      setProposalModal(null);
      setActiveTab('os');
      setOsFilter('sent');
    },
    onError: (err: any) => {
      toast.error("Falha ao enviar proposta", { description: err?.message || "Tente novamente." });
    },
  });

  const openProposal = (provider?: any) => {
    if (!onAction({ preventDefault: () => {} } as any, "enviar proposta")) return;
    setProposalModal({
      providerId: provider?.id ?? null,
      providerName: provider?.company_name || provider?.full_name || '',
      title: '',
      description: '',
      value: '',
    });
  };

  return (
    <div className="flex flex-col min-h-[60vh] pb-20 md:pb-0">
      <div className="flex-1 space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {osLoading ? (
                <>
                  <StatSkeleton glassClass={glassClass} />
                  <StatSkeleton glassClass={glassClass} />
                  <StatSkeleton glassClass={glassClass} />
                  <StatSkeleton glassClass={glassClass} />
                </>
              ) : osError ? (
                <div className="col-span-2 md:col-span-4">
                  <ErrorState glassClass={glassClass} onRetry={() => refetchOs()} message="Falha ao carregar métricas." />
                </div>
              ) : (
                <>
                  <StatCard icon={<Package className="text-primary" />} label="O.S. Ativas" value={String(metrics.active).padStart(2, '0')} glassClass={glassClass} />
                  <StatCard icon={<RefreshCcw className="text-primary" />} label="Aguardando Aceite" value={String(metrics.pending).padStart(2, '0')} glassClass={glassClass} />
                  <StatCard icon={<CheckCircle2 className="text-primary" />} label="Finalizados" value={String(metrics.finished).padStart(2, '0')} glassClass={glassClass} />
                  <StatCard icon={<Star className="text-amber-500" />} label="Reputação" value={profile?.karma_score?.toFixed(1) || "5.0"} glassClass={glassClass} color="amber" />
                </>
              )}
            </div>

            <div className="relative group overflow-hidden rounded-3xl">
              <button 
                onClick={(e) => { if (onAction(e, "criar nova O.S.")) openProposal(); }}
                className="w-full p-6 md:p-10 border-2 border-primary/30 border-dashed rounded-3xl flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Plus className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-black text-white uppercase italic">Nova Proposta / O.S.</h3>
                  <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">Iniciar contratação imediata</p>
                </div>
              </button>
            </div>

            <div className={`p-6 rounded-3xl ${glassClass}`}>
              <h2 className="text-sm font-black text-white uppercase italic flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-primary" />
                Notificações Recentes
              </h2>
              {notifLoading ? (
                <div className="space-y-3">
                  <RowSkeleton />
                  <RowSkeleton />
                </div>
              ) : notifError ? (
                <ErrorState compact message="Não foi possível carregar notificações." />
              ) : !notifications?.length ? (
                <EmptyState icon={<MessageSquare className="w-6 h-6" />} title="Nenhuma notificação" hint="Mensagens sobre suas O.S. aparecerão aqui." />
              ) : (
                <div className="space-y-3">
                  {notifications.map((n: any) => (
                    <div key={n.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-white uppercase italic truncate">Nova mensagem em O.S. #{String(n.os_id).slice(0, 6)}</p>
                        <p className="text-[9px] text-muted-foreground font-medium mt-0.5 line-clamp-2">{n.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'marketplace' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-black text-white uppercase italic tracking-tight">Contratar Parceiros</h2>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-tighter whitespace-nowrap transition-all border ${selectedCategory === cat ? 'bg-primary text-black border-primary' : 'bg-white/5 text-muted-foreground border-white/10 hover:border-primary/50'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {providersLoading ? (
              <div className="grid gap-4">
                <RowSkeleton tall />
                <RowSkeleton tall />
                <RowSkeleton tall />
              </div>
            ) : providersError ? (
              <ErrorState glassClass={glassClass} onRetry={() => refetchProviders()} message="Falha ao carregar prestadores." />
            ) : !providers?.length ? (
              <EmptyState icon={<Users className="w-6 h-6" />} title="Nenhum prestador encontrado" hint="Ajuste a categoria ou volte mais tarde." />
            ) : (
              <div className="grid gap-4">
                {providers.map((p: any) => {
                  const name = p.company_name || p.full_name || 'Prestador';
                  const initial = (name[0] || 'P').toUpperCase();
                  return (
                    <div key={p.id} className={`p-4 rounded-2xl ${glassClass} border border-white/10 flex items-center gap-4`}>
                      <div className="w-14 h-14 rounded-xl bg-secondary border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt={name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl font-black text-primary">{initial}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-black text-white uppercase truncate italic">{name}</h4>
                          <div className="flex items-center gap-0.5 text-[10px] font-black text-primary">
                            <Star className="w-3 h-3 fill-primary" /> {(p.karma_score ?? 5).toFixed(1)}
                          </div>
                        </div>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 truncate">{p.specialty || 'Prestador de Serviço'}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[8px] font-black uppercase tracking-tighter">Disponível</span>
                          <div className="flex gap-1 ml-auto">
                            <button className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-tighter hover:bg-white/10 transition-all">Perfil</button>
                            <button onClick={() => openProposal(p)} className="px-3 py-1.5 rounded-lg bg-primary text-black text-[8px] font-black uppercase tracking-tighter hover:opacity-90 transition-all">Contratar</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'os' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5">
              {(['sent', 'executing', 'finished'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setOsFilter(f)}
                  className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${osFilter === f ? 'bg-primary text-black' : 'text-muted-foreground hover:text-white'}`}
                >
                  {f === 'sent' ? 'Enviadas' : f === 'executing' ? 'Execução' : 'Finalizadas'}
                </button>
              ))}
            </div>

            {osLoading ? (
              <div className="space-y-4">
                <RowSkeleton tall />
                <RowSkeleton tall />
              </div>
            ) : osError ? (
              <ErrorState glassClass={glassClass} onRetry={() => refetchOs()} message="Falha ao carregar O.S." />
            ) : !filteredOs.length ? (
              <EmptyState 
                icon={<FileText className="w-6 h-6" />} 
                title="Nenhuma O.S. nesta aba"
                hint={osFilter === 'sent' ? "Envie sua primeira proposta pelo marketplace." : "Nada por aqui ainda."}
                action={osFilter === 'sent' ? { label: "Nova Proposta", onClick: () => openProposal() } : undefined}
              />
            ) : (
              <div className="space-y-4">
                {filteredOs.map((os: any) => (
                  <div key={os.id} className={`p-5 rounded-2xl ${glassClass} border border-white/10 space-y-4`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-white uppercase italic truncate">{os.title}</h4>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1 truncate">{os.description || 'Sem descrição'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-primary">{formatCurrency(os.contract_value)}</p>
                        <p className="text-[8px] font-bold text-muted-foreground uppercase mt-0.5 italic">{new Date(os.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-black text-muted-foreground uppercase tracking-widest">{os.status}</span>
                      <button className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-tighter hover:bg-white/10 transition-all flex items-center gap-2 italic">
                        <MessageSquare className="w-3 h-3" /> Suporte
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300 pb-10">
             <div className="flex flex-col items-center text-center space-y-4 py-4">
                <div className="relative group">
                   <div className="absolute -inset-1 bg-primary/30 rounded-full blur opacity-50 group-hover:opacity-100 transition duration-500"></div>
                   <div className="relative w-24 h-24 rounded-full border-2 border-primary/50 bg-secondary overflow-hidden">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl font-black text-primary uppercase italic">
                           {profile?.company_name?.[0] || 'L'}
                        </div>
                      )}
                   </div>
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tight">{profile?.company_name || 'Sua Loja'}</h3>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-bold text-primary uppercase tracking-[0.2em]">Lojista</span>
                    <div className="flex items-center gap-0.5 text-[10px] font-black text-amber-500">
                      <Star className="w-3 h-3 fill-amber-500" /> {profile?.karma_score?.toFixed(1) || "5.0"}
                    </div>
                  </div>
                </div>
             </div>

             <div className="grid gap-3">
                <Link to="/profile" className={`w-full p-4 rounded-2xl ${glassClass} border border-white/5 flex items-center justify-between group hover:border-primary/50 transition-all`}>
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                         <Settings className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                         <p className="text-[10px] font-black text-white uppercase italic">Editar Perfil</p>
                         <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Dados, mídia e endereço</p>
                      </div>
                   </div>
                   <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </Link>
             </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 h-16 md:hidden ${glassClass} border-t border-white/10 px-4 flex items-center justify-between z-40 backdrop-blur-2xl`}>
        <button onClick={() => setActiveTab('overview')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'overview' ? 'text-primary' : 'text-muted-foreground'}`}>
          <LayoutDashboard className={`w-5 h-5 ${activeTab === 'overview' ? 'scale-110' : ''}`} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Início</span>
        </button>
        <button onClick={() => setActiveTab('marketplace')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'marketplace' ? 'text-primary' : 'text-muted-foreground'}`}>
          <Users className={`w-5 h-5 ${activeTab === 'marketplace' ? 'scale-110' : ''}`} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Contratar</span>
        </button>
        <button onClick={() => setActiveTab('os')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'os' ? 'text-primary' : 'text-muted-foreground'}`}>
          <FileText className={`w-5 h-5 ${activeTab === 'os' ? 'scale-110' : ''}`} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Minhas O.S.</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'text-primary' : 'text-muted-foreground'}`}>
          <User className={`w-5 h-5 ${activeTab === 'profile' ? 'scale-110' : ''}`} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Perfil</span>
        </button>
      </nav>

      {/* Proposal Modal */}
      {proposalModal && (
        <ProposalModal
          draft={proposalModal}
          onChange={setProposalModal}
          onClose={() => setProposalModal(null)}
          onSubmit={() => sendProposal.mutate(proposalModal)}
          isSubmitting={sendProposal.isPending}
          glassClass={glassClass}
        />
      )}
    </div>
  );
}

// --- Helpers: skeletons, empty & error states ---
function MobileNavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 transition-all ${active ? 'text-primary scale-110' : 'text-muted-foreground hover:text-white'}`}
    >
      <div className={`${active ? 'shadow-[0_0_15px_rgba(0,255,135,0.3)]' : ''}`}>{icon}</div>
      <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function StatSkeleton({ glassClass }: { glassClass: string }) {
  return <div className={`p-5 rounded-2xl ${glassClass} border border-white/5 h-[110px] animate-pulse`}>
    <div className="w-8 h-8 rounded-lg bg-white/10 mb-4"></div>
    <div className="h-6 w-16 bg-white/10 rounded mb-2"></div>
    <div className="h-2 w-24 bg-white/5 rounded"></div>
  </div>;
}

function RowSkeleton({ tall = false }: { tall?: boolean }) {
  return <div className={`rounded-2xl border border-white/5 bg-white/5 animate-pulse ${tall ? 'h-24' : 'h-14'}`}></div>;
}

function EmptyState({ icon, title, hint, action }: { icon: React.ReactNode, title: string, hint?: string, action?: { label: string, onClick: () => void } }) {
  return (
    <div className="py-8 px-4 flex flex-col items-center justify-center text-center border border-dashed border-white/10 rounded-2xl">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-muted-foreground mb-3">{icon}</div>
      <p className="text-xs font-black text-white uppercase italic">{title}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
      {action && (
        <button onClick={action.onClick} className="mt-4 px-4 py-2 rounded-xl bg-primary text-black text-[10px] font-black uppercase tracking-tighter hover:opacity-90 transition-all">
          {action.label}
        </button>
      )}
    </div>
  );
}

function ErrorState({ message, onRetry, glassClass, compact }: { message: string, onRetry?: () => void, glassClass?: string, compact?: boolean }) {
  return (
    <div className={`${compact ? 'p-4' : 'p-6'} rounded-2xl border border-red-500/20 bg-red-500/5 flex items-center gap-3 ${glassClass || ''}`}>
      <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black text-white uppercase italic">Falha de rede</p>
        <p className="text-[10px] text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-tighter hover:bg-white/10 transition-all flex items-center gap-1">
          <RefreshCcw className="w-3 h-3" /> Tentar novamente
        </button>
      )}
    </div>
  );
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

// --- Proposal modal ---
function ProposalModal({ draft, onChange, onClose, onSubmit, isSubmitting, glassClass }: {
  draft: ProposalDraft;
  onChange: (d: ProposalDraft) => void;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  glassClass: string;
}) {
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`Arquivo ${file.name} excede 10MB.`);
        return false;
      }
      return true;
    });
    setAttachments(prev => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const validateAndSubmit = () => {
    if (!draft.title.trim()) return toast.error("Título é obrigatório.");
    const val = parseFloat((draft.value || '0').replace(/\./g, '').replace(',', '.'));
    if (!val || val <= 0) return toast.error("Valor inválido.");
    
    // Simulating progress for feedback since mutation is handled in parent
    setUploadProgress(10);
    const interval = setInterval(() => {
      setUploadProgress(p => p < 90 ? p + 10 : p);
    }, 200);

    onSubmit();
    
    // Parent will close modal on success, so we don't need to clear interval here
    // but a cleanup or success handler would be better in a real app
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div
        className={`w-full md:max-w-md ${glassClass} border-t md:border border-white/10 rounded-t-3xl md:rounded-3xl p-6 space-y-4 animate-in slide-in-from-bottom-4 duration-300 max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-white uppercase italic">Enviar Proposta</h3>
            {draft.providerName && (
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-0.5">Para: {draft.providerName}</p>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center">
            <XCircle className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Título da O.S. *</span>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => onChange({ ...draft, title: e.target.value })}
              placeholder="Ex: Montagem Cozinha Apt 302"
              className="mt-1 w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none transition-colors"
            />
          </label>

          <label className="block">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Descrição detalhada</span>
            <textarea
              value={draft.description}
              onChange={(e) => onChange({ ...draft, description: e.target.value })}
              rows={3}
              placeholder="Detalhe o serviço solicitado..."
              className="mt-1 w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none transition-colors resize-none"
            />
          </label>

          <label className="block">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Valor do Contrato (R$) *</span>
            <input
              type="text"
              inputMode="decimal"
              value={draft.value}
              onChange={(e) => onChange({ ...draft, value: e.target.value.replace(/[^\d.,]/g, '') })}
              placeholder="0,00"
              className="mt-1 w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none transition-colors"
            />
          </label>

          <div className="space-y-2">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Anexos (Opcional)</span>
            <div className="grid grid-cols-1 gap-2">
              {attachments.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-white truncate">{file.name}</span>
                  </div>
                  <button onClick={() => removeAttachment(idx)} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-white/10 hover:border-primary/30 hover:bg-white/5 transition-all cursor-pointer">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Adicionar Arquivos</span>
                <input type="file" multiple className="hidden" onChange={handleFileChange} />
              </label>
            </div>
          </div>
        </div>

        {isSubmitting && (
          <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-2">
            <div 
              className="bg-primary h-full transition-all duration-300 ease-out" 
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-tighter hover:bg-white/10 transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={validateAndSubmit}
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-xl bg-primary text-black text-[10px] font-black uppercase tracking-tighter hover:opacity-90 transition-all shadow-[0_0_20px_rgba(0,255,135,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <><RefreshCcw className="w-3 h-3 animate-spin" /> Enviando</> : 'Enviar Proposta'}
          </button>
        </div>
      </div>
    </div>
  );
}



// --- PRESTADOR DASHBOARD ---
function PrestadorDashboard({ glassClass, isFreePlan, onAction }: { glassClass: string, isFreePlan: boolean, onAction: (e: any, action: string) => boolean }) {
  const [isAvailable, setIsAvailable] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'os' | 'profile'>('overview');



  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Clock className="text-primary" />} label="Agenda Semana" value="06" glassClass={glassClass} />
        <StatCard icon={<CreditCard className="text-primary" />} label="A Receber" value="R$ 2.8k" glassClass={glassClass} />
        <StatCard icon={<CheckCircle2 className="text-primary" />} label="Concluídos" value="48" glassClass={glassClass} />
        <StatCard icon={<RefreshCcw className="text-primary" />} label="Propostas" value="04" glassClass={glassClass} />
      </div>

      <div className={`p-4 rounded-3xl ${glassClass} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full animate-pulse ${isAvailable ? 'bg-primary' : 'bg-red-500'}`}></div>
          <span className="text-xs font-black text-white uppercase tracking-widest italic">
            Status: {isAvailable ? 'Disponível para Trabalho' : 'Ocupado / Offline'}
          </span>
        </div>
        <button 
          onClick={() => setIsAvailable(!isAvailable)}
          className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${isAvailable ? 'bg-primary' : 'bg-white/10'}`}
        >
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${isAvailable ? 'right-1' : 'left-1'}`}></div>
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className={`p-6 rounded-3xl ${glassClass}`}>
          <h2 className="text-lg font-black text-white uppercase italic flex items-center gap-2 mb-6">
            <Plus className="w-5 h-5 text-primary" />
            Convites e Propostas
          </h2>
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-black text-white uppercase">Móveis Dellanno - Jardins</p>
                    <p className="text-[10px] font-bold text-muted-foreground mt-0.5 uppercase">Contrato Real: R$ 45.000,00</p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-primary text-black text-[9px] font-black uppercase">Novo</span>
                </div>
                <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Valor Oferecido</p>
                  <p className="text-lg font-black text-primary">R$ 850,00</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={(e) => onAction(e, "aceitar propostas")} className="py-2 rounded-lg bg-primary text-black text-[9px] font-black uppercase hover:opacity-90 transition-all">Aceitar</button>
                  <button onClick={(e) => onAction(e, "enviar contrapropostas")} className="py-2 rounded-lg bg-white/5 border border-white/10 text-white text-[9px] font-black uppercase hover:bg-white/10 transition-all">Contra</button>
                  <button onClick={(e) => onAction(e, "recusar serviços")} className="py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-black uppercase hover:bg-red-500/20 transition-all">Recusar</button>
                </div>

              </div>
            ))}
          </div>
        </div>

        <div className={`p-6 rounded-3xl ${glassClass}`}>
          <h2 className="text-lg font-black text-white uppercase italic flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-primary" />
            Minha Agenda
          </h2>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex flex-col items-center justify-center border border-white/10 shrink-0">
                  <span className="text-[8px] font-black text-muted-foreground uppercase leading-none">JUL</span>
                  <span className="text-sm font-black text-white leading-none mt-1">2{i}</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black text-white uppercase truncate">Edifício Gran Park - Apto 12</p>
                  <p className="text-[9px] font-bold text-muted-foreground mt-0.5 flex items-center gap-1 uppercase">
                    <MapPin className="w-2 h-2" /> Vila Mariana, SP
                  </p>
                </div>
                <button className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:text-primary transition-all">
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Bottom Nav Mobile for Prestador */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 h-20 border-t border-white/10 flex items-center justify-around px-6 z-50 ${glassClass} backdrop-blur-xl`}>
        <MobileNavItem icon={<LayoutDashboard />} label="Início" active={activeSubTab === 'overview'} onClick={() => setActiveSubTab('overview')} />
        <MobileNavItem icon={<TrendingUp />} label="Feed" active={window.location.pathname === '/feed'} onClick={() => window.location.href = '/feed'} />
        <MobileNavItem icon={<MessageSquare />} label="Chat" active={activeSubTab === 'os'} onClick={() => setActiveSubTab('os')} />
        <MobileNavItem icon={<User />} label="Perfil" active={activeSubTab === 'profile'} onClick={() => setActiveSubTab('profile')} />
      </div>
    </div>
  );
}

// --- FORNECEDOR DASHBOARD ---
function FornecedorDashboard({ glassClass, isFreePlan, onAction }: { glassClass: string, isFreePlan: boolean, onAction: (e: any, action: string) => boolean }) {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'os' | 'profile'>('overview');


  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={<Eye className="text-primary" />} label="Visualizações" value="1.2k" glassClass={glassClass} />
        <StatCard icon={<MessageSquare className="text-primary" />} label="Solicitações" value="14" glassClass={glassClass} />
        <StatCard icon={<Megaphone className="text-primary" />} label="Ads Ativos" value="03" glassClass={glassClass} />
      </div>

      <div className="grid md:grid-cols-3 gap-6">

        <div className={`md:col-span-2 p-6 rounded-3xl ${glassClass}`}>
          <h2 className="text-lg font-black text-white uppercase italic flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-primary" />
            Oportunidades no Radar
          </h2>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-primary/20 text-primary uppercase">Marmoraria</span>
                    <p className="text-xs font-black text-white uppercase italic">Cozinha Residencial - Granito</p>
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Solicitado por: Todeschini Vila Olimpia</p>
                </div>
                <button 
                  onClick={(e) => onAction(e, "oferecer orçamentos")}
                  className="px-6 py-3 rounded-xl bg-primary text-black text-[10px] font-black uppercase hover:opacity-90 transition-all shadow-lg active:scale-95"
                >
                  Oferecer Orçamento
                </button>

              </div>
            ))}
          </div>
        </div>

        <div className={`p-6 rounded-3xl ${glassClass}`}>
          <h2 className="text-lg font-black text-white uppercase italic flex items-center gap-2 mb-6">
            <Megaphone className="w-5 h-5 text-primary" />
            Meus Anúncios
          </h2>
          <div className="space-y-4">
            <div className="aspect-square rounded-2xl bg-white/5 border border-white/10 overflow-hidden relative group">
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs font-black text-white uppercase text-center mb-4 italic">Campanha Vitrine Julho</p>
                <div className="grid grid-cols-2 gap-4 w-full">
                   <div className="text-center">
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">Cliques</p>
                    <p className="text-lg font-black text-primary">452</p>
                   </div>
                   <div className="text-center">
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">CTR</p>
                    <p className="text-lg font-black text-primary">3.2%</p>
                   </div>
                </div>
              </div>
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <LayoutDashboard className="w-8 h-8 opacity-20" />
              </div>
            </div>
            <button 
              onClick={(e) => onAction(e, "criar novos anúncios")}
              className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase hover:bg-white/10 transition-all"
            >
              Novo Anúncio
            </button>

          </div>
        </div>
      </div>
      
      {/* Bottom Nav Mobile for Fornecedor */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 h-20 border-t border-white/10 flex items-center justify-around px-6 z-50 ${glassClass} backdrop-blur-xl`}>
        <MobileNavItem icon={<LayoutDashboard />} label="Início" active={activeSubTab === 'overview'} onClick={() => setActiveSubTab('overview')} />
        <MobileNavItem icon={<TrendingUp />} label="Feed" active={window.location.pathname === '/feed'} onClick={() => window.location.href = '/feed'} />
        <MobileNavItem icon={<MessageSquare />} label="Chat" active={activeSubTab === 'os'} onClick={() => setActiveSubTab('os')} />
        <MobileNavItem icon={<User />} label="Perfil" active={activeSubTab === 'profile'} onClick={() => setActiveSubTab('profile')} />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, glassClass, color = "primary" }: { icon: any, label: string, value: string, glassClass: string, color?: "primary" | "amber" }) {
  const colorMap = {
    primary: "text-primary bg-primary/5",
    amber: "text-amber-500 bg-amber-500/5"
  };

  return (
    <div className={`p-5 rounded-2xl ${glassClass} border border-white/5 hover:border-white/10 transition-all group overflow-hidden relative`}>
      <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-20 transition-opacity">
        {icon}
      </div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2 rounded-lg ${colorMap[color]}`}>{icon}</div>
        </div>
        <p className="text-xl md:text-2xl font-black text-white italic">{value}</p>
        <p className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}
