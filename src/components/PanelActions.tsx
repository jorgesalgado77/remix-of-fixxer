import { Link } from "@tanstack/react-router";
import {
  Calendar,
  Megaphone,
  Settings,
  Zap,
  PowerOff,
  Loader2,
  AlertTriangle,
  UserCircle2,
  Heart,
  PlusCircle,
  QrCode,
  BookOpen,
  Library,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type PanelRole = "lojista" | "prestador" | "parceiro" | "cliente";

/**
 * Barra de ações padrão dos painéis, adaptada por categoria do perfil logado.
 *
 * - Lojista: Agenda • Meus Anúncios • Meu Perfil Público • Configurações • Disponibilidade
 * - Prestador: Agenda • Meus Anúncios • Meu Perfil Público • Configurações • Disponibilidade
 * - Parceiro Fornecedor: Agenda • Meus Anúncios • Meu Perfil Público • Configurações • Disponibilidade
 * - Cliente Final: Agenda • Publicar Necessidade • Favoritos • Configurações
 *
 * Todos os controles são navegáveis por teclado (Tab/Enter/Espaço) e têm rótulos ARIA.
 */
export function PanelActions({ role = "prestador" }: { role?: PanelRole }) {
  // Fonte única de identidade: sessão real do Supabase (via current-user).
  const [myProfileHref, setMyProfileHref] = useState<string>(profileHrefFor(role));
  const [uidResolved, setUidResolved] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getCurrentUserId } = await import("@/lib/current-user");
        const uid = await getCurrentUserId();
        if (!cancelled && uid) {
          setMyProfileHref(`/perfil/${uid}`);
          setUidResolved(true);
        }
      } catch { /* mantém fallback por role */ }
    })();
    return () => { cancelled = true; };
  }, [role]);

  const handleProfileClick = async (e: React.MouseEvent) => {
    if (uidResolved) return;
    e.preventDefault();
    try {
      const { getCurrentUserId } = await import("@/lib/current-user");
      const uid = await getCurrentUserId();
      if (uid) window.location.assign(`/perfil/${uid}`);
      else toast.error("Não foi possível identificar seu usuário. Faça login novamente.");
    } catch {
      toast.error("Falha ao abrir seu perfil público. Tente novamente.");
    }
  };


  const showAnuncios = role !== "cliente";
  const showPerfilPublico = role !== "cliente";
  const showAvailability = role !== "cliente";
  const showPublicar = role === "cliente";
  const showFavoritos = role === "cliente";

  return (
    <div
      className="flex flex-wrap items-center gap-3 md:gap-4 p-1.5 md:p-2 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm"
      role="toolbar"
      aria-label={`Ações rápidas do painel ${labelFor(role)}`}
    >
      <IconLink to="/agenda" label="Agenda" tip={agendaTip(role)}>
        <Calendar className="w-5 h-5" aria-hidden="true" />
      </IconLink>

      {showAnuncios && (
        <IconLink to="/meus-anuncios" label="Meus Anúncios" tip={anunciosTip(role)}>
          <Megaphone className="w-5 h-5" aria-hidden="true" />
        </IconLink>
      )}

      {showPublicar && (
        <IconLink
          to="/cliente"
          label="Publicar Necessidade"
          tip="Publicar uma nova necessidade e receber propostas"
        >
          <PlusCircle className="w-5 h-5" aria-hidden="true" />
        </IconLink>
      )}

      {showFavoritos && (
        <div className="flex items-center gap-3">
          <IconLink to="/favoritos" label="Favoritos" tip="Ver meus profissionais e fornecedores favoritos">
            <Heart className="w-5 h-5" aria-hidden="true" />
          </IconLink>
          <IconLink to="/biblioteca" label="Minha Biblioteca" tip="Ver meus produtos digitais adquiridos">
            <Library className="w-5 h-5 text-[#00FF87]" aria-hidden="true" />
          </IconLink>
        </div>
      )}

      {showPerfilPublico && (
        <IconLink
          to={myProfileHref}
          label="Meu Perfil Público"
          tip="Ver como meu perfil público aparece para outros usuários"
          onClick={handleProfileClick}
        >
          <UserCircle2 className="w-5 h-5" aria-hidden="true" />
        </IconLink>
      )}

      <IconLink
        to="/configuracoes"
        label="Configurações"
        tip="Configurações do sistema — preferências, notificações e segurança"
      >
        <Settings className="w-5 h-5" aria-hidden="true" />
      </IconLink>

      {role === "prestador" && (
        <IconLink 
          to="/infoprodutos" 
          label="Creator Studio" 
          tip="Gerenciar meus Info Produtos — e-books, aulas e cursos digitais"
        >
          <BookOpen className="w-5 h-5 text-primary" aria-hidden="true" />
        </IconLink>
      )}

      {role !== "cliente" && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("[PanelActions] Disparando fixxer:open-pix-modal");
            window.dispatchEvent(new CustomEvent('fixxer:open-pix-modal', { 
              bubbles: true, 
              composed: true 
            }));
          }}
          title="Receber via PIX — Gere QR Codes de cobrança para seus clientes e acompanhe seus recebimentos em tempo real"
          aria-label="Receber via PIX — Gerar QR Code para recebimento instantâneo"
          className="flex items-center justify-center h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-all active:scale-95 z-20"
        >
          <QrCode className="w-5 h-5" aria-hidden="true" />
          <span className="sr-only">Receber via PIX</span>
        </button>
      )}

      {showAvailability && <AvailabilityToggle role={role} />}
    </div>
  );
}

