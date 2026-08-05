import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, Bell, Save, Loader2, Smartphone, Inbox } from "lucide-react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import {
  loadPrefs,
  savePrefs,
  defaultPrefs,
  NOTIF_EVENTS,
  type NotifPrefs,
  type NotifEventKey,
  type NotifChannel,
} from "@/lib/notification-prefs";
import { PushToggle } from "@/components/PushToggle";

export default function NotificationPreferencesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<NotifPrefs>(defaultPrefs());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabaseExternal.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);
      const p = await loadPrefs(uid);
      setPrefs(p);
      setLoading(false);
    })();
  }, []);

  const toggle = (key: NotifEventKey, channel: NotifChannel) => {
    setPrefs((prev) => ({ ...prev, [key]: { ...prev[key], [channel]: !prev[key][channel] } }));
    setDirty(true);
  };

  const setAll = (channel: NotifChannel, value: boolean) => {
    const next = { ...prefs };
    for (const e of NOTIF_EVENTS) next[e.key] = { ...next[e.key], [channel]: value };
    setPrefs(next);
    setDirty(true);
  };

  const save = async () => {
    if (!userId) { toast.error("Faça login para salvar preferências."); return; }
    setSaving(true);
    const r = await savePrefs(userId, prefs);
    setSaving(false);
    if (r.ok) { setDirty(false); toast.success("Preferências salvas."); }
    else toast.error("Falha ao salvar", { description: r.error });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white pb-32" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <header className="sticky top-0 z-30 bg-[#0A0A0B]/95 backdrop-blur-md border-b border-white/10 p-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link
            to="/profile" search={{ focus: "" } as any}
            className="w-10 h-10 shrink-0 bg-[#1A1A1B] border border-white/10 rounded-xl flex items-center justify-center text-white/70"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black uppercase tracking-tighter truncate flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#00FF87]" />
              Notificações
            </h1>
            <p className="text-[10px] text-white/50">Escolha o que receber por push e no app.</p>
          </div>
          {dirty && (
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[#00FF87] text-black disabled:opacity-40 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Salvar
            </button>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Push toggle geral */}
        <section>
          <p className="text-[10px] font-black uppercase text-white/50 mb-2 tracking-widest">Permissão do dispositivo</p>
          <PushToggle />
        </section>

        {/* Ações rápidas */}
        <section className="rounded-2xl border border-white/10 bg-[#111112] p-4 space-y-3">
          <p className="text-[10px] font-black uppercase text-white/50 tracking-widest">Ações rápidas</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setAll("push", true); setAll("inapp", true); }}
              className="py-2 rounded-lg bg-[#00FF87]/10 border border-[#00FF87]/30 text-[10px] font-black uppercase text-[#00FF87]"
            >
              Ativar tudo
            </button>
            <button
              onClick={() => { setAll("push", false); setAll("inapp", false); }}
              className="py-2 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase text-white/70"
            >
              Desativar tudo
            </button>
          </div>
        </section>

        {/* Lista de eventos */}
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>
        ) : (
          <section className="rounded-2xl border border-white/10 bg-[#111112] overflow-hidden">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 items-center px-4 py-3 border-b border-white/10 bg-black/30">
              <p className="text-[10px] font-black uppercase text-white/60 tracking-widest">Evento</p>
              <p className="text-[10px] font-black uppercase text-white/60 tracking-widest flex items-center gap-1 justify-center">
                <Smartphone className="w-3 h-3" /> Push
              </p>
              <p className="text-[10px] font-black uppercase text-white/60 tracking-widest flex items-center gap-1 justify-center">
                <Inbox className="w-3 h-3" /> App
              </p>
            </div>
            {NOTIF_EVENTS.map((ev) => (
              <div
                key={ev.key}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 items-center px-4 py-3 border-b border-white/5 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-[12px] font-bold flex items-center gap-2">
                    <span>{ev.icon}</span>
                    <span className="truncate">{ev.label}</span>
                  </p>
                  <p className="text-[10px] text-white/50 mt-0.5">{ev.description}</p>
                </div>
                <ToggleSwitch checked={prefs[ev.key].push} onChange={() => toggle(ev.key, "push")} accent="#A855F7" />
                <ToggleSwitch checked={prefs[ev.key].inapp} onChange={() => toggle(ev.key, "inapp")} accent="#00FF87" />
              </div>
            ))}
          </section>
        )}

        {dirty && (
          <button
            onClick={save}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-[#00FF87] text-black text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar preferências
          </button>
        )}
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange, accent }: { checked: boolean; onChange: () => void; accent: string }) {
  return (
    <button
      onClick={onChange}
      className="w-11 h-6 rounded-full relative transition-colors"
      style={{ backgroundColor: checked ? accent : "rgba(255,255,255,0.1)" }}
      aria-pressed={checked}
    >
      <div
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
        style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}
