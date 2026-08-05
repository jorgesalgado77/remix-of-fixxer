import { useEffect, useRef, useState } from "react";
import { Bell, X, UserCheck, UserX, MessageCircle, Loader2 } from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";

interface NotificationRow {
  id: string;
  recipient_id: string;
  kind: string;
  title: string | null;
  body: string | null;
  meta: any;
  read: boolean | null;
  created_at: string;
}

/**
 * Central de Notificações — painel dropdown com tentativas de contato,
 * alertas de indisponibilidade e mensagens de "voltou a ficar disponível".
 * Realtime via canal Postgres em `notifications`.
 */
export function NotificationsCenter() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = items.filter((n) => !n.read).length;

  const load = async (userId: string | null) => {
    if (!userId) { setItems([]); return; }
    setLoading(true);
    try {
      const { data } = await supabaseExternal
        .from("notifications")
        .select("*")
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);
      setItems((data ?? []) as NotificationRow[]);
    } catch { /* silencioso — tabela pode não existir */ }
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    let channel: any = null;

    (async () => {
      let userId: string | null = null;
      try {
        const { data } = await supabaseExternal.auth.getUser();
        userId = data?.user?.id ?? null;
      } catch { /* ignore */ }
      if (cancelled) return;
      setUid(userId);
      await load(userId);

      if (!userId) return;
      try {
        channel = supabaseExternal
          .channel(`notif:${userId}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
            () => load(userId),
          )
          .subscribe();
      } catch { /* ignore */ }
    })();

    return () => {
      cancelled = true;
      try { channel?.unsubscribe(); } catch { /* ignore */ }
    };
  }, []);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const markAllRead = async () => {
    if (!uid) return;
    const ids = items.filter((n) => !n.read).map((n) => n.id);
    if (ids.length === 0) return;
    setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
    try {
      await supabaseExternal.from("notifications").update({ read: true }).in("id", ids);
    } catch { /* ignore */ }
  };

  const iconFor = (kind: string) => {
    if (kind === "contact_attempt") return <UserX className="w-4 h-4 text-amber-300" />;
    if (kind === "target_available_again") return <UserCheck className="w-4 h-4 text-emerald-400" />;
    return <MessageCircle className="w-4 h-4 text-primary" />;
  };

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center hover:bg-primary/30 text-primary shadow-[0_0_10px_rgba(0,255,135,0.2)] active:scale-95 transition-all"
        aria-label="Central de notificações"
        aria-expanded={open}
        title="Notificações"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span
            aria-live="polite"
            className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center border border-black"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notificações"
          className="absolute right-0 top-full mt-2 w-[300px] sm:w-[320px] max-h-[60vh] sm:max-h-[70vh] overflow-hidden rounded-2xl bg-[#0a0a0b] backdrop-blur-2xl border border-white/15 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.9)] z-[200] flex flex-col"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <span className="text-[11px] font-black uppercase italic tracking-widest">Notificações</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[10px] font-bold uppercase text-primary hover:underline"
                >
                  Marcar lidas
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="w-6 h-6 rounded-md hover:bg-white/10 flex items-center justify-center"
                aria-label="Fechar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            )}
            {!loading && items.length === 0 && (
              <p className="text-center text-[11px] text-muted-foreground py-8 px-4">
                Nenhuma notificação por aqui ainda.
              </p>
            )}
            {items.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-2 px-3 py-2 border-b border-white/5 ${!n.read ? "bg-primary/5" : ""}`}
              >
                <div className="mt-0.5">{iconFor(n.kind)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold truncate">{n.title ?? "Notificação"}</p>
                  {n.body && (
                    <p className="text-[11px] text-muted-foreground leading-snug">{n.body}</p>
                  )}
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 mt-0.5">
                    {new Date(n.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5" aria-label="Não lida" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
