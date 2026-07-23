import { Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { 
  Store, 
  PlusCircle, 
  Building2, 
  Star, 
  Activity, 
  LogOut, 
  Search,
  ChevronRight,
  Briefcase,
  Clock,
  DollarSign,
  Menu,
  ShieldCheck,
  User,
  Info,
  MapPin,
  Image as ImageIcon,
  Zap,
  Globe,
  Video,
  Phone,
  MessageCircle,
  Lock,
  Filter,
  CheckCircle2,
  AlertCircle,
  Trash2,
  X,
  Crop,
  Download,
  History,
  Bell,
  Check,
  Trash,
  Undo2,
  Settings,
  XCircle,
  Eye,
  Heart,
  Loader2
} from "lucide-react";

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabaseExternal } from "@/lib/supabaseExternal";
import { usePerformanceMode } from "@/hooks/use-performance-mode";
import { Button } from "@/components/ui/button";
import { CreateAdModal } from "@/components/CreateAdModal";
import type { CategoryKey } from "@/lib/category-colors";
import {
  evaluateProfileCompleteness,
  describeMissing,
  type ProfileCompletenessResult,
} from "@/lib/profile-completeness";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { EscrowBadge } from "@/components/EscrowBadge";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { IMaskInput } from "react-imask";
import { useMediaUpload } from "@/hooks/use-media-upload";
import { Progress } from "@/components/ui/progress";
import { ActivitySelect } from "@/components/ActivitySelect";
import { useActivityBranches } from "@/hooks/use-activity-branches";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, rectSortingStrategy } from "@dnd-kit/sortable";
import { compressImage } from "@/utils/image-compression";

