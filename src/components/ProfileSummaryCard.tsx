/**
 * Card resumo do perfil logado (avatar, papel, cidade, reputação, plano, selo).
 *
 * Renderização responsiva:
 *  - Desktop (lg+) e Tablet (md): fica FIXO como coluna lateral esquerda,
 *    sticky ao topo, sem afetar o grid dos dashboards.
 *  - Mobile: renderiza INLINE (dentro do fluxo do dashboard), tipicamente
 *    acima da barra de ações (PanelActions).
 *
 * Usa dados do próprio usuário via supabaseExternal. Se algum campo estiver
 * ausente, o card degrada graciosamente (sem quebrar layout).
 */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, ShieldCheck, Star, User as UserIcon } from "lucide-react";
import { NotificationsCenter } from "@/components/NotificationsCenter";
import { ReviewsModal, type Review } from "@/components/ReviewsModal";
import { PlanBadge } from "@/components/PlanBadge";
import { GoldMedalBadge } from "@/components/GoldMedalBadge";
import { AvailabilityBadge } from "@/components/AvailabilityBadge";
import type { PanelRole } from "@/components/PanelActions";
import { getCategoryTheme } from "@/lib/category-colors";
import { useProfile } from "@/hooks/use-profile";
import { Skeleton } from "@/components/ui/skeleton";

type ProfileLite = {
  id: string;
  display_name?: string | null;
  company_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  logo_url?: string | null;
  city?: string | null;
  state?: string | null;
  plan_id?: string | null;
  plan_renews_at?: string | null;
  karma_score?: number;
  is_verified?: boolean;
};

const ROLE_LABEL: Record<PanelRole, string> = {
  lojista: "LOJISTA",
  prestador: "PRESTADOR",
  parceiro: "PARCEIRO",
  cliente: "CLIENTE",
};

const ROLE_ICON: Record<PanelRole, string> = {
  lojista: "🏪",
  prestador: "🛠️",
  parceiro: "🚚",
  cliente: "👤",
};

function displayNameOf(p?: ProfileLite | null): string {
  if (!p) return "Meu perfil";
  return (
    p.display_name?.trim() ||
    p.company_name?.trim() ||
    p.full_name?.trim() ||
    "Meu perfil"
  );
}

function avatarOf(p?: ProfileLite | null): string | null {
  return (p?.avatar_url || p?.logo_url) ?? null;
}

