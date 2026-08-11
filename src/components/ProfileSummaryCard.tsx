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
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, ShieldCheck, Star, User as UserIcon } from "lucide-react";
import { NotificationsCenter } from "@/components/NotificationsCenter";
import { ReviewsModal, type Review } from "@/components/ReviewsModal";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { PlanBadge } from "@/components/PlanBadge";
import { GoldMedalBadge } from "@/components/GoldMedalBadge";
import type { PanelRole } from "@/components/PanelActions";
import { getCategoryTheme } from "@/lib/category-colors";

type ProfileLite = {
  id: string;
  display_name?: string | null;
  company_name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  logo_url?: string | null;
  city?: string | null;
  state?: string | null;
  plan_id?: string | null;
  plan_renews_at?: string | null;
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
  const [profile, setProfile] = useState<ProfileLite | null>(null);
  const [rating, setRating] = useState<{ avg: number; count: number } | null>(null);
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: sessData } = await supabaseExternal.auth.getSession();
        const uid = sessData.session?.user?.id;
        if (!uid) {
          console.warn("[ProfileSummaryCard] Sem UID na sessão");
          return;
        }

        const { resolveIdentity } = await import("@/lib/identity/identity-service");
        // Força refresh para garantir que não estamos pegando cache sujo
        const resolved = await resolveIdentity(uid, { refresh: true });
        
        console.log("[ProfileSummaryCard] Identidade resolvida:", {
          uid,
          displayName: resolved?.identity?.displayName,
          avatarUrl: resolved?.identity?.avatarUrl,
          specializations: resolved?.specializations
        });

        if (!cancelled && resolved) {
          const prof: ProfileLite = {
            id: resolved.identity.id,
            display_name: resolved.identity.displayName,
            full_name: resolved.identity.fullName,
            avatar_url: resolved.identity.avatarUrl,
            company_name: (resolved.specializations as any)?.store?.company_name || (resolved.specializations as any)?.supplier?.company_name || resolved.identity.displayName,
            logo_url: (resolved.specializations as any)?.store?.logo_url || (resolved.specializations as any)?.supplier?.logo_url || resolved.identity.avatarUrl,
            city: (resolved.specializations as any)?.store?.city || (resolved.specializations as any)?.provider?.city || (resolved.specializations as any)?.supplier?.city || null,
            state: (resolved.specializations as any)?.store?.state || (resolved.specializations as any)?.provider?.state || (resolved.specializations as any)?.supplier?.state || null,
          };
          setProfile(prof);
        }
      } catch (err) {
        console.error("[ProfileSummaryCard] Erro crítico:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);


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
      ? "hidden md:block fixed left-4 top-20 w-64 z-30"
      : variant === "inline"
        ? ""
        : "md:hidden";

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
              <div className="text-sm font-black uppercase italic tracking-tighter text-white truncate">
                {loading ? "Carregando…" : name}
              </div>
              <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/15 border border-primary/30 text-[9px] font-black uppercase tracking-widest text-primary">
                <span aria-hidden="true">{ROLE_ICON[role]}</span>
                {ROLE_LABEL[role]}
              </div>
              {location && (
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-white/60 font-bold uppercase tracking-widest">
                  <MapPin className="w-3 h-3 text-primary" aria-hidden="true" />
                  <span className="truncate">{location}</span>
                </div>
              )}
            </div>
          </Link>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setShowReviewsModal(true);
              }}
              className="rounded-lg border border-white/10 bg-black/30 p-2 hover:border-emerald-400/40 hover:bg-emerald-400/5 transition-all group/rating min-h-[52px] flex flex-col justify-center text-left w-full"
            >
              <div className="text-[8px] font-black text-white/50 uppercase tracking-widest group-hover/rating:text-emerald-400/70 transition-colors">
                Reputação
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-xs font-black text-white">
                <Star className="w-3 h-3 text-emerald-400 fill-current" aria-hidden="true" />
                <span>{rating ? rating.avg.toFixed(1) : "0.0"} / 5.0</span>
                {rating ? (
                  <span className="text-[9px] text-white/50 font-bold">
                    ({rating.count})
                  </span>
                ) : (
                  <span className="text-[9px] text-white/40 font-bold normal-case tracking-normal">
                    s/ avaliações
                  </span>
                )}
              </div>
            </button>

            <div
              className="rounded-lg border border-white/10 bg-black/30 p-2 flex flex-col min-h-[52px] justify-center"
            >
              <div className="text-[8px] font-black text-white/50 uppercase tracking-widest group-hover/plan:text-primary/70 transition-colors">
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

          {isGold ? (
            <div className="mt-3 flex justify-center">
              <GoldMedalBadge />
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 opacity-50">
              <ShieldCheck className="w-3 h-3 text-white/40" aria-hidden="true" />
              <span className="text-[8px] font-black text-white/40 uppercase italic tracking-widest">
                Sem Selo Ouro
              </span>
            </div>
          )}
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