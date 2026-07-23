import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Activity, PlusCircle, Store, MessageCircle, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { supabaseExternal } from "@/lib/supabaseExternal";

/**
 * Barra de ações global inferior — visível em mobile e desktop.
 * Presente em todas as telas do sistema para navegação rápida.
 */
export function GlobalActionBar() {
  const navigate = useNavigate();
  const { location } = useRouterState();
  const path = location.pathname;
  const hash = location.hash;
  const [unreadCount, setUnreadCount] = useState(0);

  const isActive = (target: string) => path.startsWith(target);
  const isHash = (h: string) => path.startsWith("/dashboard/lojista") && hash === h;

  const [role, setRole] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return (localStorage.getItem("fixxer_user_role") || "").toLowerCase();
  });

  // Resolve a aba do Feed a partir do papel; fallback = feed geral sem tab
  const resolveFeedTab = (r: string): string | null => {
    const role = (r || "").toLowerCase();
    if (!role) return null;
    if (role.includes("lojista")) return "prestadores";
    if (role.includes("prestador")) return "demandas_lojista";
    if (role.includes("parceiro") || role.includes("fornecedor")) return "parceiros";
    if (role.includes("cliente") || role.includes("casual")) return "obras_b2c";
    return null;
  };

  // Perfil → Feed relacionado ao papel do usuário logado
  const goToRoleFeed = () => {
    let current = role;
    if (!current && typeof window !== "undefined") {
      current = (localStorage.getItem("fixxer_user_role") || "").toLowerCase();
      if (current) setRole(current);
    }
    const tab = resolveFeedTab(current);
    navigate({
      to: "/feed" as any,
      search: (tab ? { tab } : {}) as any,
    });
  };

  // Reage a mudanças de papel: outro tab (storage) e atualizações internas
  useEffect(() => {
    const syncRole = () => {
      if (typeof window === "undefined") return;
      setRole((localStorage.getItem("fixxer_user_role") || "").toLowerCase());
    };
    window.addEventListener("storage", syncRole);
    window.addEventListener("fixxer:role-changed", syncRole as any);
    return () => {
      window.removeEventListener("storage", syncRole);
      window.removeEventListener("fixxer:role-changed", syncRole as any);
    };
  }, []);

  // Notificações de novas mensagens — reativas ao usuário logado
  useEffect(() => {
    let cancelled = false;
    let channel: any = null;
    let currentUserId: string | null = null;

    const loadUnread = async () => {
      try {
        if (!currentUserId) {
          if (!cancelled) setUnreadCount(0);
          return;
        }
        const { count, error } = await supabaseExternal
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", currentUserId)
          .eq("read", false);
        if (!error && !cancelled) setUnreadCount(count || 0);
      } catch {
        // tabela pode não existir ainda; mantém 0 silenciosamente
      }
    };

    const subscribe = () => {
      try {
        if (channel) {
          try { supabaseExternal.removeChannel(channel); } catch {}
          channel = null;
        }
        if (!currentUserId) return;
        const channelName = `chat-unread-${Math.random().toString(36).slice(2)}`;
        channel = supabaseExternal
          .channel(channelName)
          .on(
            "postgres_changes" as any,
            { event: "*", schema: "public", table: "messages" },
            () => loadUnread(),
          )
          .subscribe();
      } catch {
        // Realtime indisponível
      }
    };

    const bootstrap = async () => {
      try {
        const { data } = await supabaseExternal.auth.getUser();
        currentUserId = data?.user?.id ?? null;
      } catch {
        currentUserId = null;
      }
      await loadUnread();
      subscribe();
    };

    bootstrap();

    // Zera imediatamente quando o Inbox marca tudo como lido
    const onLocalRead = () => setUnreadCount(0);
    window.addEventListener("fixxer:messages-read", onLocalRead);

    // Reagir a login/logout: recarrega o userId e reinscreve o canal
    const { data: authSub } = supabaseExternal.auth.onAuthStateChange(async (_evt, session) => {
      currentUserId = session?.user?.id ?? null;
      if (!currentUserId) setUnreadCount(0);
      await loadUnread();
      subscribe();
    });

    return () => {
      cancelled = true;
      window.removeEventListener("fixxer:messages-read", onLocalRead);
      try { authSub?.subscription?.unsubscribe(); } catch {}
      if (channel) {
        try { supabaseExternal.removeChannel(channel); } catch {}
      }
    };
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/85 backdrop-blur-xl border-t border-white/10 p-3 z-[100] flex items-center justify-around pb-safe">
      <button
        onClick={() => navigate({ to: "/dashboard/lojista" as any })}
        className={`flex flex-col items-center gap-1 ${isActive("/dashboard") && !hash ? "text-primary" : "text-muted-foreground"}`}
      >
        <Activity className="w-5 h-5" />
        <span className="text-[8px] font-black uppercase italic">Painel</span>
      </button>

      <button
        onClick={() => navigate({ to: "/feed" as any })}
        className={`flex flex-col items-center gap-1 ${isActive("/feed") && !isHash("reviews") ? "text-primary" : "text-muted-foreground"}`}
      >
        <PlusCircle className="w-5 h-5" />
        <span className="text-[8px] font-black uppercase italic">Criar</span>
      </button>

      <div className="flex flex-col items-center gap-1 relative">
        <button
          onClick={goToRoleFeed}
          className={`w-12 h-12 -mt-6 bg-black border rounded-full flex items-center justify-center shadow-2xl transition-all ${isActive("/feed") ? "border-primary text-primary" : "border-white/20 text-white"}`}
          title="Meu Feed"
        >
          <Store className="w-6 h-6" />
        </button>
        <span className="text-[8px] font-black uppercase italic mt-1">Feed</span>
      </div>

      <button
        onClick={() => navigate({ to: "/chat" as any })}
        className={`flex flex-col items-center gap-1 relative ${isActive("/chat") ? "text-primary" : "text-muted-foreground"}`}
      >
        <div className="relative">
          <MessageCircle className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center border border-black">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        <span className="text-[8px] font-black uppercase italic">Chat</span>
      </button>

      <button
        onClick={() => navigate({ to: "/dashboard/lojista" as any, hash: "menu" })}
        className={`flex flex-col items-center gap-1 ${isHash("menu") ? "text-primary" : "text-muted-foreground"}`}
      >
        <Menu className="w-5 h-5" />
        <span className="text-[8px] font-black uppercase italic">Menu</span>
      </button>
    </div>
  );
}