export function ProfileSummaryCard({
  role,
  variant = "auto",
  className = "",
}: {
  role: PanelRole;
  /**
   *  - "auto": mobile inline (block em <md) e escondido em md+; a coluna fixa
   *    deve ser renderizada separadamente com variant="sidebar".
   *  - "inline": sempre inline (útil se quiser controlar a visibilidade).
   *  - "sidebar": renderização como coluna lateral fixa (md+).
   */
  variant?: "auto" | "inline" | "sidebar";
  className?: string;
}) {
  const { data: resolved, isLoading: loading } = useProfile();
  const [showReviewsModal, setShowReviewsModal] = useState(false);

  const profile = resolved ? {
    id: resolved.identity.id,
    display_name: resolved.identity.displayName,
    full_name: resolved.identity.fullName,
    email: resolved.identity.email,
    avatar_url: resolved.identity.avatarUrl,
    company_name: (resolved.specializations as any)?.store?.company_name || 
                  (resolved.specializations as any)?.supplier?.company_name || 
                  resolved.identity.displayName,
    logo_url: (resolved.specializations as any)?.store?.logo_url || 
              (resolved.specializations as any)?.supplier?.logo_url || 
              (resolved.specializations as any)?.provider?.avatar_url || 
              resolved.identity.avatarUrl,
    city: (resolved.specializations as any)?.store?.city || 
          (resolved.specializations as any)?.provider?.city || 
          (resolved.specializations as any)?.supplier?.city || null,
    state: (resolved.specializations as any)?.store?.state || 
           (resolved.specializations as any)?.provider?.state || 
           (resolved.specializations as any)?.supplier?.state || null,
    plan_id: resolved.identity.planId,
    plan_renews_at: null, // Pode ser adicionado à CanonicalIdentity se necessário
    karma_score: resolved.identity.karmaScore,
    is_verified: resolved.identity.isVerified
  } : null;

  const allReviews: Review[] = []; // Placeholder para reviews se necessário


  const name = profile?.display_name || profile?.company_name || profile?.full_name || (loading ? "Carregando..." : "Usuário");
  const avatar = profile?.avatar_url || profile?.logo_url || null;
  const planId = (profile?.plan_id || "free").toLowerCase();
  const isGold = planId === "pro" || planId === "premium";
  const city = profile?.city?.trim() || "";
  const state = profile?.state?.trim() || "";
  const location = [city, state].filter(Boolean).join(" / ");

  const profileHref = profile?.id ? `/perfil/${profile.id}` : "/configuracoes";
  // Força o reload completo ao clicar na reputação para garantir que o useEffect da página de perfil dispare sem problemas de estado do router
  const reputationUrl = profile?.id ? `${profileHref}?focus=reviews&tab=avaliacoes&t=${Date.now()}` : "/configuracoes";

  const wrapperVariantClass =
    variant === "sidebar"
      ? "hidden lg:block fixed left-4 top-24 w-64 z-[70] transition-all duration-300"
      : variant === "inline"
        ? ""
        : "lg:hidden mb-4";



  const theme = getCategoryTheme(role as any);

  return (
    <aside
      aria-label="Resumo do meu perfil"
      className={`${wrapperVariantClass} ${className}`.trim()}
    >
      <div className="relative isolate group">
        <div className="absolute top-4 right-4 z-[40]">
          <NotificationsCenter />
        </div>
        
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-4 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.6)]">
          <Link
            to={profileHref}
            className="flex items-start gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-full border-2 border-primary/50 overflow-hidden bg-white/5 flex items-center justify-center">
                {avatar ? (
                  <img
                    key={avatar}
                    src={avatar}
                    alt={name}
                    loading="eager"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error("[ProfileSummaryCard] Erro ao carregar imagem:", avatar);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <UserIcon className="w-7 h-7 text-white/40" aria-hidden="true" />
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-black uppercase italic tracking-tighter text-white truncate max-w-[200px]" id="user-display-name-card">
                {loading ? <Skeleton className="h-4 w-32 bg-white/10" /> : name}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/15 border border-primary/30 text-[9px] font-black uppercase tracking-widest text-primary">
                  <span aria-hidden="true">{ROLE_ICON[role]}</span>
                  {ROLE_LABEL[role]}
                </div>
                <AvailabilityBadge userId={profile?.id ?? null} className="!border-none !bg-transparent !px-0" />
              </div>
              
              {loading ? (
                <Skeleton className="mt-1 h-3 w-40 bg-white/10" />
              ) : profile?.email ? (
                <div className="mt-1 flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10 w-fit">
                  <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                  <span className="text-[9px] font-medium text-white/50 lowercase tracking-tight truncate max-w-[160px]">
                    {profile.email}
                  </span>
                </div>
              ) : (
                <div className="mt-1 px-2 py-0.5 rounded bg-white/5 border border-dashed border-white/10 w-fit">
                   <span className="text-[9px] font-medium text-white/20 lowercase tracking-tight">e-mail não disponível</span>
                </div>
              )}

              {location && (
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-white/60 font-bold uppercase tracking-widest">
                  <MapPin className="w-3 h-3 text-primary" aria-hidden="true" />
                  <span className="truncate">{location}</span>
                </div>
              )}
            </div>
          </Link>

          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowReviewsModal(true)}
                className="rounded-lg border border-white/10 bg-black/30 p-2 hover:border-emerald-400/40 hover:bg-emerald-400/5 transition-all group/rating min-h-[52px] flex flex-col justify-center text-left w-full"
              >
                <div className="text-[8px] font-black text-white/50 uppercase tracking-widest group-hover/rating:text-emerald-400/70 transition-colors">
                  Reputação
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-xs font-black text-white">
                  <Star className="w-3 h-3 text-emerald-400 fill-current" aria-hidden="true" />
                  <span>{profile?.karma_score && profile.karma_score > 0 ? (profile.karma_score / 10).toFixed(1) : "s/av."} / 5.0</span>
                </div>
              </button>

              <div className="rounded-lg border border-white/10 bg-black/30 p-2 flex flex-col min-h-[52px] justify-center">
                <div className="text-[8px] font-black text-white/50 uppercase tracking-widest">
                  Plano
                </div>
                <div className="mt-0.5">
                  <PlanBadge
                    planId={planId}
                    renewsAt={profile?.plan_renews_at ?? null}
                    className="!px-2 !py-0.5 !text-[9px]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {profile?.is_verified ? (
                <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00FF88]/10 border border-[#00FF88]/20 h-[36px]">
                  <ShieldCheck className="w-3 h-3 text-[#00FF88]" aria-hidden="true" />
                  <span className="text-[8px] font-black text-[#00FF88] uppercase italic tracking-widest">
                    Verificado
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 opacity-50 h-[36px]">
                  <ShieldCheck className="w-3 h-3 text-white/40" aria-hidden="true" />
                  <span className="text-[8px] font-black text-white/40 uppercase italic tracking-widest">
                    Não Verificado
                  </span>
                </div>
              )}

              {isGold ? (
                <div className="flex justify-center items-center h-[36px]">
                  <GoldMedalBadge />
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 opacity-50 h-[36px]">
                  <Star className="w-3 h-3 text-white/40" aria-hidden="true" />
                  <span className="text-[8px] font-black text-white/40 uppercase italic tracking-widest">
                    Sem Selo
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal de Avaliações Independente */}
        <ReviewsModal 
          isOpen={showReviewsModal}
          onClose={() => setShowReviewsModal(false)}
          reviews={allReviews}
          displayName={name}
        />
      </div>
    </aside>
  );
}

export default ProfileSummaryCard;