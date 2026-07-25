import { Link } from "@tanstack/react-router";
import { Calendar, Megaphone, Settings, Zap, PowerOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Barra de ações padrão dos painéis (Lojista, Prestador, Parceiro, Cliente).
 * - Agenda / Meus Anúncios / Configurações: apenas ícone + tooltip.
 * - Disponibilidade: com texto e cores dinâmicas
 *   (verde+branco quando DISPONÍVEL, vermelho+branco quando INDISPONÍVEL).
 */
export function PanelActions() {
  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-3">
      <IconLink to="/agenda" label="Agenda" tip="Abrir minha agenda de compromissos">
        <Calendar className="w-5 h-5" />
      </IconLink>
      <IconLink to="/meus-anuncios" label="Meus Anúncios" tip="Gerenciar meus anúncios publicados">
        <Megaphone className="w-5 h-5" />
      </IconLink>
      <IconLink to="/configuracoes" label="Configurações" tip="Configurações do sistema — preferências, notificações e segurança">
        <Settings className="w-5 h-5" />
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
      className="flex items-center justify-center h-11 w-11 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-primary/40 transition-all"
    >
      {children}
    </Link>
  );
}

function AvailabilityToggle() {
  const [available, setAvailable] = useState<boolean>(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("@/lib/availability")
      .then(({ getMyAvailability }) => {
        getMyAvailability().then((v) => {
          if (!cancelled) setAvailable(v);
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async () => {
    if (busy) return;
    const next = !available;
    setAvailable(next);
    setBusy(true);
    try {
      const { setMyAvailability } = await import("@/lib/availability");
      await setMyAvailability(next);
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
    } catch {
      toast.error("Não foi possível salvar sua disponibilidade agora.");
    } finally {
      setBusy(false);
    }
  };

  const activeStyle =
    "bg-emerald-500 border-emerald-400 text-white hover:bg-emerald-600 shadow-[0_0_18px_rgba(16,185,129,0.45)]";
  const pausedStyle =
    "bg-red-600 border-red-500 text-white hover:bg-red-700 shadow-[0_0_18px_rgba(239,68,68,0.45)]";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={available}
      onClick={toggle}
      title={
        available
          ? "Disponibilidade ATIVA — clique para pausar"
          : "Disponibilidade PAUSADA — clique para reativar"
      }
      aria-label={available ? "Definir como indisponível" : "Definir como disponível"}
      className={`flex items-center gap-2 h-11 px-4 rounded-xl border transition-all text-[10px] font-black uppercase italic tracking-widest ${
        available ? activeStyle : pausedStyle
      }`}
    >
      <span
        className={`relative w-9 h-5 rounded-full transition-colors ${
          available ? "bg-white/30" : "bg-black/30"
        }`}
        aria-hidden
      >
        <span
          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
          style={{ transform: available ? "translateX(16px)" : "translateX(0)" }}
        />
      </span>
      <span className="inline-flex items-center gap-1.5">
        {available ? <Zap className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
        {available ? "Disponível" : "Indisponível"}
      </span>
    </button>
  );
}
