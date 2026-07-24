import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  isPushSupported,
  isCurrentlySubscribed,
  subscribeToPush,
  unsubscribeFromPush,
  registerServiceWorker,
} from "@/lib/push-client";
import { supabaseExternal } from "@/lib/supabaseExternal";

export function PushToggle() {
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!isPushSupported()) {
        setSupported(false);
        return;
      }
      await registerServiceWorker();
      setSubscribed(await isCurrentlySubscribed());
    })();
  }, []);

  async function toggle() {
    setLoading(true);
    try {
      if (subscribed) {
        const r = await unsubscribeFromPush();
        if (r.ok) {
          setSubscribed(false);
          toast.success("Notificações push desativadas");
        } else {
          toast.error("Falha ao desativar");
        }
      } else {
        const { data: { session } } = await supabaseExternal.auth.getSession();
        if (!session) {
          toast.error("Faça login para ativar notificações");
          return;
        }
        const r = await subscribeToPush(session.user.id);
        if (r.ok) {
          setSubscribed(true);
          toast.success("Notificações push ativadas!");
        } else {
          toast.error(r.error || "Não foi possível ativar");
        }
      }
    } finally {
      setLoading(false);
    }
  }

  if (!supported) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
        <BellOff className="w-5 h-5 text-muted-foreground" />
        <div className="text-xs text-muted-foreground">Push notifications não são suportadas neste navegador.</div>
      </div>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`w-full flex items-center justify-between gap-3 p-4 rounded-2xl border transition-all ${
        subscribed
          ? "bg-primary/10 border-primary/30 hover:bg-primary/20"
          : "bg-white/5 border-white/10 hover:border-primary/50"
      }`}
    >
      <div className="flex items-center gap-3">
        {subscribed ? (
          <Bell className="w-5 h-5 text-primary" />
        ) : (
          <BellOff className="w-5 h-5 text-muted-foreground" />
        )}
        <div className="text-left">
          <div className="text-sm font-black text-white uppercase tracking-tight">
            Notificações Push
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            {subscribed ? "Ativadas — você receberá alertas em tempo real" : "Desativadas — clique para ativar"}
          </div>
        </div>
      </div>
      {loading ? (
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      ) : (
        <div className={`w-11 h-6 rounded-full relative transition-colors ${subscribed ? "bg-primary" : "bg-white/10"}`}>
          <div
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              subscribed ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </div>
      )}
    </button>
  );
}