function profileHrefFor(role: PanelRole): string {
  if (typeof window !== 'undefined') {
    const isMasterBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
    if (isMasterBypass) {
      const cat = localStorage.getItem('fixxer:last-category');
      const uid = cat === 'admin' ? '6ba65048-803f-44f6-88d2-24d04fee1a0f' : 'b3378b88-5c46-4e50-9c2e-4b7264a4d6e9';
      return `/perfil/${uid}`;
    }
  }
  if (role === "cliente") return "/configuracoes";
  return `/perfil/${role}`;
}

function labelFor(role: PanelRole): string {
  return role === "lojista"
    ? "Lojista"
    : role === "parceiro"
      ? "Parceiro Fornecedor"
      : role === "cliente"
        ? "Cliente Final"
        : "Prestador";
}

function agendaTip(role: PanelRole): string {
  if (role === "cliente") return "Minha agenda de contratações e visitas";
  if (role === "lojista") return "Agenda da loja — pedidos e retiradas";
  if (role === "parceiro") return "Agenda de entregas e fornecimentos";
  return "Abrir minha agenda de compromissos";
}

function anunciosTip(role: PanelRole): string {
  if (role === "lojista") return "Gerenciar anúncios e vitrine da loja";
  if (role === "parceiro") return "Gerenciar catálogos e ofertas B2B";
  return "Gerenciar meus anúncios publicados";
}

function IconLink({
  to,
  label,
  tip,
  children,
  onClick,
}: {
  to: string;
  label: string;
  tip: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <Link
      to={to}
      title={tip}
      aria-label={label}
      onClick={onClick}
      className="flex items-center justify-center h-11 w-11 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-all"
    >
      {children}
    </Link>
  );
}

