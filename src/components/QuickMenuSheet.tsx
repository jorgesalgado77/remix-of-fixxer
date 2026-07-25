import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useNavigate } from "@tanstack/react-router";
import {
  User,
  Heart,
  Megaphone,
  Calendar,
  Bell,
  Settings,
  HelpCircle,
  LogOut,
  Home,
} from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { useCurrentCategory } from "@/lib/user-category";
import { getCategoryTheme } from "@/lib/category-colors";

type Item = {
  icon: React.ReactNode;
  label: string;
  hint: string;
  to?: string;
  action?: () => void | Promise<void>;
  danger?: boolean;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function QuickMenuSheet({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const category = useCurrentCategory();
  const theme = getCategoryTheme(category);

  const go = (to: string) => {
    onOpenChange(false);
    navigate({ to: to as any });
  };

  const dashboardRoute =
    category === "prestador"
      ? "/prestador"
      : category === "fornecedor"
        ? "/parceiro"
        : category === "cliente"
          ? "/cliente"
          : category === "admin"
            ? "/admin"
            : "/dashboard/lojista";

  const items: Item[] = [
    { icon: <Home className="w-4 h-4" />, label: "Meu Painel", hint: "Dashboard principal", to: dashboardRoute },
    { icon: <User className="w-4 h-4" />, label: "Meu Perfil", hint: "Editar dados e mídia", to: "/profile" },
    { icon: <Heart className="w-4 h-4" />, label: "Favoritos", hint: "Perfis e anúncios salvos", to: "/favoritos" },
    { icon: <Megaphone className="w-4 h-4" />, label: "Meus Anúncios", hint: "Gerenciar publicações", to: "/meus-anuncios" },
    { icon: <Calendar className="w-4 h-4" />, label: "Agenda", hint: "Compromissos e O.S.", to: "/agenda" },
    { icon: <Bell className="w-4 h-4" />, label: "Notificações", hint: "Preferências de alertas", to: "/notificacoes" },
    { icon: <Settings className="w-4 h-4" />, label: "Configurações", hint: "Preferências da conta", to: "/configuracoes" },
    { icon: <HelpCircle className="w-4 h-4" />, label: "Ajuda", hint: "Central de suporte", to: "/ajuda" },
    {
      icon: <LogOut className="w-4 h-4" />,
      label: "Sair",
      hint: "Encerrar sessão com segurança",
      danger: true,
      action: async () => {
        try { await supabaseExternal.auth.signOut(); } catch {}
        // A limpeza de chaves legadas de identidade é feita pelo listener em
        // current-user.ts (onAuthStateChange → SIGNED_OUT).
        onOpenChange(false);
        window.location.href = "/auth";
      },
    },
  ];


  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-white/10 bg-black/95 backdrop-blur-2xl p-0 max-h-[85vh] overflow-y-auto"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 112px)" }}
      >
        <div
          className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/20"
          aria-hidden
        />
        <SheetHeader className="px-5 pt-4 pb-3 text-left">
          <SheetTitle className="text-white text-sm font-black uppercase italic tracking-widest flex items-center gap-2">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: theme.hex, boxShadow: `0 0 10px ${theme.hex}` }}
            />
            Menu Rápido
            <span
              className="text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest"
              style={{ ...theme.color, ...theme.bgSoft, ...theme.borderSoft, borderWidth: 1, borderStyle: "solid" }}
            >
              {theme.label}
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="px-3 pb-6 grid grid-cols-1 gap-2">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              title={it.hint}
              aria-label={it.label}
              onClick={() => {
                if (it.action) return void it.action();
                if (it.to) go(it.to);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-left ${
                it.danger
                  ? "bg-red-500/10 border-red-500/20 hover:bg-red-500/15"
                  : "bg-white/[0.04] border-white/10 hover:bg-white/[0.08]"
              }`}
            >
              <span
                className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                  it.danger ? "text-red-400 border-red-500/20 bg-red-500/10" : "text-white border-white/10 bg-white/5"
                }`}
                style={it.danger ? undefined : { ...theme.color }}
              >
                {it.icon}
              </span>
              <span className="flex-1 min-w-0">
                <span className={`block text-[11px] font-black uppercase italic tracking-widest ${it.danger ? "text-red-300" : "text-white"}`}>
                  {it.label}
                </span>
                <span className="block text-[10px] text-muted-foreground truncate">{it.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
