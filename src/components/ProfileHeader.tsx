import { Star, Hammer, Truck, Home, Search, ShieldCheck, Clock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PanelActions, type PanelRole } from "@/components/PanelActions";
import { ProfileSummaryCard } from "@/components/ProfileSummaryCard";
import { ReactNode } from "react";

interface ProfileHeaderProps {
  role: PanelRole;
  activeTab?: string;
  onTabChange?: (tab: any) => void;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  hideSidebarCard?: boolean;
}

export function ProfileHeader({
  role,
  activeTab,
  onTabChange,
  title,
  subtitle,
  icon,
  actions,
  hideSidebarCard = false
}: ProfileHeaderProps) {
  
  const getRoleInfo = () => {
    switch (role) {
      case 'prestador':
        return {
          defaultIcon: <Hammer className="w-6 h-6" />,
          defaultTitle: <>MEU <span className="text-primary">PAINEL</span></>,
          defaultSubtitle: "Controle de Agendas, O.S. e Reputação",
          accentColor: "primary"
        };
      case 'parceiro':
        return {
          defaultIcon: <Truck className="w-6 h-6" />,
          defaultTitle: <>HUB <span className="text-[#00FF87]">PARCEIRO</span></>,
          defaultSubtitle: "Gestão de Vitrine e Fornecimento B2B",
          accentColor: "[#00FF87]"
        };
      case 'cliente':
        return {
          defaultIcon: <Home className="w-6 h-6" />,
          defaultTitle: <>PORTAL DO <span className="text-[#00FF87]">CLIENTE</span></>,
          defaultSubtitle: "Acompanhe sua reforma e contrate profissionais",
          accentColor: "[#00FF87]"
        };
      case 'lojista':
        return {
          defaultIcon: <Hammer className="w-5 h-5" />,
          defaultTitle: <>MEU <span className="text-primary">PAINEL</span></>,
          defaultSubtitle: "Controle de Agendas, O.S. e Reputação",
          accentColor: "primary"
        };
      default:
        return {
          defaultIcon: <Hammer className="w-6 h-6" />,
          defaultTitle: "PAINEL",
          defaultSubtitle: "Gestão do Sistema",
          accentColor: "primary"
        };
    }
  };

  const info = getRoleInfo();
  const displayTitle = title || info.defaultTitle;
  const displaySubtitle = subtitle || info.defaultSubtitle;
  const displayIcon = icon || info.defaultIcon;

  return (
    <div className="relative isolate">
      {/* 
          O ProfileSummaryCard é renderizado como sidebar fixa em lg+.
          A variante "auto" interna do ProfileSummaryCard lida com a visibilidade mobile (inline em <lg).
      */}
      {!hideSidebarCard && (
        <>
          <ProfileSummaryCard role={role} variant="auto" />
          <ProfileSummaryCard role={role} variant="sidebar" />
        </>
      )}


      
      
      
      

      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0`}>
            {displayIcon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter truncate max-w-[200px] md:max-w-none">
                {displayTitle}
              </h1>
            </div>
            {displaySubtitle && (
              <p className="text-[9px] md:text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-relaxed">
                {displaySubtitle}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center gap-4 ml-auto w-full lg:w-auto">
          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto no-scrollbar py-2">
            <div className="shrink-0">
              <PanelActions role={role} />
            </div>
            {actions && (
              <div className="flex items-center gap-2 border-l border-white/10 pl-3 shrink-0">
                {actions}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 
          Removido o ProfileSummaryCard redundante no mobile que aparecia abaixo do header.
          A barra de botões (PanelActions) já está no topo dentro do header acima.
      */}
    </div>
  );
}