export function LojistaDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [activeSettingsTab, setActiveSettingsTab] = useState("my-profile");
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [favoriteCategory, setFavoriteCategory] = useState("todas");
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [profileSummary, setProfileSummary] = useState<{
    id?: string;
    companyName?: string;
    logoUrl?: string | null;
    city?: string;
    state?: string;
  }>({});
  const [profileMissing, setProfileMissing] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userRole, setUserRole] = useState<CategoryKey>(() => {
    if (typeof window === "undefined") return "lojista";
    const r = (localStorage.getItem("fixxer_user_role") || "lojista").toLowerCase();
    return (["lojista", "prestador", "fornecedor", "cliente", "admin"].includes(r)
      ? r
      : "lojista") as CategoryKey;
  });
  const [rating, setRating] = useState(4.9);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState("");
  const [notificationSettings, setNotificationSettings] = useState({
    status_change: true,
    new_proposal: true,
    review_received: true
  });
  const [history, setHistory] = useState<any[]>([]);
  const { branches } = useActivityBranches();
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  // Carrega dados do perfil do lojista para calcular completude e alimentar o card do usuário
  useEffect(() => {
    let cancelled = false;

    const evaluate = (data: any) => {
      if (!data) return;
      const result: ProfileCompletenessResult = evaluateProfileCompleteness(userRole, data);
      if (cancelled) return;
      setIsProfileComplete(result.complete);
      setProfileMissing(result.missingLabels);
      setProfileSummary({
        id: data.id,
        companyName: data.company_name || "",
        logoUrl: data.logo_url || null,
        city: data.city || "",
        state: data.state || "",
      });
      if (data.id) {
        try { localStorage.setItem("fixxer_lojista_id", data.id); } catch {}
      }
    };

    (async () => {
      try {
        const { data: { user } } = await supabaseExternal.auth.getUser();
        if (!user?.email) return;

        // Fallback do cache local para evitar flicker
        const cached = localStorage.getItem(`fixxer_profile_${user.email}`);
        if (cached) {
          try {
            const p = JSON.parse(cached);
            evaluate({
              id: localStorage.getItem("fixxer_lojista_id") || undefined,
              company_name: p.companyName,
              cnpj: p.cnpj,
              responsible_name: p.responsibleName,
              email_contact: p.emailContact,
              whatsapp: p.whatsapp,
              phone: p.phone,
              zipcode: p.cep,
              activity_branch: p.activityBranch,
              logo_url: p.logoUrl,
              city: p.city,
              state: p.state,
            });
          } catch {}
        }

        const { data, error } = await supabaseExternal
          .from("store_profiles")
          .select("*")
          .eq("user_email", user.email)
          .maybeSingle();

        if (!error && data) evaluate(data);
      } catch (err) {
        console.warn("[LojistaDashboard] falha ao verificar completude do perfil:", err);
      }
    })();

    const onProfileSaved = () => {
      // Recarrega quando o ProfileView emite evento após salvar
      (async () => {
        try {
          const { data: { user } } = await supabaseExternal.auth.getUser();
          if (!user?.email) return;
          const { data } = await supabaseExternal
            .from("store_profiles")
            .select("*")
            .eq("user_email", user.email)
            .maybeSingle();
          if (data) evaluate(data);
        } catch {}
      })();
    };
    window.addEventListener("fixxer:profile-saved", onProfileSaved);

    return () => {
      cancelled = true;
      window.removeEventListener("fixxer:profile-saved", onProfileSaved);
    };
  }, [userRole]);

  // Sincroniza o papel do usuário se ele mudar em outro lugar (auth, admin, etc.)
  useEffect(() => {
    const syncRole = () => {
      if (typeof window === "undefined") return;
      const r = (localStorage.getItem("fixxer_user_role") || "lojista").toLowerCase();
      if (["lojista", "prestador", "fornecedor", "cliente", "admin"].includes(r)) {
        setUserRole(r as CategoryKey);
      }
    };
    window.addEventListener("storage", syncRole);
    window.addEventListener("fixxer:role-changed", syncRole as any);
    return () => {
      window.removeEventListener("storage", syncRole);
      window.removeEventListener("fixxer:role-changed", syncRole as any);
    };
  }, []);

  const openPublicProfile = () => {
    const id = profileSummary.id || (typeof window !== "undefined" ? localStorage.getItem("fixxer_lojista_id") : null);
    if (!id) {
      toast.error("Perfil público indisponível", {
        description: "Salve o perfil da empresa ao menos uma vez para gerar o link público.",
      });
      setActiveTab("profile");
      return;
    }
    navigate({ to: "/lojista/$id", params: { id: String(id) } });
  };

  const loadFavorites = async () => {
    setLoadingFavorites(true);
    try {
      const { data: { user } } = await supabaseExternal.auth.getUser();
      if (!user) return;

      const { data, error } = await supabaseExternal
        .from('user_favorites')
        .select('*, store_profiles(*)')
        .eq('user_id', user.id);

      if (error) throw error;
      setFavorites(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFavorites(false);
    }
  };

  useEffect(() => {
    if (showFavoritesModal) {
      loadFavorites();
      
      const channel = supabaseExternal
        .channel('favorites-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_favorites' }, () => {
          loadFavorites();
        })
        .subscribe();

      return () => {
        supabaseExternal.removeChannel(channel);
      };
    }
  }, [showFavoritesModal]);

  const filteredFavorites = useMemo(() => {
    if (favoriteCategory === 'todas') return favorites;
    return favorites.filter(f => f.store_profiles?.activity_branch === favoriteCategory);
  }, [favorites, favoriteCategory]);
  
  const { glassClass } = usePerformanceMode();
  
  useEffect(() => {
    const handleTabChangeEvent = (e: any) => {
      if (e.detail) {
        setActiveTab(e.detail);
      }
    };
    window.addEventListener('change-tab', handleTabChangeEvent);

    // Mock initial notifications
    setNotifications([
      { id: 1, title: 'Status Atualizado', message: 'A O.S. #2490 foi concluída com sucesso.', type: 'status_change', os_id: '2490', time: '5 min atrás', read: false },
      { id: 2, title: 'Nova Proposta', message: 'Você recebeu uma nova proposta para a O.S. #2491.', type: 'new_proposal', os_id: '2491', time: '1 hora atrás', read: false },
      { id: 3, title: 'Avaliação Recebida', message: 'Carlos Silva deixou uma avaliação de 5 estrelas.', type: 'review_received', os_id: '2488', time: '2 horas atrás', read: true },
    ]);

    return () => window.removeEventListener('change-tab', handleTabChangeEvent);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success("Todas as notificações marcadas como lidas");
  };

  const clearNotifications = () => {
    setNotifications([]);
    setShowNotifications(false);
    toast.success("Central de notificações limpa");
  };

  const pushToUndo = (action: string, state: any) => {
    setUndoStack(prev => [...prev.slice(-4), { action, state }]);
  };

  const [emergencySetGallery, setEmergencySetGallery] = useState<any>(null);
  const [failedUploads, setFailedUploads] = useState<File[]>([]);

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const lastAction = undoStack[undoStack.length - 1];
    
    if (lastAction.action === 'gallery_reorder' || lastAction.action === 'gallery_delete') {
      if (emergencySetGallery) {
        emergencySetGallery(lastAction.state);
        toast.success("Ação desfeita com sucesso!");
      }
    }
    
    setUndoStack(prev => prev.slice(0, -1));
  };

  const getRatingColor = (val: number) => {
    if (val <= 1.5) return "text-red-500";
    if (val <= 2.5) return "text-orange-500";
    if (val <= 3.5) return "text-yellow-500";
    if (val <= 4.9) return "text-green-500";
    return "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]";
  };

  const getRatingStarColor = (val: number) => {
    if (val <= 1.5) return "text-red-500 fill-red-500";
    if (val <= 2.5) return "text-orange-500 fill-orange-500";
    if (val <= 3.5) return "text-yellow-500 fill-yellow-500";
    if (val <= 4.9) return "text-green-500 fill-green-500";
    return "text-amber-400 fill-amber-400";
  };

  const handleTabChange = (tab: string) => {
    if ((tab === 'create' || tab === 'reviews') && !isProfileComplete) {
      const details = profileMissing.length
        ? `Preencha para liberar: ${profileMissing.join(", ")}.`
        : "Preencha os campos obrigatórios do Perfil para liberar esta função.";
      console.warn("[LojistaDashboard] tentativa de acesso a função bloqueada:", { tab, missing: profileMissing });
      toast.error("Perfil Incompleto", {
        description: details,
        duration: 6000,
      });
      setActiveTab('profile');
      setMobileMenuOpen(false);
      return;
    }
    if (tab === 'create') {
      // "Criar Serviço" da sidebar/dashboard abre o mesmo modal do botão global "Criar".
      setShowCreateModal(true);
      setMobileMenuOpen(false);
      return;
    }
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const handleOpenSettings = () => {
    setActiveTab('profile');
    setActiveSettingsTab('my-profile');
    setMobileMenuOpen(false);
    setTimeout(() => {
      const el = document.getElementById('settings-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };


  return (
    <div className="flex h-screen bg-black overflow-hidden font-sans text-white">
      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#050505]/95 backdrop-blur-md border-b border-white/10 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center text-black font-black text-sm">F</div>
            <h1 className="font-bold text-white text-sm uppercase italic">FIXXER</h1>
        </div>
        <div className="flex items-center gap-2">
            <div className="relative mr-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`relative rounded-xl border border-white/5 hover:bg-white/5 text-muted-foreground hover:text-white transition-all ${showNotifications ? 'bg-white/10 text-white' : ''}`}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-[#050505]">
                      {unreadCount}
                    </span>
                  )}
                </Button>

                {showNotifications && (
                  <div className="fixed top-16 right-4 w-[calc(100vw-2rem)] md:absolute md:top-auto md:right-0 md:mt-3 md:w-80 bg-[#1A1A1B] border border-white/10 rounded-2xl shadow-2xl z-[70] animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden">
                    <div className="p-4 border-b border-white/5 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black text-white uppercase italic">Notificações</h4>
                        <div className="flex gap-2">
                          <button onClick={markAllAsRead} className="text-[8px] font-bold text-primary uppercase hover:underline">Lidas</button>
                          <button onClick={clearNotifications} className="text-[8px] font-bold text-red-400 uppercase hover:underline">Limpar</button>
                        </div>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                        <Input 
                            placeholder="FILTRAR POR ID DA O.S..." 
                            value={notificationFilter}
                            onChange={(e) => setNotificationFilter(e.target.value)}
                            className="h-7 bg-black/40 border-white/10 text-[8px] pl-7 uppercase font-black italic"
                        />
                      </div>
                    </div>
                    <div className="max-h-[60vh] md:max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                      {notifications.filter(n => {
                          const matchesFilter = !notificationFilter || n.os_id?.includes(notificationFilter);
                          const matchesSettings = notificationSettings[n.type as keyof typeof notificationSettings];
                          return matchesFilter && matchesSettings;
                      }).length > 0 ? (
                        notifications.filter(n => {
                            const matchesFilter = !notificationFilter || n.os_id?.includes(notificationFilter);
                            const matchesSettings = notificationSettings[n.type as keyof typeof notificationSettings];
                            return matchesFilter && matchesSettings;
                        }).map(notification => (
                          <div 
                            key={notification.id} 
                            onClick={() => {
                                markAsRead(notification.id);
                                if (notification.os_id) {
                                    toast.info(`Abrindo O.S. #${notification.os_id}`);
                                }
                            }}
                            className={`p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors cursor-pointer relative ${!notification.read ? 'bg-primary/5' : ''}`}
                          >
                            {!notification.read && <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />}
                            <div className="pl-3">
                                <p className="text-[10px] font-black italic uppercase text-white">{notification.title}</p>
                                <p className="text-[9px] text-muted-foreground line-clamp-2">{notification.message}</p>
                                <span className="text-[8px] text-primary/60 font-bold uppercase mt-1 block">{notification.time}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <Bell className="w-8 h-8 text-white/10 mx-auto mb-2" />
                          <p className="text-[8px] font-black text-muted-foreground uppercase italic tracking-tighter">Nenhuma notificação encontrada</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
            </div>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-white">
                <Menu className="w-6 h-6" />
            </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="flex flex-col h-full p-8 space-y-6 overflow-y-auto scrollbar-none">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-black font-black text-xl">F</div>
                        <h1 className="font-bold text-white tracking-tight uppercase italic">FIXXER</h1>
                    </div>
                    <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-white">
                        <PlusCircle className="w-6 h-6 rotate-45" />
                    </button>
                </div>

                <UserProfileCard isProfileComplete={isProfileComplete} rating={rating} getRatingStarColor={getRatingStarColor} getRatingColor={getRatingColor} profile={profileSummary} />


                <TooltipProvider>
                  <nav className="flex flex-col gap-3">
                      <Link 
                        to="/feed/lojista" 

                        onClick={() => setMobileMenuOpen(false)} 
                        className={`flex items-center gap-3 px-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase italic text-xs shadow-[0_0_15px_rgba(255,255,255,0.05)] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none`}
                      >
                          <Search className="w-4 h-4 text-primary" /> Ir para o Feed
                      </Link>

                      <SidebarButton 
                        icon={<Activity className="w-5 h-5"/>} 
                        label="Visão Geral" 
                        active={activeTab === 'dashboard'} 
                        onClick={() => handleTabChange('dashboard')} 
                      />
                      
                      <NavButtonWithTooltip 
                        icon={<PlusCircle className="w-5 h-5"/>} 
                        label="Criar Serviço" 
                        active={activeTab === 'create'} 
                        onClick={() => handleTabChange('create')}
                        disabled={!isProfileComplete}
                      />

                      <SidebarButton icon={<Building2 className="w-5 h-5"/>} label="Perfil Empresa" active={false} onClick={() => { setMobileMenuOpen(false); openPublicProfile(); }} />

                      <SidebarButton 
                        icon={<Heart className="w-5 h-5 text-red-500 fill-red-500/20"/>} 
                        label="Favoritos" 
                        active={false} 
                        onClick={() => setShowFavoritesModal(true)} 
                      />

                      <NavButtonWithTooltip 
                        icon={<Star className="w-5 h-5"/>} 
                        label="Avaliações" 
                        active={activeTab === 'reviews'} 
                        onClick={() => handleTabChange('reviews')}
                        disabled={!isProfileComplete}
                      />

                      <SidebarButton 
                        icon={<Settings className="w-5 h-5"/>} 
                        label="Configurações" 
                        active={activeTab === 'profile'} 
                        onClick={handleOpenSettings} 
                      />
                  </nav>
                </TooltipProvider>
                <div className="mt-auto pt-6 flex flex-col gap-4">
                    <div className="h-px bg-white/5 mx-2" />
                    <Button variant="ghost" onClick={() => { /* Logout logic */ }} className="text-red-400 font-bold uppercase italic text-xs justify-start px-4 h-12">
                        <LogOut className="w-4 h-4 mr-2" /> Encerrar Sessão
                    </Button>
                </div>
            </div>
        </div>
      )}

      {/* Sidebar Retrátil (Desktop) */}
      <aside className="w-72 border-r border-white/10 p-6 flex flex-col gap-6 hidden md:flex bg-[#0A0A0A] overflow-y-auto scrollbar-none">
        <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-black font-black text-xl shadow-[0_0_15px_rgba(0,255,135,0.3)]">F</div>
            <h1 className="font-bold text-white tracking-tight uppercase italic">FIXXER</h1>
        </div>

        <UserProfileCard isProfileComplete={isProfileComplete} rating={rating} getRatingStarColor={getRatingStarColor} getRatingColor={getRatingColor} profile={profileSummary} />


        <TooltipProvider>
          <nav className="flex flex-col gap-2">
              <Link to="/feed/lojista" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all text-muted-foreground hover:text-white font-black uppercase italic text-xs tracking-wider border border-transparent hover:border-white/10 mb-2">
                  <Search className="w-4 h-4 text-primary" /> Ir para o Feed
              </Link>

              <SidebarButton icon={<Activity className="w-4 h-4"/>} label="Visão Geral" active={activeTab === 'dashboard'} onClick={() => handleTabChange('dashboard')} />
              
              <NavButtonWithTooltip 
                icon={<PlusCircle className="w-4 h-4"/>} 
                label="Criar Serviço" 
                active={activeTab === 'create'} 
                onClick={() => handleTabChange('create')}
                disabled={!isProfileComplete}
              />

              <SidebarButton icon={<Building2 className="w-4 h-4"/>} label="Perfil Empresa" active={false} onClick={openPublicProfile} />

              <SidebarButton 
                icon={<Heart className="w-4 h-4 text-red-500 fill-red-500/20"/>} 
                label="Favoritos" 
                active={false} 
                onClick={() => setShowFavoritesModal(true)} 
              />
              
              <NavButtonWithTooltip 
                icon={<Star className="w-4 h-4"/>} 
                label="Avaliações" 
                active={activeTab === 'reviews'} 
                onClick={() => handleTabChange('reviews')}
                disabled={!isProfileComplete}
              />

              <SidebarButton 
                icon={<Settings className="w-4 h-4"/>} 
                label="Configurações" 
                active={activeTab === 'profile'} 
                onClick={handleOpenSettings} 
              />
          </nav>
        </TooltipProvider>
        <div className="mt-auto pt-6 border-t border-white/10 flex flex-col gap-2">
            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 font-bold uppercase text-xs italic justify-start px-4">
              <LogOut className="w-4 h-4 mr-2" /> Sair do Sistema
            </Button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto scrollbar-none bg-[#050505] pt-16 md:pt-0">
        <header className="px-8 py-6 border-b border-white/10 flex items-center justify-between sticky top-0 z-10 bg-[#050505]/80 backdrop-blur-md hidden md:flex">
           <div className="flex items-center gap-4">
               <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">
                  {activeTab === 'dashboard' ? 'Painel Lojista' : activeTab === 'create' ? 'Publicar O.S.' : activeTab === 'profile' ? 'Perfil da Empresa' : 'Avaliações'}
               </h2>
           </div>
           <div className="flex items-center gap-4">
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`relative rounded-xl border border-white/5 hover:bg-white/5 text-muted-foreground hover:text-white transition-all ${showNotifications ? 'bg-white/10 text-white' : ''}`}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-[#050505]">
                      {unreadCount}
                    </span>
                  )}
                </Button>

                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 bg-[#1A1A1B] border border-white/10 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden">
                    <div className="p-4 border-b border-white/5 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black text-white uppercase italic">Notificações</h4>
                        <div className="flex gap-2">
                          <button onClick={markAllAsRead} className="text-[8px] font-bold text-primary uppercase hover:underline">Lidas</button>
                          <button onClick={clearNotifications} className="text-[8px] font-bold text-red-400 uppercase hover:underline">Limpar</button>
                        </div>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                        <Input 
                            placeholder="FILTRAR POR ID DA O.S..." 
                            value={notificationFilter}
                            onChange={(e) => setNotificationFilter(e.target.value)}
                            className="h-7 bg-black/40 border-white/10 text-[8px] pl-7 uppercase font-black italic"
                        />
                      </div>
                      <div className="flex items-center justify-between border-t border-white/5 pt-2">
                        <span className="text-[8px] font-black text-muted-foreground uppercase italic">Alerta de Status</span>
                        <button 
                            onClick={() => setNotificationSettings(s => ({...s, status_change: !s.status_change}))}
                            className={`w-8 h-4 rounded-full transition-all relative ${notificationSettings.status_change ? 'bg-primary' : 'bg-white/10'}`}
                        >
                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${notificationSettings.status_change ? 'right-0.5' : 'left-0.5'}`} />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                      {notifications.filter(n => {
                          const matchesFilter = !notificationFilter || n.os_id?.includes(notificationFilter);
                          const matchesSettings = notificationSettings[n.type as keyof typeof notificationSettings];
                          return matchesFilter && matchesSettings;
                      }).length > 0 ? (
                        notifications.filter(n => {
                            const matchesFilter = !notificationFilter || n.os_id?.includes(notificationFilter);
                            const matchesSettings = notificationSettings[n.type as keyof typeof notificationSettings];
                            return matchesFilter && matchesSettings;
                        }).map(notification => (
                          <div 
                            key={notification.id} 
                            onClick={() => {
                                markAsRead(notification.id);
                                if (notification.os_id) {
                                    toast.info(`Abrindo O.S. #${notification.os_id}`);
                                }
                            }}
                            className={`p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors cursor-pointer relative ${!notification.read ? 'bg-primary/5' : ''}`}
                          >
                            {!notification.read && <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />}
                            <div className="pl-3">
                              <div className="flex justify-between items-start mb-1">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-white uppercase italic">{notification.title}</span>
                                    {notification.os_id && <span className="text-[7px] text-primary font-black uppercase italic">O.S. #{notification.os_id}</span>}
                                </div>
                                <span className="text-[7px] text-muted-foreground font-bold">{notification.time}</span>
                              </div>
                              <p className="text-[10px] text-white/70 leading-tight">{notification.message}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <Bell className="w-8 h-8 text-white/10 mx-auto mb-2" />
                          <p className="text-[9px] text-muted-foreground uppercase font-bold italic">Nenhum alerta compatível</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-black text-primary uppercase italic">Sessão Ativa</span>
              </div>
           </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <DashboardView rating={rating} getRatingColor={getRatingColor} handleTabChange={handleTabChange} isProfileComplete={isProfileComplete} />}
            {activeTab === 'create' && <CreateServiceView />}
            {activeTab === 'profile' && (
                <ProfileView 
                    setIsProfileComplete={setIsProfileComplete} 
                    rating={rating} 
                    getRatingColor={getRatingColor} 
                    setRating={setRating} 
                    undoStack={undoStack}
                    pushToUndo={pushToUndo}
                    setEmergencySetGallery={setEmergencySetGallery}
                    handleUndo={handleUndo}
                    failedUploads={failedUploads}
                    setFailedUploads={setFailedUploads}
                    activeSettingsTab={activeSettingsTab}
                    setActiveSettingsTab={setActiveSettingsTab}
                    notificationSettings={notificationSettings}
                    setNotificationSettings={setNotificationSettings}
                    showFavoritesModal={showFavoritesModal}
                    setShowFavoritesModal={setShowFavoritesModal}
                    favoriteCategory={favoriteCategory}
                    setFavoriteCategory={setFavoriteCategory}
                    branches={branches}
                    loadingFavorites={loadingFavorites}
                    filteredFavorites={filteredFavorites}
                />
            )}
            {activeTab === 'reviews' && <ReviewsView />}
        </div>
      </main>
      
      {/* Barra de ações fixa inferior Mobile (Global-like Dashboard Nav) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 p-3 z-[100] flex items-center justify-around pb-safe">
        <button onClick={() => handleTabChange('dashboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-primary' : 'text-muted-foreground'}`}>
            <Activity className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase italic">Painel</span>
        </button>
        <button 
            onClick={() => handleTabChange('create')} 
            disabled={!isProfileComplete}
            className={`flex flex-col items-center gap-1 ${activeTab === 'create' ? 'text-primary' : 'text-muted-foreground'} ${!isProfileComplete ? 'opacity-30' : ''}`}
        >
            <PlusCircle className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase italic">Criar</span>
        </button>
        <div className="flex flex-col items-center gap-1 relative">
            <button 
                onClick={() => {
                    const profileId = localStorage.getItem('fixxer_lojista_id') || 'meu-perfil';
                    navigate({ to: `/lojista/${profileId}` as any });
                }} 

                className={`w-12 h-12 -mt-6 bg-black border border-white/20 rounded-full flex items-center justify-center shadow-2xl transition-all ${activeTab === 'profile' ? 'border-primary text-primary' : 'text-white'}`}
            >
                <Store className="w-6 h-6" />
            </button>
            <span className="text-[8px] font-black uppercase italic mt-1">Perfil</span>
        </div>
        <button 
            onClick={() => handleTabChange('reviews')} 
            disabled={!isProfileComplete}
            className={`flex flex-col items-center gap-1 ${activeTab === 'reviews' ? 'text-primary' : 'text-muted-foreground'} ${!isProfileComplete ? 'opacity-30' : ''}`}
        >
            <Star className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase italic">Votos</span>
        </button>
        <button onClick={() => setMobileMenuOpen(true)} className="flex flex-col items-center gap-1 text-muted-foreground">
            <Menu className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase italic">Menu</span>
        </button>
      </div>
      <CreateAdModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        defaultCategory={userRole}
      />
    </div>
  );
}

function UserProfileCard({ isProfileComplete, rating, getRatingStarColor, getRatingColor, profile }: { isProfileComplete: boolean; rating: number; getRatingStarColor: (val: number) => string; getRatingColor: (val: number) => string; profile?: { companyName?: string; logoUrl?: string | null; city?: string; state?: string } }) {
    return (
        <div className="p-4 rounded-2xl bg-[#1A1A1B] border border-white/10 space-y-3 shadow-xl">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-primary/50 p-0.5 shadow-[0_0_15px_rgba(0,255,135,0.2)]">
                    <div className="w-full h-full rounded-full bg-black/40 flex items-center justify-center text-primary overflow-hidden">
                        {profile?.logoUrl ? (
                            <img src={profile.logoUrl} alt={profile.companyName || "Logo"} className="w-full h-full object-cover" />
                        ) : (
                            <Store className="w-6 h-6" />
                        )}
                    </div>
                </div>
                <div className="flex-1 overflow-hidden">
                    <div className="text-[11px] font-black text-white uppercase italic truncate">
                        {profile?.companyName || "Complete seu perfil"}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-black uppercase">🏪 Lojista</span>
                        {(profile?.city || profile?.state) && (
                            <span className="flex items-center gap-0.5 text-[8px] font-bold text-muted-foreground uppercase italic truncate">
                                <MapPin className="w-2.5 h-2.5" />
                                {[profile?.city, profile?.state].filter(Boolean).join(" / ")}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            
            <div className={`grid grid-cols-2 gap-2 pt-2 border-t border-white/5 ${!isProfileComplete ? 'opacity-50 grayscale' : ''}`}>
                <div className="flex flex-col">
                    <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">Reputação</span>
                    <div className="flex items-center gap-1">
                        <Star className={`w-2.5 h-2.5 ${getRatingStarColor(rating)}`} />
                        <span className={`text-[10px] font-black italic ${getRatingColor(rating)}`}>{rating.toFixed(1)} / 5.0</span>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest text-right">Plano</span>
                    <div className="flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                        <span className="text-[10px] font-black text-amber-500 italic">Plano Pro</span>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg bg-primary/5 border border-primary/10">
                <ShieldCheck className="w-3 h-3 text-primary" />
                <span className="text-[8px] font-black text-primary uppercase italic">Selo Ouro FIXXER</span>
            </div>
        </div>
    );
}

function ReviewsView() {
    return (
        <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
            <div className="bg-[#1A1A1B] border border-white/10 p-8 rounded-3xl">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="font-black text-white uppercase italic text-lg">Avaliações Recebidas</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-2xl font-black text-[#00FF87]">4.9</span>
                            <div className="flex gap-0.5">
                                {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-[#00FF87] text-[#00FF87]" />)}
                            </div>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold ml-2">24 depoimentos</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {[1, 2].map(i => (
                        <div key={i} className="p-6 rounded-2xl bg-black/40 border border-white/5 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                        {i === 1 ? 'C' : 'M'}
                                    </div>
                                    <div>
                                        <div className="text-xs font-black text-white uppercase italic">{i === 1 ? 'Carlos Silva' : 'Marcos Oliveira'}</div>
                                        <div className="text-[8px] text-muted-foreground uppercase font-bold">{i === 1 ? 'Conferente Técnico' : 'Montador de Móveis'}</div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <div className="flex gap-0.5">
                                        {[1,2,3,4,5].map(s => <Star key={s} className={`w-2 h-2 ${s <= 5 ? 'fill-amber-500 text-amber-500' : 'text-white/10'}`} />)}
                                    </div>
                                    <span className="text-[8px] text-muted-foreground uppercase mt-1">12/07/2026</span>
                                </div>
                            </div>
                            <p className="text-[11px] text-white/70 leading-relaxed italic">
                                "{i === 1 ? 'Excelente empresa, projeto muito bem detalhado facilitando muito a conferência técnica. Recomendo!' : 'Pagamento rápido e equipe muito atenciosa no suporte. OS muito bem organizada.'}"
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function SidebarButton({ icon, label, active, onClick, disabled }: any) {
    return (
        <button 
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all w-full text-sm font-black uppercase italic tracking-wider ${
                active ? 'bg-[#00FF87] text-black' : 
                disabled ? 'bg-white/5 text-muted-foreground/30 cursor-not-allowed grayscale opacity-60' : 
                'hover:bg-white/5 text-muted-foreground'
            }`}
        >
            <div className="flex items-center gap-3">
                {icon} {label}
            </div>
            {disabled && <Lock className="w-3 h-3 opacity-50" />}
        </button>
    );
}

function NavButtonWithTooltip({ icon, label, active, onClick, disabled }: any) {
    if (!disabled) {
        return <SidebarButton icon={icon} label={label} active={active} onClick={onClick} />;
    }

    return (
        <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
                <div className="w-full touch-none">
                    <SidebarButton icon={icon} label={label} active={active} onClick={onClick} disabled={disabled} />
                </div>
            </TooltipTrigger>
            <TooltipContent 
                side="bottom" 
                align="center"
                className="bg-[#00FF87] text-black font-bold uppercase text-[9px] md:text-[10px] italic shadow-[0_0_20px_rgba(0,255,135,0.4)] z-[100] max-w-[200px] text-center md:side-right"
            >
                Preencha o perfil completo para habilitar
            </TooltipContent>
        </Tooltip>
    );
}

function DashboardView({ rating, getRatingColor, handleTabChange, isProfileComplete }: { rating: number; getRatingColor: (val: number) => string; handleTabChange: (tab: string) => void; isProfileComplete: boolean }) {
    const [filter, setFilter] = useState('Hoje');
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 3;
    const [customDates, setCustomDates] = useState({ start: '', end: '' });
    const [expandedServiceId, setExpandedServiceId] = useState<number | null>(null);

    const exportToPDF = (service: any) => {
        const doc = new jsPDF();
        
        // Header
        doc.setFillColor(0, 255, 135); // Primary color
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("FIXXER - RELATÓRIO DE O.S.", 105, 20, { align: "center" });
        
        doc.setFontSize(10);
        doc.text(`Exportado em: ${new Date().toLocaleString()}`, 105, 30, { align: "center" });

        // Service Info
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.text(`O.S. #${service.id} - ${service.title}`, 15, 55);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const details = [
            ["Status Atual:", service.status],
            ["Localização:", service.location],
            ["Valor:", service.value],
            ["Prazo:", service.deadline],
        ];

        autoTable(doc, {
            startY: 65,
            head: [['Campo', 'Valor']],
            body: details,
            theme: 'striped',
            headStyles: { fillColor: [0, 255, 135], textColor: [0, 0, 0] }
        });

        // History
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Histórico de Status", 15, (doc as any).lastAutoTable.finalY + 15);

        const history = [
            ["Hoje às 14:30", service.status, "Por Sistema"],
            ["10/07 às 09:15", "OS Criada", "Por Marcenaria Inovamad"]
        ];

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: [['Data/Hora', 'Status', 'Responsável']],
            body: history,
            theme: 'grid',
            headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255] }
        });

        doc.save(`FIXXER_OS_${service.id}.pdf`);
        toast.success("PDF gerado com sucesso!");
    };

    
    // Simulação de filtragem global (poderia ser baseada em dados reais)
    const getMultiplier = () => {
        switch(filter) {
            case 'Hoje': return 1;
            case '7 dias': return 4;
            case '30 dias': return 15;
            default: return 1;
        }
    };

    const multiplier = getMultiplier();

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Filtros Globais - Agora Responsivos */}
            <div className="bg-[#1A1A1B] border border-white/10 p-4 md:p-6 rounded-2xl md:rounded-3xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h3 className="font-black text-white uppercase italic text-xs md:text-sm tracking-widest">Filtro de Período Global</h3>
                    <div className="flex flex-col gap-3 w-full sm:w-auto">
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                            {['Hoje', '7 dias', '30 dias', 'Personalizado'].map(period => (
                                <button 
                                    key={period} 
                                    onClick={() => setFilter(period)}
                                    className={`flex-1 sm:flex-none px-3 py-2 rounded-xl text-[9px] md:text-[10px] font-bold uppercase border transition-all ${
                                        filter === period 
                                        ? 'bg-[#00FF87] text-black border-[#00FF87] shadow-[0_0_15px_rgba(0,255,135,0.3)]' 
                                        : 'bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10'
                                    }`}
                                >
                                    {period}
                                </button>
                            ))}
                        </div>

                        {filter === 'Personalizado' && (
                            <div className="flex flex-col sm:flex-row gap-2 animate-in slide-in-from-top-2 duration-300">
                                <div className="flex-1 space-y-1">
                                    <Label className="text-[8px] uppercase font-bold text-muted-foreground">Início</Label>
                                    <Input 
                                        type="date" 
                                        value={customDates.start}
                                        onChange={(e) => setCustomDates({...customDates, start: e.target.value})}
                                        className="bg-black/40 border-white/10 h-9 rounded-lg text-[10px] text-white" 
                                    />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <Label className="text-[8px] uppercase font-bold text-muted-foreground">Fim</Label>
                                    <Input 
                                        type="date" 
                                        value={customDates.end}
                                        onChange={(e) => setCustomDates({...customDates, end: e.target.value})}
                                        className="bg-black/40 border-white/10 h-9 rounded-lg text-[10px] text-white" 
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                <MetricCard label="Serviços Criados" value={(12 * multiplier).toString()} icon={<Briefcase />} color="text-blue-400" />
                <MetricCard 
                    label="Serviços Pendentes" 
                    value={(5 * multiplier).toString()} 
                    icon={<Clock />} 
                    color="text-orange-400" 
                    subValue={
                        <div className="flex flex-col gap-0.5 mt-1 border-t border-white/5 pt-1">
                            <div className="flex justify-between items-center text-[7px] md:text-[8px] font-bold uppercase">
                                <span className="text-muted-foreground">Aguardando:</span>
                                <span className="text-white">{(2 * multiplier)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[7px] md:text-[8px] font-bold uppercase">
                                <span className="text-muted-foreground">Em andamento:</span>
                                <span className="text-white">{(2 * multiplier)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[7px] md:text-[8px] font-bold uppercase">
                                <span className="text-muted-foreground">Atrasado:</span>
                                <span className="text-red-500">{(1 * multiplier)}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-1 text-[7px] font-black italic uppercase">
                                <span className="text-green-400">↑ 12%</span>
                                <span className="text-muted-foreground/50">vs. semana ant.</span>
                            </div>
                        </div>
                    }
                />
                <MetricCard label="Concluídos" value={(7 * multiplier).toString()} icon={<ShieldCheck />} color="text-primary" />
                <MetricCard 
                    label="Saldo do Período" 
                    value={`R$ ${(15.2 * multiplier).toFixed(1)}k`} 
                    icon={<DollarSign />} 
                    color="text-emerald-400"
                    subValue={
                        <div className="flex flex-col gap-0.5 mt-1 border-t border-white/5 pt-1">
                            <span className="text-[7px] md:text-[8px] font-bold text-muted-foreground uppercase">Fixo: <span className="text-white">R$ {(12.1 * multiplier).toFixed(1)}k</span></span>
                            <span className="text-[7px] md:text-[8px] font-bold text-muted-foreground uppercase">Comissões: <span className="text-white">R$ {(3.1 * multiplier).toFixed(1)}k</span></span>
                        </div>
                    }
                />
                <MetricCard label="Reputação" value={`${rating.toFixed(1)} ⭐`} icon={<Star />} color={getRatingColor(rating)} />
            </div>

            {/* Visual Edit Probe Element */}
            <div id="ts-visual-edit-probe-05c35fedc36048d1" className="hidden">
                Implementar uma confirmação e salvamento automático da nova ordem ao reordenar fotos e vídeos, garantindo que eu saiba quando a mudança foi concluída no banco.Adicionar retentativa automática do upload por arrastar e soltar quando falhar, com mensagens de erro padronizadas indicando o motivo e o tempo estimado.Adicionar a opção de exportar o histórico/linha do tempo de uma solicitação em PDF, para eu compartilhar ou arquivar.Implementar notificações em tempo real quando houver mudança de status nas minhas solicitações, para eu ser avisado imediatamente.Adicionar filtros na sessão de solicitações para eu refinar por status e por intervalo de datas sem precisar rolar.
            </div>
            
            <div className="bg-[#1A1A1B] border border-white/10 p-6 md:p-8 rounded-2xl md:rounded-3xl">
                <div className="flex flex-col space-y-4 mb-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <h3 className="font-black text-white uppercase italic text-sm md:text-base">Solicitações no Período</h3>
                            <Button 
                                onClick={() => handleTabChange('create')}
                                disabled={!isProfileComplete}
                                size="sm"
                                className="h-7 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[9px] font-black uppercase italic shadow-[0_0_15px_rgba(0,255,135,0.1)] transition-all hover:shadow-[0_0_20px_rgba(0,255,135,0.2)]"
                            >
                                <PlusCircle className="w-3 h-3 mr-1.5" /> Novo Serviço
                            </Button>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                                placeholder="Buscar OS ou título..." 
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="bg-black/40 border-white/10 pl-10 h-10 rounded-xl text-xs"
                            />
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                        {['Todos', 'Pendente', 'Concluído', 'Em andamento', 'Atrasado'].map((status) => (
                            <button
                                key={status}
                                onClick={() => {
                                    setStatusFilter(status);
                                    setCurrentPage(1);
                                }}
                                className={`px-3 py-1.5 rounded-full text-[8px] md:text-[9px] font-black uppercase italic transition-all border ${
                                    statusFilter === status
                                        ? 'bg-primary text-black border-primary'
                                        : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className="space-y-3 md:space-y-4">
                    {(() => {
                        const services = [
                            { id: 2490, title: 'Montagem Dormitório', location: 'São Paulo/SP', value: 'R$ 450,00', deadline: '15/07', status: 'Concluído', color: 'text-primary', bg: 'bg-primary/10', icon: <Briefcase className="w-4 h-4" /> },
                            { id: 2491, title: 'Medição Cozinha', location: 'Campinas/SP', value: 'R$ 200,00', deadline: '18/07', status: 'Pendente', color: 'text-orange-400', bg: 'bg-orange-400/10', icon: <Clock className="w-4 h-4" /> },
                            { id: 2492, title: 'Instalação Cooktop', location: 'Santos/SP', value: 'R$ 150,00', deadline: '20/07', status: 'Em andamento', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: <Activity className="w-4 h-4" /> },
                            { id: 2493, title: 'Reparo Dobradiças', location: 'Jundiaí/SP', value: 'R$ 80,00', deadline: '10/07', status: 'Atrasado', color: 'text-red-500', bg: 'bg-red-500/10', icon: <AlertCircle className="w-4 h-4" /> },
                            { id: 2494, title: 'Ajuste Portas', location: 'Osasco/SP', value: 'R$ 120,00', deadline: '22/07', status: 'Pendente', color: 'text-orange-400', bg: 'bg-orange-400/10', icon: <Clock className="w-4 h-4" /> }
                        ];

                        const filtered = services.filter(s => {
                            const matchesStatus = statusFilter === 'Todos' || s.status === statusFilter;
                            const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                                s.id.toString().includes(searchTerm);
                            return matchesStatus && matchesSearch;
                        });

                        const totalPages = Math.ceil(filtered.length / itemsPerPage);
                        const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

                        return (
                            <>
                                {paginated.length > 0 ? paginated.map((service) => (
                                    <div key={service.id} className="group flex flex-col rounded-xl overflow-hidden bg-black/40 border border-white/5 transition-all hover:border-white/20">
                                        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg ${service.bg} flex items-center justify-center ${service.color}`}>
                                                {service.icon}
                                            </div>
                                            <div>
                                                <div className="text-xs font-black uppercase italic text-white">{service.title}</div>
                                                <div className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider">OS-{service.id} • {service.location}</div>
                                            </div>
                                            </div>
                                            <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0 w-full sm:w-auto">
                                            <div className="flex flex-col items-end mr-2">
                                                <span className="font-black text-xs text-white">{service.value}</span>
                                                <span className="text-[7px] text-muted-foreground uppercase font-bold">Prazo: {service.deadline}</span>
                                            </div>
                                            <span className={`px-3 py-1 ${service.bg} ${service.color} font-bold text-[9px] rounded-full uppercase`}>
                                                {service.status}
                                            </span>
                                            <Button 
                                                size="icon" 
                                                variant="ghost" 
                                                onClick={() => setExpandedServiceId(expandedServiceId === service.id ? null : service.id)}
                                                className={`h-8 w-8 rounded-lg border border-white/5 hover:bg-white/5 text-primary transition-transform ${expandedServiceId === service.id ? 'rotate-90' : ''}`}
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </Button>
                                            </div>
                                        </div>
                                        
                                        {expandedServiceId === service.id && (
                                            <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                                                <div className="pt-4 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-4">
                                                        <div className="space-y-2">
                                                            <div className="text-[8px] font-black uppercase text-muted-foreground italic">Detalhes do Serviço</div>
                                                            <p className="text-[10px] text-white/70 leading-relaxed">
                                                                Solicitação de {service.title.toLowerCase()} para projeto de alto padrão. Requer profissional com experiência e ferramentas completas.
                                                            </p>
                                                        </div>
                                                        
                                                        <div className="space-y-3">
                                                            <div className="text-[8px] font-black uppercase text-muted-foreground italic flex items-center gap-2">
                                                                <Clock className="w-2.5 h-2.5" /> Linha do Tempo / Histórico
                                                            </div>
                                                            <div className="space-y-3 pl-2 border-l border-white/10">
                                                                <div className="relative pl-4">
                                                                    <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-primary" />
                                                                    <div className="text-[9px] font-black text-white uppercase italic">Status alterado para {service.status}</div>
                                                                    <div className="text-[7px] text-muted-foreground uppercase font-bold">Hoje às 14:30 • Por Sistema</div>
                                                                </div>
                                                                <div className="relative pl-4">
                                                                    <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-white/20" />
                                                                    <div className="text-[9px] font-black text-white/50 uppercase italic">OS Criada</div>
                                                                    <div className="text-[7px] text-muted-foreground/50 uppercase font-bold">10/07 às 09:15 • Por Marcenaria Inovamad</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-3 justify-end items-end w-full">
                                                        <div className="w-full p-3 rounded-xl bg-white/5 border border-white/5">
                                                            <div className="text-[8px] font-black uppercase text-muted-foreground italic mb-3">Ações Rápidas</div>
                                                            <div className="flex flex-wrap gap-2 w-full">
                                                                <Link 
                                                                    to="/feed/lojista" 
                                                                    search={{ context: service.id }}
                                                                    className="flex-1 min-w-[110px] flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white text-[9px] font-bold uppercase italic border border-white/10 px-3 py-2.5 rounded-lg transition-all"
                                                                >
                                                                    <Info className="w-3 h-3" /> Ver Detalhes
                                                                </Link>
                                                                <Button 
                                                                    onClick={() => exportToPDF(service)}
                                                                    className="flex-1 min-w-[80px] flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white text-[9px] font-bold uppercase italic border border-white/10 px-3 py-2.5 rounded-lg transition-all h-auto"
                                                                >
                                                                    <Download className="w-3 h-3" /> PDF
                                                                </Button>
                                                                <Button className="w-full sm:flex-1 min-w-[140px] bg-primary text-black text-[9px] font-black uppercase italic h-10 rounded-lg shadow-[0_0_15px_rgba(0,255,135,0.2)]">Avançar Status</Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )) : (
                                    <div className="py-8 text-center text-muted-foreground text-xs uppercase font-bold italic">
                                        Nenhuma solicitação encontrada
                                    </div>
                                )}

                                {totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-2 mt-4">
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(prev => prev - 1)}
                                            className="h-8 text-[9px] uppercase font-black"
                                        >
                                            Anterior
                                        </Button>
                                        <span className="text-[9px] font-black text-white px-2">
                                            Página {currentPage} de {totalPages}
                                        </span>
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(prev => prev + 1)}
                                            className="h-8 text-[9px] uppercase font-black"
                                        >
                                            Próxima
                                        </Button>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
}

function CreateServiceView() {
    return (
        <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom duration-500 pb-20">
          <div className="bg-[#1A1A1B] border border-white/10 p-5 md:p-8 rounded-2xl md:rounded-3xl space-y-6 md:space-y-8 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                <div className="space-y-2">
                    <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Tipo de Profissional</Label>
                    <Select>
                        <SelectTrigger className="bg-black/40 border-white/10 h-12 rounded-xl text-xs md:text-sm">
                            <SelectValue placeholder="Selecione o parceiro..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1A1B] border-white/10 z-[100]">
                            <SelectItem value="montador" className="text-xs md:text-sm">Montador de Móveis</SelectItem>
                            <SelectItem value="conferente" className="text-xs md:text-sm">Conferente Técnico</SelectItem>
                            <SelectItem value="projetista" className="text-xs md:text-sm">Projetista</SelectItem>
                            <SelectItem value="medidor" className="text-xs md:text-sm">Medidor</SelectItem>
                            <SelectItem value="instalador" className="text-xs md:text-sm">Instalador</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Título do Serviço</Label>
                    <Input placeholder="Ex: Medição Técnica Cozinha" className="bg-black/40 border-white/10 h-12 rounded-xl text-xs md:text-sm" />
                </div>
            </div>
            
            <div className="space-y-2">
                <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Descrição Detalhada</Label>
                <Textarea placeholder="Descreva as especificações técnicas..." className="bg-black/40 border-white/10 min-h-[120px] md:min-h-[150px] rounded-xl p-4 text-xs md:text-sm" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                <div className="space-y-2">
                    <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Valor Contrato Final (R$)</Label>
                    <Input type="number" placeholder="20000.00" className="bg-black/40 border-white/10 h-12 rounded-xl text-xs md:text-sm" />
                </div>
                <div className="space-y-2">
                    <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Localização (Cidade/UF)</Label>
                    <Input placeholder="Ex: São Paulo/SP" className="bg-black/40 border-white/10 h-12 rounded-xl text-xs md:text-sm" />
                </div>
            </div>

            <Button className="w-full bg-[#00FF87] text-black font-black uppercase italic tracking-widest hover:bg-[#00FF87]/90 h-14 rounded-2xl shadow-[0_0_30px_rgba(0,255,135,0.2)] text-xs md:text-sm">
                Publicar Serviço no Feed
            </Button>
          </div>
        </div>
    )
}

function ProfileView({ 
    setIsProfileComplete, 
    rating, 
    getRatingColor, 
    setRating, 
    undoStack, 
    pushToUndo, 
    setEmergencySetGallery, 
    handleUndo, 
    failedUploads, 
    setFailedUploads,
    activeSettingsTab,
    setActiveSettingsTab,
    notificationSettings,
    setNotificationSettings,
    showFavoritesModal,
    setShowFavoritesModal,
    favoriteCategory,
    setFavoriteCategory,
    branches,
    loadingFavorites,
    filteredFavorites
}: { 
    setIsProfileComplete: (complete: boolean) => void; 
    rating: number; 
    getRatingColor: (val: number) => string; 
    setRating: (rating: number) => void;
    undoStack: any[];
    pushToUndo: (action: string, state: any) => void;
    setEmergencySetGallery: (fn: any) => void;
    handleUndo: () => void;
    failedUploads: File[];
    setFailedUploads: React.Dispatch<React.SetStateAction<File[]>>;
    activeSettingsTab: string;
    setActiveSettingsTab: (tab: string) => void;
    notificationSettings: any;
    setNotificationSettings: React.Dispatch<React.SetStateAction<any>>;
    showFavoritesModal: boolean;
    setShowFavoritesModal: (show: boolean) => void;
    favoriteCategory: string;
    setFavoriteCategory: (cat: string) => void;
    branches: string[];
    loadingFavorites: boolean;
    filteredFavorites: any[];
}) {
    const navigate = useNavigate();
    const [userEmail, setUserEmail] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [socialName, setSocialName] = useState("");
    const [responsibleName, setResponsibleName] = useState("");
    const [emailContact, setEmailContact] = useState("");
    const [cnpj, setCnpj] = useState("");
    const [whatsapp, setWhatsapp] = useState("");
    const [phone, setPhone] = useState("");
    const [cep, setCep] = useState("");
    const [activityBranch, setActivityBranch] = useState("");
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [bannerUrl, setBannerUrl] = useState<string | null>(null);
    const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
    const [videoUrls, setVideoUrls] = useState<string[]>([]);
    const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
    const [documents, setDocuments] = useState<{name: string, url: string, size: number}[]>([]);
    const [specialties, setSpecialties] = useState<{id: string, title: string, description: string}[]>([]);
    const [socialLinks, setSocialLinks] = useState({
        instagram: "",
        facebook: "",
        tiktok: "",
        site: ""
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data: { user } } = await supabaseExternal.auth.getUser();
                if (!user) return;
                
                setUserEmail(user.email || "");

                // 1. Tentar carregar do LocalStorage primeiro (fallback/cache rápido)
                const cachedData = localStorage.getItem(`fixxer_profile_${user.email}`);
                if (cachedData) {
                    const parsed = JSON.parse(cachedData);
                    setCompanyName(parsed.companyName || "");
                    setSocialName(parsed.socialName || "");
                    setCnpj(parsed.cnpj || "");
                    setResponsibleName(parsed.responsibleName || "");
                    setEmailContact(parsed.emailContact || "");
                    setWhatsapp(parsed.whatsapp || "");
                    setPhone(parsed.phone || "");
                    setCep(parsed.cep || "");
                    setActivityBranch(parsed.activityBranch || "");
                    setLogoUrl(parsed.logoUrl || null);
                    setBannerUrl(parsed.bannerUrl || null);
                    setGalleryUrls(parsed.galleryUrls || []);
                    setVideoUrls(parsed.videoUrls || []);
                    setDocuments(parsed.documents || []);
                    setSpecialties(Array.isArray(parsed.specialties) ? parsed.specialties : []);
                    setSocialLinks(parsed.socialLinks || { instagram: "", facebook: "", tiktok: "", site: "" });
                }

                // 2. Buscar dados reais do Supabase
                const { data, error } = await supabaseExternal
                    .from('store_profiles')
                    .select('*')
                    .eq('user_email', user.email)
                    .single();

                if (data && !error) {
                    setCompanyName(data.company_name || "");
                    setSocialName(data.social_name || "");
                    setCnpj(data.cnpj || "");
                    setResponsibleName(data.responsible_name || "");
                    setEmailContact(data.email_contact || user.email || "");
                    setWhatsapp(data.whatsapp || "");
                    setPhone(data.phone || "");
                    setCep(data.zipcode || "");
                    setActivityBranch(data.activity_branch || "");
                    setLogoUrl(data.logo_url || null);
                    setBannerUrl(data.banner_url || null);
                    setGalleryUrls(data.gallery_urls || []);
                    setVideoUrls(data.video_urls || []);
                    setDocuments(data.documents || []);
                    setSpecialties(Array.isArray(data.specialties) ? data.specialties : []);
                    setSocialLinks({
                        instagram: data.instagram || "",
                        facebook: data.facebook || "",
                        tiktok: data.tiktok || "",
                        site: data.site_url || ""
                    });
                    
                    // Atualizar o cache com dados frescos do banco
                    localStorage.setItem(`fixxer_profile_${user.email}`, JSON.stringify({
                        companyName: data.company_name,
                        socialName: data.social_name,
                        cnpj: data.cnpj,
                        responsibleName: data.responsible_name,
                        emailContact: data.email_contact,
                        whatsapp: data.whatsapp,
                        phone: data.phone,
                        cep: data.zipcode,
                        activityBranch: data.activity_branch,
                        logoUrl: data.logo_url,
                        bannerUrl: data.banner_url,
                        galleryUrls: data.gallery_urls,
                        videoUrls: data.video_urls,
                        documents: data.documents,
                        socialLinks: {
                            instagram: data.instagram,
                            facebook: data.facebook,
                            tiktok: data.tiktok,
                            site: data.site_url
                        }
                    }));
                    if (data.id) localStorage.setItem('fixxer_lojista_id', data.id);
                }
            } catch (err) {
                console.error("Erro ao carregar perfil:", err);
            }
        };

        fetchProfile();
        setEmergencySetGallery(() => setGalleryUrls);
    }, [setEmergencySetGallery]);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: any, type: 'gallery' | 'video') => {
        const { active, over } = event;
        if (active.id !== over.id) {
            if (type === 'gallery') {
                setGalleryUrls((items) => {
                    const oldIndex = items.indexOf(active.id);
                    const newIndex = items.indexOf(over.id);
                    return arrayMove(items, oldIndex, newIndex);
                });
            } else {
                setVideoUrls((items) => {
                    const oldIndex = items.indexOf(active.id);
                    const newIndex = items.indexOf(over.id);
                    return arrayMove(items, oldIndex, newIndex);
                });
            }
            toast.success("Ordem atualizada!");
            saveMediaOrder(type);
        }
    };

    const saveMediaOrder = async (type: 'gallery' | 'video', customUrls?: string[]) => {
        const toastId = toast.loading("Salvando nova ordem...");
        try {
            const { data: { user } } = await supabaseExternal.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            const currentUrls = customUrls || (type === 'gallery' ? galleryUrls : videoUrls);
            const updateData = type === 'gallery' ? { gallery_order: currentUrls } : { video_order: currentUrls };
            
            const { error } = await supabaseExternal
                .from('user_profiles')
                .update(updateData)
                .eq('user_id', user.id);

            if (error) throw error;
            toast.success("Ordem salva permanentemente!", { id: toastId });
        } catch (err) {
            console.error('Erro ao salvar ordem:', err);
            toast.error("Erro ao salvar ordem no banco", { id: toastId });
        }
    };


    const { uploadFile, isUploading, uploadProgress } = useMediaUpload();

    // Autosave defensivo: preserva tudo que foi preenchido, mesmo se algo desmontar a tela
    useEffect(() => {
        if (!userEmail) return;
        const t = setTimeout(() => {
            try {
                localStorage.setItem(`fixxer_profile_${userEmail}`, JSON.stringify({
                    companyName, socialName, cnpj, responsibleName, emailContact,
                    whatsapp, phone, cep, activityBranch, logoUrl, bannerUrl,
                    galleryUrls, videoUrls, documents, socialLinks,
                }));
            } catch (e) { /* quota, ignora */ }
        }, 400);
        return () => clearTimeout(t);
    }, [userEmail, companyName, socialName, cnpj, responsibleName, emailContact, whatsapp, phone, cep, activityBranch, logoUrl, bannerUrl, galleryUrls, videoUrls, documents, socialLinks]);

    const retryFailedUpload = async (fileName: string) => {
        const file = failedUploads.find(f => f.name === fileName);
        if (file) {
            setFailedUploads(prev => prev.filter(f => f.name !== fileName));
            const type = file.type.startsWith('video/') ? 'video' : 'gallery';
            handleFileUpload({ target: { files: [file] } } as any, type);
        }
    };

    const retryAllFailed = async () => {
        const filesToRetry = [...failedUploads];
        setFailedUploads([]);
        for (const file of filesToRetry) {
            const type = file.type.startsWith('video/') ? 'video' : 'gallery';
            handleFileUpload({ target: { files: [file] } } as any, type);
        }
    };

    useEffect(() => {
        const loadMediaOrder = async () => {
            try {
                const { data: { user } } = await supabaseExternal.auth.getUser();
                if (!user) return;

                const { data, error } = await supabaseExternal
                    .from('user_profiles')
                    .select('gallery_order, video_order')
                    .eq('user_id', user.id)
                    .single();

                if (error) throw error;
                if (data.gallery_order) setGalleryUrls(data.gallery_order);
                if (data.video_order) setVideoUrls(data.video_order);
            } catch (err) {
                console.error('Erro ao carregar ordem:', err);
            }
        };
        loadMediaOrder();
    }, []);

    const [address, setAddress] = useState({
        logradouro: "",
        bairro: "",
        localidade: "",
        uf: "",
        numero: "",
        complemento: ""
    });
    const [isLoadingCep, setIsLoadingCep] = useState(false);


    useEffect(() => {
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length === 8) {
            handleCepLookup(cleanCep);
        }
    }, [cep]);

    const handleCepLookup = async (cleanCep: string) => {
        setIsLoadingCep(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await response.json();
            if (!data.erro) {
                setAddress(prev => ({
                    ...prev,
                    logradouro: data.logradouro,
                    bairro: data.bairro,
                    localidade: data.localidade,
                    uf: data.uf
                }));
            }
        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
        } finally {
            setIsLoadingCep(false);
        }
    };

    const [cropImage, setCropImage] = useState<string | null>(null);
    const [cropType, setCropType] = useState<'logo' | 'banner' | 'gallery' | 'video' | 'document' | null>(null);
    const [cropSaving, setCropSaving] = useState(false);

    // Limites aplicados no modal de Ajustar Imagem
    const LOGO_MAX_MB = 5;
    const LOGO_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];


    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | { target: { files: File[] } }, type: 'logo' | 'banner' | 'gallery' | 'video' | 'document') => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Limite para galeria
        if (type === 'gallery' && (galleryUrls.length + files.length) > 12) {
            toast.error("Limite da Galeria", {
                description: "Você pode ter no máximo 12 fotos na galeria."
            });
            return;
        }

        const uploadPromises = files.map(async (originalFile) => {
            let file = originalFile;
            // Validações
            const isVideo = type === 'video';
            const isDoc = type === 'document';
            const maxSize = isVideo ? 50 * 1024 * 1024 : (isDoc ? 10 * 1024 * 1024 : 5 * 1024 * 1024);
            const allowedTypes = isVideo ? ['video/mp4', 'video/quicktime'] : (isDoc ? ['application/pdf'] : ['image/jpeg', 'image/png', 'image/webp']);

            if (!allowedTypes.includes(file.type)) {
                toast.error("Formato inválido", {
                    description: `${file.name} não é um formato suportado (${allowedTypes.join(', ')}).`
                });
                return null;
            }

            if (file.size > maxSize) {
                toast.error("Arquivo muito grande", {
                    description: `${file.name} excede o limite de ${maxSize / (1024 * 1024)}MB.`
                });
                return null;
            }

            // Compressão de imagem antes do upload (exceto para vídeos e documentos)
            if (type !== 'video' && type !== 'document' && file.type.startsWith('image/')) {
                try {
                    file = await compressImage(file, 1200, 0.8);
                } catch (err) {
                    console.error("Erro na compressão:", err);
                    // Mantém o arquivo original se falhar
                }
            }

            // Preview para Logo (apenas se for arquivo único ou o primeiro da lista)
            if (type === 'logo') {
                const reader = new FileReader();
                reader.onload = () => {
                    setCropImage(reader.result as string);
                    setCropType('logo');
                };
                reader.readAsDataURL(file);
                return null;
            }

            const folder = type === 'video' ? 'videos' : type === 'gallery' ? 'gallery' : type === 'document' ? 'documents' : 'branding';
            const url = await uploadFile(file, 'media', folder);
            
            if (url) {
                toast.success("Upload concluído", {
                    description: `${file.name} está pronto.`
                });
                if (type === 'document') {
                    return { name: file.name, url, size: file.size };
                }
            } else {
                setFailedUploads(prev => [...prev, file]);
            }
            return url;
        });

        const results = (await Promise.all(uploadPromises)).filter(res => res !== null);
        
        if (results.length > 0) {
            if (type === 'logo') setLogoUrl(results[0] as string);
            else if (type === 'banner') setBannerUrl(results[0] as string);
            else if (type === 'gallery') {
                const urls = results as string[];
                const newGallery = [...galleryUrls, ...urls];
                setGalleryUrls(newGallery);
                saveMediaOrder('gallery', newGallery);
            }
            else if (type === 'video') {
                const urls = results as string[];
                const newVideos = [...videoUrls.slice(-(2 - urls.length)), ...urls];
                setVideoUrls(newVideos);
                saveMediaOrder('video', newVideos);
            }
            else if (type === 'document') {
                const newDocs = results as {name: string, url: string, size: number}[];
                setDocuments(prev => [...prev, ...newDocs]);
            }
        }
        
        // Limpar input se for um evento de mudança real
        if ('target' in e && e.target instanceof HTMLInputElement) {
            e.target.value = '';
        }
    };

    const confirmRemoval = (type: string, onConfirm: () => void) => {
        toast("Confirmar Remoção", {
            description: `Tem certeza que deseja remover este ${type}?`,
            action: {
                label: "Remover",
                onClick: onConfirm,
            },
            cancel: {
                label: "Cancelar",
                onClick: () => {},
            },
            duration: 5000,
        });
    };

    const handleDrop = async (e: React.DragEvent, type: 'logo' | 'banner' | 'gallery' | 'video' | 'document') => {
        e.preventDefault();
        setIsDraggingOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            const mockEvent = { target: { files } };
            handleFileUpload(mockEvent as any, type);
        }
    };

    const toggleMediaSelection = (id: string) => {
        setSelectedMedia(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const deleteSelectedMedia = async () => {
        if (selectedMedia.length === 0) return;
        
        const count = selectedMedia.length;
        pushToUndo('gallery_delete', galleryUrls);
        const toastId = toast.loading(`Excluindo ${count} item(s)...`);

        try {
            setGalleryUrls(prev => prev.filter(url => !selectedMedia.includes(url)));
            setVideoUrls(prev => prev.filter(url => !selectedMedia.includes(url)));
            setSelectedMedia([]);
            
            await saveMediaOrder('gallery');
            await saveMediaOrder('video');
            
            toast.success(`${count} item(s) removido(s) com sucesso!`, { 
                id: toastId,
                action: {
                    label: "Desfazer",
                    onClick: handleUndo
                }
            });
        } catch (err) {
            console.error('Erro ao excluir em lote:', err);
            toast.error("Erro ao realizar exclusão em lote", { id: toastId });
        }
    };

    const selectAllMedia = () => {
        setSelectedMedia([...galleryUrls, ...videoUrls]);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
            {isUploading && (
                <div className="fixed bottom-10 right-10 z-[100] w-72 bg-[#1A1A1B] border border-primary/30 p-4 rounded-2xl shadow-2xl animate-in slide-in-from-right duration-300">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                            <Activity className="w-4 h-4 animate-spin" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-white italic">Enviando Arquivos...</span>
                    </div>
                    {uploadProgress.map((p, i) => (
                        <div key={i} className="space-y-1 mb-2 last:mb-0">
                            <div className="flex justify-between text-[8px] font-bold text-muted-foreground uppercase">
                                <span className="truncate max-w-[150px]">{p.fileName}</span>
                                <span>{p.progress}%</span>
                            </div>
                            <Progress value={p.progress} className="h-1 bg-white/5" />
                        </div>
                    ))}
                </div>
            )}
            <div id="settings-section" className="bg-[#1A1A1B] border border-white/10 p-5 md:p-8 rounded-2xl md:rounded-3xl space-y-6 md:space-y-8 shadow-2xl scroll-mt-24">

                 <div className="flex flex-col gap-4 mb-4 pb-4 border-b border-white/5">
                     <div className="flex items-center gap-4">
                         <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(0,255,135,0.1)]">
                             <Building2 className="w-8 h-8" />
                         </div>
                         <div>
                             <h3 className="font-black text-white uppercase italic text-lg tracking-tight">Perfil e Configurações</h3>
                             <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Mantenha seus dados e preferências atualizados.</p>
                         </div>
                     </div>

                     <div className="flex gap-2 overflow-x-auto scrollbar-none mt-2">
                        <button 
                            onClick={() => setActiveSettingsTab('my-profile')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all border whitespace-nowrap ${activeSettingsTab === 'my-profile' ? 'bg-primary text-black border-primary' : 'bg-white/5 text-muted-foreground border-white/10 hover:border-white/20'}`}
                        >
                            <User className="w-3 h-3 inline-block mr-1" /> Meu Perfil
                        </button>
                        <button 
                            onClick={() => setActiveSettingsTab('security')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all border whitespace-nowrap ${activeSettingsTab === 'security' ? 'bg-primary text-black border-primary' : 'bg-white/5 text-muted-foreground border-white/10 hover:border-white/20'}`}
                        >
                            <Lock className="w-3 h-3 inline-block mr-1" /> Segurança
                        </button>
                        <button 
                            onClick={() => setActiveSettingsTab('notifications')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase italic transition-all border whitespace-nowrap ${activeSettingsTab === 'notifications' ? 'bg-primary text-black border-primary' : 'bg-white/5 text-muted-foreground border-white/10 hover:border-white/20'}`}
                        >
                            <Bell className="w-3 h-3 inline-block mr-1" /> Notificações
                        </button>
                     </div>
                 </div>

                  {activeSettingsTab === 'my-profile' ? (
                   <>
                    <div className="space-y-6">
                     <h4 className="text-xs font-black uppercase italic text-primary flex items-center gap-2">
                         <User className="w-3 h-3" /> Dados da Empresa e Responsável
                     </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Nome Fantasia da Empresa *</Label>
                            <Input required value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="FIXXER Móveis Planejados" className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all" />
                         </div>
                         <div className="space-y-2">
                            <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Razão Social *</Label>
                            <Input required value={socialName} onChange={(e) => setSocialName(e.target.value)} placeholder="FIXXER LTDA" className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all" />
                         </div>
                         <div className="space-y-2">
                            <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">CNPJ *</Label>
                            <IMaskInput
                              mask="00.000.000/0000-00"
                              value={cnpj}
                              onAccept={(value) => setCnpj(value)}
                              required 
                              placeholder="00.000.000/0001-00" 
                              className="flex h-12 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 focus:border-primary/50 transition-all" 
                            />
                         </div>
                         <div className="space-y-2">
                            <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Nome do Responsável (Obrigatório) *</Label>
                            <Input required value={responsibleName} onChange={(e) => setResponsibleName(e.target.value)} placeholder="Digite o nome do responsável" className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all" />
                         </div>
                         <div className="space-y-2">
                            <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">E-mail de Contato Principal *</Label>
                            <Input required type="email" value={emailContact} onChange={(e) => setEmailContact(e.target.value)} placeholder="contato@fixxer.com.br" className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all" />
                        </div>
                        <div className="space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest flex items-center gap-2">
                             <MessageCircle className="w-3 h-3 text-[#25D366]" /> WhatsApp (Comercial) *
                           </Label>
                           <IMaskInput
                             mask="(00) 00000-0000"
                             value={whatsapp}
                             onAccept={(value) => setWhatsapp(value)}
                             required 
                             placeholder="(11) 99999-9999" 
                             className="flex h-12 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 focus:border-[#25D366]/50 transition-all" 
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest flex items-center gap-2">
                             <Phone className="w-3 h-3 text-blue-400" /> Telefone Fixo (Opcional)
                           </Label>
                           <IMaskInput
                             mask="(00) 0000-0000"
                             value={phone}
                             onAccept={(value) => setPhone(value)}
                             placeholder="(11) 4000-0000" 
                             className="flex h-12 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 focus:border-blue-400/50 transition-all" 
                           />
                        </div>
                    </div>
                 </div>

                  <div className="space-y-6 pt-6 border-t border-white/5">
                    <ActivitySelect value={activityBranch} onChange={setActivityBranch} />

                    <h4 className="text-xs font-black uppercase italic text-primary flex items-center gap-2">
                        <Globe className="w-3 h-3" /> Redes Sociais e Site
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest flex items-center gap-2">
                             <div className="w-3 h-3 rounded-sm bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600" /> Instagram
                           </Label>
                           <Input value={socialLinks.instagram} onChange={(e) => setSocialLinks(prev => ({...prev, instagram: e.target.value}))} placeholder="@suaempresa" className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-pink-500/50 transition-all" />
                        </div>
                        <div className="space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest flex items-center gap-2">
                             <div className="w-3 h-3 rounded-full bg-[#1877F2] flex items-center justify-center text-[8px] font-bold">f</div> Facebook
                           </Label>
                           <Input value={socialLinks.facebook} onChange={(e) => setSocialLinks(prev => ({...prev, facebook: e.target.value}))} placeholder="facebook.com/suaempresa" className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-[#1877F2]/50 transition-all" />
                        </div>
                        <div className="space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest flex items-center gap-2">
                             <Video className="w-3 h-3 text-white" /> TikTok
                           </Label>
                           <Input value={socialLinks.tiktok} onChange={(e) => setSocialLinks(prev => ({...prev, tiktok: e.target.value}))} placeholder="@suaempresa" className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-white/30 transition-all" />
                        </div>
                        <div className="space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest flex items-center gap-2">
                             <Globe className="w-3 h-3 text-blue-400" /> Site Oficial
                           </Label>
                           <Input value={socialLinks.site} onChange={(e) => setSocialLinks(prev => ({...prev, site: e.target.value}))} placeholder="https://www.suaempresa.com.br" className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-blue-400/50 transition-all" />
                        </div>
                    </div>
                 </div>

                 <div className="space-y-6 pt-6 border-t border-white/5">
                    <h4 className="text-xs font-black uppercase italic text-primary flex items-center gap-2">
                        <MapPin className="w-3 h-3" /> Endereço Completo
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2 relative">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">CEP *</Label>
                           <IMaskInput 
                             mask="00000-000"
                             value={cep}
                             onAccept={(value) => setCep(value)}
                             required
                             placeholder="00000-000" 
                             className="flex h-12 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 focus:border-primary/50 transition-all" 
                           />
                           {isLoadingCep && <div className="absolute right-3 bottom-3 animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />}
                        </div>
                        <div className="md:col-span-2 space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Logradouro / Rua *</Label>
                           <Input 
                             required
                             value={address.logradouro} 
                             onChange={(e) => setAddress({...address, logradouro: e.target.value})}
                             placeholder="Rua, Avenida..." 
                             className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all" 
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Bairro *</Label>
                           <Input 
                             required
                             value={address.bairro} 
                             onChange={(e) => setAddress({...address, bairro: e.target.value})}
                             placeholder="Bairro" 
                             className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all" 
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Cidade *</Label>
                           <Input 
                             required
                             value={address.localidade} 
                             onChange={(e) => setAddress({...address, localidade: e.target.value})}
                             placeholder="Cidade" 
                             className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all" 
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Estado / UF *</Label>
                           <Input 
                             required
                             value={address.uf} 
                             onChange={(e) => setAddress({...address, uf: e.target.value})}
                             placeholder="UF" 
                             className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all" 
                           />
                        </div>
                        <div className="space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Número *</Label>
                           <Input required value={address.numero} onChange={(e) => setAddress({...address, numero: e.target.value})} placeholder="123" className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all" />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                           <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Complemento</Label>
                           <Input value={address.complemento} onChange={(e) => setAddress({...address, complemento: e.target.value})} placeholder="Sala, Bloco, etc." className="bg-black/40 border-white/10 h-12 rounded-xl focus:border-primary/50 transition-all" />
                        </div>
                    </div>
                 </div>

                 <div className="space-y-6 pt-6 border-t border-white/5">
                    <h4 className="text-xs font-black uppercase italic text-primary flex items-center gap-2">
                        <ImageIcon className="w-3 h-3" /> Mídia e Identidade Visual
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Logo da Empresa *</Label>
                            <div className="relative h-40 group">
                                <label 
                                    className={`h-full w-full rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-3 hover:border-primary/50 transition-all cursor-pointer bg-black/20 overflow-hidden shadow-inner block ${isDraggingOver ? 'border-primary ring-2 ring-primary/20' : 'border-white/10'}`}
                                    onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                                    onDragLeave={() => setIsDraggingOver(false)}
                                    onDrop={(e) => handleDrop(e, 'logo')}
                                >
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} />
                                    {logoUrl ? (
                                        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-4" />
                                    ) : (
                                        <>
                                            <PlusCircle className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                                            <span className="text-[10px] font-black uppercase text-muted-foreground group-hover:text-primary transition-colors">Upload Logo</span>
                                        </>
                                    )}
                                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </label>
                                {logoUrl && (
                                    <button 
                                        onClick={() => confirmRemoval('Logo', () => setLogoUrl(null))}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    >
                                        <Trash2 className="w-3 h-3 text-white" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">Banner da Empresa</Label>
                            <div className="relative h-40 group">
                                <label 
                                    className={`h-full w-full rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-3 hover:border-primary/50 transition-all cursor-pointer bg-black/20 overflow-hidden shadow-inner block ${isDraggingOver ? 'border-primary ring-2 ring-primary/20' : 'border-white/10'}`}
                                    onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                                    onDragLeave={() => setIsDraggingOver(false)}
                                    onDrop={(e) => handleDrop(e, 'banner')}
                                >
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'banner')} />
                                    {bannerUrl ? (
                                        <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <PlusCircle className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                                            <span className="text-[10px] font-black uppercase text-muted-foreground group-hover:text-primary transition-colors">Upload Banner</span>
                                        </>
                                    )}
                                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </label>
                                {bannerUrl && (
                                    <button 
                                        onClick={() => confirmRemoval('Banner', () => setBannerUrl(null))}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    >
                                        <Trash2 className="w-3 h-3 text-white" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {cropImage && (
                        <div
                            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto"
                            onClick={(e) => {
                                if (e.target === e.currentTarget && !cropSaving) setCropImage(null);
                            }}
                        >
                            <div className="bg-[#1A1A1B] border border-white/10 rounded-3xl p-4 sm:p-6 md:p-8 max-w-xl w-full my-auto flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)]">
                                <div className="flex justify-between items-center shrink-0 mb-3 sm:mb-4">
                                    <div>
                                        <h3 className="text-sm font-black text-white uppercase italic">Ajustar Imagem</h3>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                                            Máx. {LOGO_MAX_MB}MB · JPG, PNG ou WEBP
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setCropImage(null)}
                                        disabled={cropSaving}
                                        className="text-muted-foreground hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="flex-1 min-h-0 overflow-y-auto">
                                    <div className="aspect-square max-h-[55vh] mx-auto bg-black/40 rounded-2xl overflow-hidden border border-white/5 relative flex items-center justify-center">
                                        <img src={cropImage} alt="Prévia do ajuste" className="max-w-full max-h-full" />
                                        <div className="absolute inset-0 border-2 border-primary border-dashed opacity-50 pointer-events-none rounded-full m-4" />
                                        {cropSaving && (
                                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                                <span className="text-[10px] uppercase font-bold text-white tracking-wider">Enviando...</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-3 sm:gap-4 shrink-0 mt-3 sm:mt-4 pb-[env(safe-area-inset-bottom)]">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setCropImage(null)}
                                        disabled={cropSaving}
                                        className="flex-1 uppercase font-bold"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        disabled={cropSaving}
                                        onClick={async () => {
                                            if (cropSaving) return;
                                            const toastId = toast.loading("Finalizando ajuste do logo...");
                                            setCropSaving(true);
                                            try {
                                                const blob = await (await fetch(cropImage)).blob();

                                                // Validação de formato e tamanho ANTES de enviar
                                                const mime = blob.type || 'image/png';
                                                if (!LOGO_ALLOWED_MIME.includes(mime)) {
                                                    toast.error("Formato inválido", {
                                                        id: toastId,
                                                        description: `Envie JPG, PNG ou WEBP. Recebido: ${mime}.`,
                                                    });
                                                    return;
                                                }
                                                if (blob.size > LOGO_MAX_MB * 1024 * 1024) {
                                                    toast.error("Imagem muito grande", {
                                                        id: toastId,
                                                        description: `Máximo permitido: ${LOGO_MAX_MB}MB. Escolha uma imagem menor.`,
                                                    });
                                                    return;
                                                }

                                                const ext = mime.split('/')[1] || 'png';
                                                const fileToUpload = new File([blob], `logo_${Date.now()}.${ext}`, { type: mime });
                                                const url = await uploadFile(fileToUpload, 'media', 'branding');

                                                if (url) {
                                                    setLogoUrl(url);
                                                    setCropImage(null);
                                                    toast.success("Logo aplicado com sucesso!", { id: toastId });

                                                    const { data: { user } } = await supabaseExternal.auth.getUser();
                                                    if (user) {
                                                        await supabaseExternal
                                                            .from('store_profiles')
                                                            .update({ logo_url: url, updated_at: new Date().toISOString() })
                                                            .eq('user_id', user.id);

                                                        const cached = localStorage.getItem(`fixxer_profile_${user.email}`);
                                                        if (cached) {
                                                            const parsed = JSON.parse(cached);
                                                            parsed.logoUrl = url;
                                                            localStorage.setItem(`fixxer_profile_${user.email}`, JSON.stringify(parsed));
                                                        }
                                                    }
                                                } else {
                                                    toast.error("Falha no upload do logo", {
                                                        id: toastId,
                                                        description: "Verifique sua conexão e permissões e tente novamente. O modal permanece aberto.",
                                                    });
                                                    setFailedUploads(prev => [...prev, fileToUpload]);
                                                }
                                            } catch (err: any) {
                                                console.error("Erro ao salvar logo ajustado:", err);
                                                toast.error("Erro ao processar imagem", {
                                                    id: toastId,
                                                    description: err?.message || "Tente novamente em instantes.",
                                                });
                                            } finally {
                                                setCropSaving(false);
                                            }
                                        }}
                                        className="flex-1 bg-primary text-black uppercase font-black disabled:opacity-70"
                                    >
                                        {cropSaving ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...
                                            </>
                                        ) : (
                                            <>
                                                <Crop className="w-4 h-4 mr-2" /> Salvar Ajuste
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}


                    
                    {uploadProgress.length > 0 && (
                        <div className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/10 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center justify-between mb-1">
                                <div className="text-[10px] font-black uppercase text-primary italic">Status do Upload</div>
                                <div className="text-[8px] font-bold text-muted-foreground uppercase italic">
                                    {uploadProgress.filter(p => p.progress === 100).length} OK / {uploadProgress.filter(p => p.error).length} Erros
                                </div>
                            </div>
                            
                            <div className="max-h-40 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-white/10">
                                {uploadProgress.map((p, i) => (
                                    <div key={i} className="space-y-1 group">
                                        <div className="flex justify-between items-center text-[8px] font-bold uppercase">
                                            <span className="truncate max-w-[60%] text-muted-foreground">{p.fileName}</span>
                                            <div className="flex items-center gap-2">
                                                {p.error ? (
                                                    <span className="text-red-400 flex items-center gap-1">
                                                        Falhou
                                                        <Button 
                                                            size="icon" 
                                                            className="h-4 w-4 bg-primary text-black hover:bg-primary/80 rounded-md"
                                                            onClick={() => retryFailedUpload(p.fileName)}
                                                            title="Reenviar arquivo"
                                                        >
                                                            <Zap className="w-2.5 h-2.5" />
                                                        </Button>
                                                    </span>
                                                ) : (
                                                    <span className={p.progress === 100 ? "text-primary" : "text-muted-foreground"}>{p.progress}%</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="relative h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                            <Progress value={p.progress} className={`h-full transition-all ${p.error ? 'bg-red-500/50' : ''}`} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {uploadProgress.some(p => p.error) && (
                                <Button 
                                    onClick={retryAllFailed}
                                    className="w-full h-8 bg-primary text-black font-black uppercase italic text-[9px] rounded-xl hover:bg-primary/90 mt-2"
                                >
                                    <Zap className="w-3 h-3 mr-2" /> Reenviar Todos os Erros
                                </Button>
                            )}
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest">
                                Galeria de Fotos da Empresa (Arraste para Reordenar)
                            </Label>
                            <div className="flex items-center gap-3">
                                {selectedMedia.length > 0 && (
                                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right duration-300">
                                        <span className="text-[8px] font-black text-primary uppercase italic">{selectedMedia.length} selecionados</span>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={deleteSelectedMedia}
                                            className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg text-[8px] font-black uppercase italic"
                                        >
                                            <Trash className="w-3 h-3 mr-1.5" /> Excluir Lote
                                        </Button>
                                    </div>
                                )}
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={selectedMedia.length === (galleryUrls.length + videoUrls.length) ? () => setSelectedMedia([]) : selectAllMedia}
                                    className="h-7 px-2 text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg text-[8px] font-black uppercase italic"
                                >
                                    <CheckCircle2 className="w-3 h-3 mr-1.5" /> {selectedMedia.length === (galleryUrls.length + videoUrls.length) ? 'Desmarcar' : 'Selecionar Tudo'}
                                </Button>
                                <span className="text-[8px] opacity-50">{galleryUrls.length}/12</span>
                            </div>
                        </div>
                        
                        <DndContext 
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(e) => handleDragEnd(e, 'gallery')}
                        >
                            <div 
                                className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4 rounded-3xl border-2 border-dashed transition-all ${isDraggingOver ? 'border-primary bg-primary/5' : 'border-white/10 bg-black/20'}`}
                                onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                                onDragLeave={() => setIsDraggingOver(false)}
                                onDrop={(e) => handleDrop(e, 'gallery')}
                            >
                                <SortableContext items={galleryUrls} strategy={rectSortingStrategy}>
                                    {galleryUrls.map((url) => (
                                        <SortableItem 
                                            key={url} 
                                            id={url} 
                                            isSelected={selectedMedia.includes(url)}
                                            onToggleSelect={() => toggleMediaSelection(url)}
                                            onRemove={() => confirmRemoval('foto', () => setGalleryUrls(prev => prev.filter(u => u !== url)))} 
                                        />
                                    ))}
                                </SortableContext>
                                
                                {galleryUrls.length < 12 && (
                                    <label className="aspect-square rounded-2xl border border-white/5 bg-white/5 flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-all cursor-pointer group">
                                        <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleFileUpload(e, 'gallery')} />
                                        <PlusCircle className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                        <span className="text-[8px] font-black uppercase text-muted-foreground group-hover:text-primary tracking-tighter">Add Foto</span>
                                    </label>
                                )}
                            </div>
                        </DndContext>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-white/5">
                        <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest flex items-center justify-between">
                            Vídeos da Empresa (Até 3 vídeos)
                            <span className="text-[8px] opacity-50">{videoUrls.length}/3</span>
                        </Label>
                        
                        <DndContext 
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(e) => handleDragEnd(e, 'video')}
                        >
                            <div 
                                className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-3xl border-2 border-dashed border-white/10 bg-black/20"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDrop(e, 'video')}
                            >
                                <SortableContext items={videoUrls} strategy={rectSortingStrategy}>
                                    {videoUrls.map((url) => (
                                        <SortableItem 
                                            key={url} 
                                            id={url} 
                                            isVideo 
                                            isSelected={selectedMedia.includes(url)}
                                            onToggleSelect={() => toggleMediaSelection(url)}
                                            onRemove={() => confirmRemoval('vídeo', () => setVideoUrls(prev => prev.filter(u => u !== url)))} 
                                        />
                                    ))}
                                </SortableContext>
                                
                                {videoUrls.length < 3 && (
                                    <label className="aspect-video sm:aspect-square rounded-2xl border border-white/5 bg-white/5 flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-all cursor-pointer group">
                                        <input type="file" className="hidden" accept="video/mp4,video/quicktime" multiple onChange={(e) => handleFileUpload(e, 'video')} />
                                        <Video className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                        <span className="text-[8px] font-black uppercase text-muted-foreground group-hover:text-primary tracking-tighter">Add Vídeo</span>
                                    </label>
                                )}
                            </div>
                        </DndContext>
                    </div>
                    
                    <div className="space-y-4 pt-6 border-t border-white/5">
                        <Label className="uppercase font-bold text-[10px] text-muted-foreground tracking-widest flex items-center justify-between">
                            Documentos e Catálogos (PDF)
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {documents.map((doc, index) => (
                                <div key={index} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
                                            <Download className="w-5 h-5" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-[10px] font-black text-white uppercase italic truncate max-w-[150px]">{doc.name}</p>
                                            <p className="text-[8px] text-muted-foreground font-bold uppercase">{(doc.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => confirmRemoval('documento', () => setDocuments(prev => prev.filter((_, i) => i !== index)))}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                                <label 
                                    className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 border-dashed hover:border-primary/50 bg-black/20 transition-all cursor-pointer group ${isDraggingOver ? 'border-primary ring-2 ring-primary/20' : 'border-white/10'}`}
                                    onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                                    onDragLeave={() => setIsDraggingOver(false)}
                                    onDrop={(e) => handleDrop(e, 'document')}
                                >
                                    <input type="file" className="hidden" accept="application/pdf" multiple onChange={(e) => handleFileUpload(e, 'document')} />
                                <PlusCircle className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                                <span className="text-[10px] font-black uppercase text-muted-foreground group-hover:text-primary italic">Adicionar PDF</span>
                            </label>
                        </div>
                    </div>

                 </div>

                  <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                        <Star className={`w-4 h-4 ${getRatingColor(rating).replace('drop-shadow-', '')} fill-current`} />
                        <span className="text-xs font-black text-white italic">Reputação Atual: <span className={getRatingColor(rating)}>{rating.toFixed(1)} / 5.0</span></span>
                    </div>

                    <Button 
                        disabled={isSaving || isUploading}
                        onClick={async () => {
                            // 0) Bloqueia salvar enquanto houver upload em andamento
                            if (isUploading) {
                                toast.warning("Aguarde os uploads terminarem antes de salvar.", {
                                    description: `${uploadProgress.length} arquivo(s) em envio.`,
                                });
                                return;
                            }

                            // 1) Validação de campos essenciais
                            const missing: string[] = [];
                            if (!companyName?.trim()) missing.push("Nome da Empresa");
                            if (!cnpj?.trim() || cnpj.replace(/\D/g, "").length !== 14) missing.push("CNPJ válido");
                            if (!responsibleName?.trim()) missing.push("Responsável");
                            if (!emailContact?.trim() || !/^\S+@\S+\.\S+$/.test(emailContact)) missing.push("E-mail de contato válido");
                            if (!whatsapp?.trim() || whatsapp.replace(/\D/g, "").length < 10) missing.push("WhatsApp");
                            if (!cep?.trim() || cep.replace(/\D/g, "").length !== 8) missing.push("CEP");
                            if (!address?.logradouro?.trim()) missing.push("Endereço");
                            if (!address?.numero?.trim()) missing.push("Número");
                            if (!address?.localidade?.trim()) missing.push("Cidade");
                            if (!address?.uf?.trim()) missing.push("Estado");
                            if (!activityBranch?.trim()) missing.push("Ramo de atividade");
                            if (missing.length) {
                                toast.error("Preencha os campos obrigatórios antes de salvar.", {
                                    description: missing.join(" • "),
                                    duration: 8000,
                                });
                                return;
                            }

                            setIsSaving(true);
                            const toastId = toast.loading("Salvando perfil...");
                            try {
                                // 2) Identidade: sessão real ou fallback via email do localStorage
                                const { data: authData } = await supabaseExternal.auth.getUser();
                                let userId = authData?.user?.id as string | undefined;
                                let userEmailLocal = authData?.user?.email as string | undefined;
                                if (!userEmailLocal && typeof window !== 'undefined') {
                                    userEmailLocal = localStorage.getItem('fixxer_user_email') || undefined;
                                }
                                if (!userEmailLocal) {
                                    throw new Error("Sessão expirada. Faça login novamente para salvar o perfil.");
                                }
                                if (!userId) {
                                    const enc = new TextEncoder().encode(`fixxer:${userEmailLocal.toLowerCase()}`);
                                    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', enc));
                                    hash[6] = (hash[6] & 0x0f) | 0x50;
                                    hash[8] = (hash[8] & 0x3f) | 0x80;
                                    const hex = Array.from(hash.slice(0, 16))
                                        .map((b) => b.toString(16).padStart(2, '0')).join('');
                                    userId = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
                                    if (typeof window !== 'undefined') {
                                        localStorage.setItem('fixxer_derived_user_id', userId);
                                    }
                                }

                                const formData = {
                                    user_id: userId,
                                    user_email: userEmailLocal,
                                    company_name: companyName,
                                    social_name: socialName,
                                    cnpj: cnpj,
                                    responsible_name: responsibleName,
                                    email_contact: emailContact,
                                    whatsapp: whatsapp,
                                    phone: phone,
                                    zipcode: cep,
                                    address: address.logradouro,
                                    neighborhood: address.bairro,
                                    city: address.localidade,
                                    state: address.uf,
                                    address_number: address.numero,
                                    address_complement: address.complemento,
                                    activity_branch: activityBranch,
                                    instagram: socialLinks.instagram,
                                    facebook: socialLinks.facebook,
                                    tiktok: socialLinks.tiktok,
                                    site_url: socialLinks.site,
                                    logo_url: logoUrl,
                                    banner_url: bannerUrl,
                                    gallery_urls: galleryUrls,
                                    video_urls: videoUrls,
                                    documents: documents,
                                    updated_at: new Date().toISOString()
                                };

                                // 3) Upsert + retorna a linha atualizada
                                const { data: saved, error } = await supabaseExternal
                                    .from('store_profiles')
                                    .upsert(formData, { onConflict: 'user_id' })
                                    .select('*')
                                    .maybeSingle();

                                if (error) {
                                    console.error('[store_profiles.upsert] erro:', error);
                                    // Extrai campo problemático (ex.: coluna inválida) do detail/message
                                    const raw = `${error.message || ''} ${error.details || ''} ${(error as any).hint || ''}`;
                                    const colMatch = raw.match(/column\s+"?([\w.]+)"?/i)
                                        || raw.match(/"([\w_]+)"\s+of relation/i);
                                    const field = colMatch?.[1];
                                    const parts = [
                                        error.message,
                                        error.details ? `Detalhe: ${error.details}` : null,
                                        (error as any).hint ? `Dica: ${(error as any).hint}` : null,
                                        error.code ? `Código: ${error.code}` : null,
                                        field ? `Campo: ${field}` : null,
                                    ].filter(Boolean).join(" • ");
                                    toast.error("Erro ao salvar perfil no Supabase.", {
                                        id: toastId,
                                        description: parts || 'Falha desconhecida.',
                                        duration: 12000,
                                    });
                                    setIsSaving(false);
                                    return;
                                }

                                // 4) Atualiza estado local com o que o banco realmente gravou
                                if (saved) {
                                    setCompanyName(saved.company_name || "");
                                    setSocialName(saved.social_name || "");
                                    setCnpj(saved.cnpj || "");
                                    setResponsibleName(saved.responsible_name || "");
                                    setEmailContact(saved.email_contact || "");
                                    setWhatsapp(saved.whatsapp || "");
                                    setPhone(saved.phone || "");
                                    setCep(saved.zipcode || "");
                                    setActivityBranch(saved.activity_branch || "");
                                    setLogoUrl(saved.logo_url || null);
                                    setBannerUrl(saved.banner_url || null);
                                    setGalleryUrls(Array.isArray(saved.gallery_urls) ? saved.gallery_urls : []);
                                    setVideoUrls(Array.isArray(saved.video_urls) ? saved.video_urls : []);
                                    setDocuments(Array.isArray(saved.documents) ? saved.documents : []);
                                    setSocialLinks({
                                        instagram: saved.instagram || "",
                                        facebook: saved.facebook || "",
                                        tiktok: saved.tiktok || "",
                                        site: saved.site_url || "",
                                    });
                                    if (saved.id && typeof window !== 'undefined') {
                                        localStorage.setItem('fixxer_lojista_id', saved.id);
                                    }
                                }

                                // 5) Cache local
                                if (typeof window !== 'undefined') {
                                    localStorage.setItem(`fixxer_profile_${userEmailLocal}`, JSON.stringify({
                                        companyName, socialName, cnpj, responsibleName, emailContact,
                                        whatsapp, phone, cep, activityBranch, logoUrl, bannerUrl,
                                        galleryUrls, videoUrls, documents, socialLinks, address
                                    }));
                                }

                                // Recalcula completude usando a mesma regra da sidebar/menu
                                const completeness = evaluateProfileCompleteness('lojista', saved ?? {
                                    company_name: companyName,
                                    cnpj,
                                    responsible_name: responsibleName,
                                    email_contact: emailContact,
                                    whatsapp,
                                    phone,
                                    zipcode: cep,
                                    activity_branch: activityBranch,
                                    logo_url: logoUrl,
                                });
                                setIsProfileComplete(completeness.complete);
                                if (typeof window !== 'undefined') {
                                    window.dispatchEvent(new CustomEvent('fixxer:profile-saved'));
                                }
                                if (completeness.complete) {
                                    toast.success("Perfil completo! Funções liberadas.", {
                                        id: toastId,
                                        description: "Criar Serviço e Avaliações agora estão disponíveis.",
                                        icon: "✅"
                                    });
                                } else {
                                    toast.warning("Perfil salvo, mas ainda incompleto.", {
                                        id: toastId,
                                        description: describeMissing(completeness),
                                        duration: 8000,
                                    });
                                }
                            } catch (err: any) {
                                console.error('[Perfil Lojista] erro ao salvar:', err);
                                const msg = err?.message || 'Erro desconhecido ao salvar.';
                                toast.error(`Erro ao salvar perfil: ${msg}`, { id: toastId, duration: 8000 });
                            } finally {
                                setIsSaving(false);
                            }
                        }}
                        className="w-full md:w-auto px-12 bg-primary text-black font-black uppercase italic tracking-widest hover:bg-primary/90 h-14 rounded-2xl shadow-[0_0_30px_rgba(0,255,135,0.2)] transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {isSaving ? "Salvando..." : isUploading ? "Aguardando uploads..." : "Salvar Todas as Alterações"}
                    </Button>
                  </div>
                  </>
                 ) : null}

                 {activeSettingsTab === 'security' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h4 className="text-xs font-black uppercase italic text-primary flex items-center gap-2">
                            <Lock className="w-3 h-3" /> Segurança da Conta
                        </h4>
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                                <Label className="text-[10px] font-black uppercase italic text-white">Alterar Senha</Label>
                                <div className="flex flex-col gap-4">
                                    <Input type="password" placeholder="Senha Atual" className="bg-black/40 border-white/10 h-10 rounded-xl" />
                                    <Input type="password" placeholder="Nova Senha" className="bg-black/40 border-white/10 h-10 rounded-xl" />
                                    <Button className="w-full bg-white/5 hover:bg-white/10 text-white font-bold uppercase text-[10px] h-10 rounded-xl">Atualizar Senha</Button>
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-2">
                                <Label className="text-[10px] font-black uppercase italic text-red-400">Zona de Perigo</Label>
                                <Button variant="destructive" className="w-full font-bold uppercase text-[10px] h-10 rounded-xl">Excluir Minha Conta</Button>
                            </div>
                        </div>
                    </div>
                 )}

                 {activeSettingsTab === 'notifications' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h4 className="text-xs font-black uppercase italic text-primary flex items-center gap-2">
                            <Bell className="w-3 h-3" /> Preferências de Notificação
                        </h4>
                        <div className="space-y-4">
                            {[
                                { id: 'status_change', label: 'Mudanças de Status de O.S.' },
                                { id: 'new_proposal', label: 'Novas Propostas Recebidas' },
                                { id: 'review_received', label: 'Novas Avaliações' }
                            ].map((setting) => (
                                <div key={setting.id} className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5">
                                    <span className="text-[10px] font-black uppercase italic text-white">{setting.label}</span>
                                    <button 
                                        onClick={() => setNotificationSettings((prev: any) => ({ ...prev, [setting.id]: !prev[setting.id as keyof typeof notificationSettings] }))}
                                        className={`w-10 h-5 rounded-full transition-all relative ${notificationSettings[setting.id as keyof typeof notificationSettings] ? 'bg-primary' : 'bg-white/10'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${notificationSettings[setting.id as keyof typeof notificationSettings] ? 'right-1' : 'left-1'}`} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                 )}
            </div>

            {/* Modal de Favoritos */}
            {showFavoritesModal && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-[#1A1A1B] border border-white/10 rounded-3xl p-6 md:p-8 max-w-2xl w-full space-y-6 max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Heart className="w-6 h-6 text-red-500 fill-red-500" />
                                <h3 className="text-sm font-black text-white uppercase italic">Meus Favoritos</h3>
                            </div>
                            <button onClick={() => setShowFavoritesModal(false)} className="text-muted-foreground hover:text-white p-2">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                            <select 
                                value={favoriteCategory}
                                onChange={(e) => setFavoriteCategory(e.target.value)}
                                className="w-full h-12 bg-black/40 border-white/10 rounded-xl pl-10 pr-4 text-xs font-black uppercase italic text-white appearance-none cursor-pointer outline-none focus:border-primary/50"
                            >
                                <option value="todas">Todas as Categorias</option>
                                {branches.map((b: string) => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex-1 overflow-y-auto scrollbar-none pr-2 space-y-4">
                            {loadingFavorites ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <Activity className="w-8 h-8 text-primary animate-spin" />
                                    <span className="text-[10px] font-black text-primary uppercase italic">Carregando favoritos...</span>
                                </div>
                            ) : filteredFavorites.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {filteredFavorites.map((fav: any) => (
                                        <div key={fav.id} className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-primary/30 transition-all group">
                                            <div className="flex gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                                                    {fav.store_profiles?.logo_url ? (
                                                        <img src={fav.store_profiles.logo_url} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Store className="w-6 h-6 text-primary" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-[11px] font-black text-white uppercase italic">{fav.store_profiles?.name || 'Loja sem nome'}</div>
                                                    <div className="text-[8px] text-primary font-black uppercase italic">{fav.store_profiles?.activity_branch || 'Sem categoria'}</div>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                                                        <span className="text-[10px] font-black text-amber-500 italic">4.9</span>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={async () => {
                                                        const { error } = await supabaseExternal.from('user_favorites').delete().eq('id', fav.id);
                                                        if (error) toast.error("Erro ao remover");
                                                        else toast.success("Removido dos favoritos");
                                                    }}
                                                    className="p-2 text-red-500/50 hover:text-red-500 transition-colors"
                                                >
                                                    <Heart className="w-4 h-4 fill-red-500" />
                                                </button>
                                            </div>
                                            <button 
                                                onClick={() => navigate({ to: `/lojista/${fav.store_profiles?.lojista_id}` as any })}
                                                className="w-full mt-3 py-2 rounded-xl bg-white/5 hover:bg-primary/20 text-white hover:text-primary text-[9px] font-black uppercase italic transition-all border border-transparent hover:border-primary/20"
                                            >
                                                Ver Perfil Completo
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold text-center py-8">Nenhum perfil favorito encontrado nesta categoria.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SortableItem({ id, isVideo, onRemove, isSelected, onToggleSelect }: { id: string; isVideo?: boolean; onRemove: () => void; isSelected?: boolean; onToggleSelect?: () => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
        opacity: isDragging ? 0.5 : 1
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            onClick={onToggleSelect}
            onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    onToggleSelect?.();
                }
            }}
            tabIndex={0}
            className={`relative rounded-2xl overflow-hidden border transition-all cursor-pointer bg-black/40 group touch-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:z-20 ${isSelected ? 'border-primary ring-2 ring-primary ring-inset' : 'border-white/10'} ${isVideo ? 'aspect-video sm:aspect-square' : 'aspect-square'}`}
        >
            <div {...attributes} {...listeners} className="w-full h-full cursor-grab active:cursor-grabbing" onClick={(e) => e.stopPropagation()}>
                {isVideo ? (
                    <video src={id} className="w-full h-full object-cover" />
                ) : (
                    <img src={id} alt="Gallery" className="w-full h-full object-cover" />
                )}
            </div>
            
            <div className={`absolute top-2 left-2 w-5 h-5 rounded-full border-2 border-white/20 transition-all flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'bg-black/40'}`}>
                {isSelected && <Check className="w-3 h-3 text-black" />}
            </div>

            <button 
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
                <Trash2 className="w-3 h-3 text-white" />
            </button>
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
    );
}


function MetricCard({ label, value, icon, color, subValue }: any) {
    return (
        <div className="bg-[#1A1A1B] border border-white/10 p-4 md:p-6 rounded-2xl md:rounded-3xl space-y-1 md:space-y-2 relative overflow-hidden group hover:border-primary/30 transition-all flex flex-col justify-between">
            <div>
                <div className={`${color} opacity-80 mb-1 md:mb-2 group-hover:scale-110 transition-transform`}>{icon}</div>
                <div className="text-[9px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</div>
                <div className="text-lg md:text-2xl font-black text-white italic truncate">{value}</div>
            </div>
            {subValue}
            <div className={`absolute top-0 right-0 w-12 h-12 ${color} opacity-[0.03] -mr-6 -mt-6 rounded-full`} />
        </div>
    )
}
