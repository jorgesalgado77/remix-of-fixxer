import { Link } from "@tanstack/react-router";
import { Calendar, Megaphone, Settings, Zap, PowerOff, Loader2, AlertTriangle, UserCircle2 } from "lucide-react";
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

/**
 * Barra de ações padrão dos painéis (Lojista, Prestador, Parceiro, Cliente).
 * - Agenda / Meus Anúncios / Configurações: apenas ícone + tooltip acessível.
 * - Disponibilidade: com texto, confirmação obrigatória, estado de carregamento
 *   e mensagens de erro claras.
 * Todos os controles são navegáveis por teclado (Tab/Enter/Espaço).
 */
export function PanelActions() {
  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-3">
      <IconLink to="/agenda" label="Agenda" tip="Abrir minha agenda de compromissos">
        <Calendar className="w-5 h-5" aria-hidden="true" />
      </IconLink>
      <IconLink to="/meus-anuncios" label="Meus Anúncios" tip="Gerenciar meus anúncios publicados">
        <Megaphone className="w-5 h-5" aria-hidden="true" />
      </IconLink>
      <IconLink to="/configuracoes" label="Configurações" tip="Configurações do sistema — preferências, notificações e segurança">
        <Settings className="w-5 h-5" aria-hidden="true" />
      </IconLink>
      <AvailabilityToggle />
    </div>
  );
}

function IconLink({
  to,
  label,
  tip,
  children,
}: {
  to: string;
  label: string;
  tip: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      title={tip}
      aria-label={label}
      className="flex items-center justify-center h-11 w-11 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-all"
    >
      {children}
    </Link>
  );
}

function AvailabilityToggle() {
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
          description: "Clientes podem localizar seu perfil e enviar mensagens agora.",
        });
      } else {
        toast("Você está INDISPONÍVEL.", {
          description: "Perfil pausado — nenhuma nova solicitação chegará até você reativar.",
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
          available
            ? "Disponibilidade ATIVA — clique para pausar"
            : "Disponibilidade PAUSADA — clique para reativar"
        }
        aria-label={`Alternar disponibilidade. Atualmente ${available ? "disponível" : "indisponível"}. Clique para definir como ${nextLabel.toLowerCase()}.`}
        className={`flex items-center gap-2 h-11 px-4 rounded-xl border transition-all text-[10px] font-black uppercase italic tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-60 disabled:cursor-not-allowed ${
          available ? activeStyle : pausedStyle
        }`}
      >
        <span
          className={`relative w-9 h-5 rounded-full transition-colors ${
            available ? "bg-white/30" : "bg-black/30"
          }`}
          aria-hidden="true"
        >
          <span
            className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
            style={{ transform: available ? "translateX(16px)" : "translateX(0)" }}
          />
        </span>
        <span className="inline-flex items-center gap-1.5">
          {loadingInitial ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          ) : available ? (
            <Zap className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <PowerOff className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          {loadingInitial ? "Carregando…" : available ? "Disponível" : "Indisponível"}
        </span>
        {/* Região viva para leitores de tela */}
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
                ? "Pausar minha disponibilidade?"
                : "Reativar minha disponibilidade?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {available
                ? "Ao confirmar, seu perfil ficará OCULTO nas buscas e você deixará de receber novas mensagens e solicitações até reativar."
                : "Ao confirmar, seu perfil voltará a aparecer nas buscas e clientes poderão enviar mensagens e solicitações imediatamente."}
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