function AvailabilityToggle({ role }: { role: PanelRole }) {
  const [available, setAvailable] = useState<boolean>(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  useEffect(() => {
    let cancelled = false;
    import("@/lib/availability")
      .then(({ getMyAvailability }) => {
        getMyAvailability()
          .then((v) => {
            if (!cancelled) setAvailable(v);
          })
          .finally(() => {
            if (!cancelled) setLoadingInitial(false);
          });
      })
      .catch(() => {
        if (!cancelled) setLoadingInitial(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const performToggle = async () => {
    if (busy) return;
    const next = !available;
    setBusy(true);
    setError(null);
    try {
      const { setMyAvailability } = await import("@/lib/availability");
      await setMyAvailability(next);
      setAvailable(next);
      try {
        window.dispatchEvent(
          new CustomEvent("fixxer:availability-changed", { detail: { available: next } })
        );
      } catch {
        /* ignore */
      }
      if (next) {
        toast.success("Você está DISPONÍVEL na plataforma.", {
          description: availableOnDescription(role),
        });
      } else {
        toast("Você está INDISPONÍVEL.", {
          description: availableOffDescription(role),
        });
      }
      setConfirmOpen(false);
    } catch (e: any) {
      const msg =
        e?.message ||
        "Falha de rede ao salvar sua disponibilidade. Verifique sua conexão e tente novamente.";
      setError(msg);
      toast.error("Não foi possível salvar sua disponibilidade.", { description: msg });
    } finally {
      setBusy(false);
    }
  };

  const activeStyle =
    "bg-emerald-500 border-emerald-400 text-white hover:bg-emerald-600 shadow-[0_0_18px_rgba(16,185,129,0.45)]";
  const pausedStyle =
    "bg-red-600 border-red-500 text-white hover:bg-red-700 shadow-[0_0_18px_rgba(239,68,68,0.45)]";

  const nextLabel = available ? "Indisponível" : "Disponível";
  const statusLabel = loadingInitial ? "Carregando…" : available ? "Disponível" : "Indisponível";

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={available}
        aria-busy={busy || loadingInitial}
        disabled={loadingInitial}
        onClick={() => {
          setError(null);
          setConfirmOpen(true);
        }}
        title={
          loadingInitial
            ? "Carregando disponibilidade…"
            : available
              ? `Disponibilidade ATIVA (${statusLabel}) — clique para pausar`
              : `Disponibilidade PAUSADA (${statusLabel}) — clique para reativar`
        }
        aria-label={`Alternar disponibilidade. Atualmente ${available ? "disponível" : "indisponível"}. Clique para definir como ${nextLabel.toLowerCase()}.`}
        className={`flex items-center justify-center h-11 w-11 rounded-xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-60 disabled:cursor-not-allowed ${
          available ? activeStyle : pausedStyle
        }`}
      >
        {loadingInitial ? (
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
        ) : available ? (
          <Zap className="w-5 h-5" aria-hidden="true" />
        ) : (
          <PowerOff className="w-5 h-5" aria-hidden="true" />
        )}
        <span role="status" aria-live="polite" className="sr-only">
          {busy
            ? "Salvando alteração de disponibilidade…"
            : `Status atual: ${available ? "disponível" : "indisponível"}.`}
        </span>
      </button>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!busy) setConfirmOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {available
                ? confirmPauseTitle(role)
                : confirmResumeTitle(role)}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {available ? confirmPauseDesc(role) : confirmResumeDesc(role)}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200"
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void performToggle();
              }}
              disabled={busy}
              className={
                available
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-emerald-500 hover:bg-emerald-600 text-white"
              }
            >
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Salvando…
                </span>
              ) : available ? (
                "Sim, pausar"
              ) : (
                "Sim, reativar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function availableOnDescription(role: PanelRole): string {
  if (role === "lojista") return "Sua loja aparece nas buscas e recebe pedidos agora.";
  if (role === "parceiro") return "Seu catálogo B2B fica visível para lojistas e prestadores.";
  return "Clientes podem localizar seu perfil e enviar mensagens agora.";
}
function availableOffDescription(role: PanelRole): string {
  if (role === "lojista") return "Loja pausada — nenhum novo pedido chegará até você reativar.";
  if (role === "parceiro") return "Catálogo pausado — nenhuma nova solicitação B2B chegará.";
  return "Perfil pausado — nenhuma nova solicitação chegará até você reativar.";
}
function confirmPauseTitle(role: PanelRole): string {
  if (role === "lojista") return "Pausar minha loja?";
  if (role === "parceiro") return "Pausar meu catálogo B2B?";
  return "Pausar minha disponibilidade?";
}
function confirmResumeTitle(role: PanelRole): string {
  if (role === "lojista") return "Reativar minha loja?";
  if (role === "parceiro") return "Reativar meu catálogo B2B?";
  return "Reativar minha disponibilidade?";
}
function confirmPauseDesc(role: PanelRole): string {
  if (role === "lojista")
    return "Ao confirmar, sua loja ficará OCULTA nas buscas e deixará de receber novos pedidos até reativar.";
  if (role === "parceiro")
    return "Ao confirmar, seu catálogo ficará OCULTO nas buscas B2B e deixará de receber novas solicitações até reativar.";
  return "Ao confirmar, seu perfil ficará OCULTO nas buscas e você deixará de receber novas mensagens e solicitações até reativar.";
}
function confirmResumeDesc(role: PanelRole): string {
  if (role === "lojista")
    return "Ao confirmar, sua loja voltará a aparecer nas buscas e receberá novos pedidos imediatamente.";
  if (role === "parceiro")
    return "Ao confirmar, seu catálogo voltará a aparecer nas buscas B2B e receberá novas solicitações imediatamente.";
  return "Ao confirmar, seu perfil voltará a aparecer nas buscas e clientes poderão enviar mensagens e solicitações imediatamente.";
}
