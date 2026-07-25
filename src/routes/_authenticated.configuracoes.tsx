import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  User as UserIcon,
  Bell,
  Shield,
  Palette,
  Globe,
  Trash2,
  LogOut,
  ChevronRight,
  KeyRound,
  Smartphone,
  HelpCircle,
  Activity,
  Briefcase,
  Truck,
} from "lucide-react";
import { getMyAudit, type AvailabilityAudit } from "@/lib/availability";
import { supabase } from "@/integrations/supabase/client";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { useCurrentCategory } from "@/lib/user-category";
import { getCategoryTheme } from "@/lib/category-colors";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Fixxer" },
      { name: "description", content: "Preferências da conta, segurança e privacidade." },
      { property: "og:title", content: "Configurações — Fixxer" },
      { property: "og:description", content: "Gerencie sua conta, segurança e preferências." },
    ],
  }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const navigate = useNavigate();
  const category = useCurrentCategory();
  const theme = getCategoryTheme(category);

  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [pushEnabled, setPushEnabled] = useState<boolean>(true);
  const [emailAlerts, setEmailAlerts] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const em =
          data.user?.email ??
          (typeof window !== "undefined"
            ? localStorage.getItem("fixxer_user_email") ?? ""
            : "");
        setEmail(em);
        setName(
          (data.user?.user_metadata as any)?.name ??
            (typeof window !== "undefined"
              ? localStorage.getItem("fixxer_user_name") ?? ""
              : ""),
        );
        if (typeof window !== "undefined") {
          setDarkMode(localStorage.getItem("fixxer_theme") !== "light");
          setPushEnabled(localStorage.getItem("fixxer_push_enabled") !== "0");
          setEmailAlerts(localStorage.getItem("fixxer_email_alerts") !== "0");
        }
      } catch {
        /* silencioso */
      }
    })();
  }, []);

  const persist = (key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      persist("fixxer_user_name", name.trim());
      // Best-effort — se sessão estiver ativa, atualiza metadata.
      try {
        await supabase.auth.updateUser({ data: { name: name.trim() } });
      } catch {
        /* ignore */
      }
      toast.success("Perfil atualizado.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!email) {
      toast.error("E-mail não localizado. Faça login novamente.");
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      toast.success("Enviamos um link para redefinir sua senha.", {
        description: email,
      });
    } catch (e: any) {
      toast.error("Não foi possível enviar o link.", {
        description: e?.message ?? "Tente novamente em instantes.",
      });
    }
  };

  const handleSignOutAll = async () => {
    try {
      await supabase.auth.signOut({ scope: "global" as any });
    } catch {
      try {
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
    }
    try {
      await supabaseExternal.auth.signOut();
    } catch {
      /* ignore */
    }
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
    window.location.href = "/auth";
  };

  const handleDeleteAccount = () => {
    const ok = window.confirm(
      "Tem certeza que deseja solicitar a exclusão da conta? Esta ação é irreversível.",
    );
    if (!ok) return;
    toast.success("Solicitação enviada.", {
      description:
        "Nosso time entrará em contato em até 48h para confirmar a remoção dos dados.",
    });
  };

  return (
    <div className="min-h-dvh bg-[#0A0A0B] text-white pb-32">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0A0A0B]/95 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/dashboard" as any }).catch(() => history.back())}
            className="w-10 h-10 shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm md:text-base font-black uppercase italic tracking-wider truncate">
              Configurações
            </h1>
            <p className="text-[10px] md:text-xs text-muted-foreground uppercase font-bold truncate">
              Preferências da sua conta Fixxer
            </p>
          </div>
          <span
            className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border"
            style={{ color: theme.hex, borderColor: `${theme.hex}55`, background: `${theme.hex}12` }}
          >
            {theme.label}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        {/* Perfil */}
        <Section title="Conta" icon={<UserIcon className="w-4 h-4" />} accent={theme.hex}>
          <Field label="Nome de exibição">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 bg-black/40 border border-white/10 rounded-xl px-3 text-sm focus:outline-none focus:border-primary/60"
              placeholder="Como você quer aparecer no Fixxer"
              maxLength={80}
            />
          </Field>
          <Field label="E-mail">
            <input
              value={email}
              readOnly
              disabled
              className="w-full h-11 bg-black/20 border border-white/10 rounded-xl px-3 text-sm text-white/60 cursor-not-allowed"
            />
            <p className="text-[10px] text-white/40 mt-1">
              Alterações de e-mail só podem ser feitas via suporte.
            </p>
          </Field>
          <div className="flex justify-end">
            <button
              disabled={saving}
              onClick={handleSaveProfile}
              className="h-10 px-4 rounded-xl bg-primary text-black text-[11px] font-black uppercase italic disabled:opacity-50"
            >
              {saving ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </Section>

        {/* Notificações */}
        <Section title="Notificações" icon={<Bell className="w-4 h-4" />} accent={theme.hex}>
          <Toggle
            label="Notificações push"
            hint="Alertas de mensagens, propostas e O.S. no dispositivo."
            value={pushEnabled}
            onChange={(v) => {
              setPushEnabled(v);
              persist("fixxer_push_enabled", v ? "1" : "0");
            }}
          />
          <Toggle
            label="Resumo por e-mail"
            hint="Novidades semanais e resumos de atividade."
            value={emailAlerts}
            onChange={(v) => {
              setEmailAlerts(v);
              persist("fixxer_email_alerts", v ? "1" : "0");
            }}
          />
          <NavRow
            label="Preferências detalhadas"
            hint="Escolha por tipo de evento (chat, agenda, financeiro)."
            to="/preferencias/notificacoes"
            icon={<Bell className="w-4 h-4" />}
          />
        </Section>

        {/* Disponibilidade & auditoria */}
        <AvailabilityAuditSection accent={theme.hex} />

        {/* 💼 Modos de trabalho e veículo — prévia + atalho para o editor de perfil */}
        <WorkModesVehicleSection accent={theme.hex} navigate={navigate} />





        {/* Aparência */}
        <Section title="Aparência" icon={<Palette className="w-4 h-4" />} accent={theme.hex}>
          <Toggle
            label="Tema escuro"
            hint="Interface otimizada para uso noturno (recomendado)."
            value={darkMode}
            onChange={(v) => {
              setDarkMode(v);
              persist("fixxer_theme", v ? "dark" : "light");
              document.documentElement.classList.toggle("light", !v);
            }}
          />
          <div className="flex items-center justify-between px-1 py-2 text-xs text-white/60">
            <span className="flex items-center gap-2">
              <Globe className="w-4 h-4" /> Idioma
            </span>
            <span className="font-bold text-white/80">Português (Brasil)</span>
          </div>
        </Section>

        {/* Segurança */}
        <Section title="Segurança" icon={<Shield className="w-4 h-4" />} accent={theme.hex}>
          <NavRow
            label="Trocar senha"
            hint="Enviaremos um link seguro para o seu e-mail."
            icon={<KeyRound className="w-4 h-4" />}
            onClick={handleChangePassword}
          />
          <NavRow
            label="Encerrar sessão em todos os dispositivos"
            hint="Recomendado ao trocar de aparelho."
            icon={<Smartphone className="w-4 h-4" />}
            onClick={handleSignOutAll}
          />
        </Section>

        {/* Suporte */}
        <Section title="Suporte" icon={<HelpCircle className="w-4 h-4" />} accent={theme.hex}>
          <NavRow
            label="Central de ajuda"
            hint="Tire dúvidas e abra tickets."
            icon={<HelpCircle className="w-4 h-4" />}
            to="/ajuda"
          />
        </Section>

        {/* Perigo */}
        <Section title="Zona de risco" icon={<Trash2 className="w-4 h-4" />} accent="#EF4444" danger>
          <button
            onClick={handleDeleteAccount}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 transition"
          >
            <span className="flex items-center gap-3 text-left">
              <span className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </span>
              <span>
                <span className="block text-[11px] font-black uppercase italic tracking-widest text-red-300">
                  Excluir minha conta
                </span>
                <span className="block text-[10px] text-white/50">
                  Solicitação com confirmação por 48h.
                </span>
              </span>
            </span>
            <ChevronRight className="w-4 h-4 text-red-400/60" />
          </button>

          <button
            onClick={handleSignOutAll}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition"
          >
            <span className="flex items-center gap-3 text-left">
              <span className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white/80 flex items-center justify-center">
                <LogOut className="w-4 h-4" />
              </span>
              <span>
                <span className="block text-[11px] font-black uppercase italic tracking-widest">
                  Sair da conta
                </span>
                <span className="block text-[10px] text-white/50">
                  Encerra sessão neste dispositivo.
                </span>
              </span>
            </span>
            <ChevronRight className="w-4 h-4 text-white/40" />
          </button>
        </Section>

        <p className="text-center text-[10px] text-white/30 pt-2">
          Fixxer • Suas preferências ficam vinculadas ao e-mail acima.
        </p>

        <div className="text-center">
          <Link to="/dashboard" className="text-[11px] font-black uppercase text-primary">
            ← Voltar ao painel
          </Link>
        </div>
      </main>
    </div>
  );
}

/* ============================ COMPONENTES ============================ */

function Section({
  title,
  icon,
  accent,
  danger,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  accent: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-3xl border p-4 space-y-3"
      style={{
        borderColor: danger ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.08)",
        background: danger
          ? "linear-gradient(180deg, rgba(239,68,68,0.06), rgba(0,0,0,0.4))"
          : `linear-gradient(180deg, ${accent}0A, rgba(20,20,22,0.6))`,
      }}
    >
      <header className="flex items-center gap-2 pb-2 border-b border-white/5">
        <span
          className="w-8 h-8 rounded-xl border flex items-center justify-center"
          style={{
            color: danger ? "#EF4444" : accent,
            borderColor: danger ? "rgba(239,68,68,0.4)" : `${accent}55`,
            background: danger ? "rgba(239,68,68,0.1)" : `${accent}15`,
          }}
        >
          {icon}
        </span>
        <h2 className="text-[11px] font-black uppercase italic tracking-widest">{title}</h2>
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function AvailabilityAuditSection({ accent }: { accent: string }) {
  const [items, setItems] = useState<AvailabilityAudit[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setItems(await getMyAudit(20)); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  };

  return (
    <Section title="Disponibilidade" icon={<Activity className="w-4 h-4" />} accent={accent}>
      <p className="text-[11px] text-white/60 leading-snug">
        Histórico das últimas mudanças no seu status de disponibilidade.
        Use o botão de disponibilidade no topo do painel para pausar ou reativar.
      </p>

      {loading ? (
        <div className="text-[11px] text-white/40">Carregando histórico…</div>
      ) : items.length === 0 ? (
        <div className="text-[11px] text-white/40 py-4 text-center border border-dashed border-white/10 rounded-xl">
          Nenhuma alteração registrada ainda.
        </div>
      ) : (
        <ul className="space-y-2" aria-label="Histórico de disponibilidade">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: it.is_available ? "#10B981" : "#6B7280",
                    boxShadow: it.is_available ? "0 0 6px #10B981" : undefined,
                  }}
                />
                <span className="text-[11px] font-black uppercase italic truncate">
                  {it.is_available ? "Disponível" : "Indisponível"}
                </span>
              </div>
              <span className="text-[10px] text-white/50 tabular-nums shrink-0">{fmt(it.changed_at)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={load}
          className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase italic hover:bg-white/10"
        >
          Atualizar
        </button>
      </div>
    </Section>
  );
}


// 💼 Prévia + atalho para gerenciar work_modes e características do veículo no editor de perfil.
function WorkModesVehicleSection({ accent, navigate }: { accent: string; navigate: ReturnType<typeof useNavigate> }) {
  const [loading, setLoading] = useState(true);
  const [workModes, setWorkModes] = useState<string[]>([]);
  const [vehicleType, setVehicleType] = useState<string>("");
  const [vehicleDesc, setVehicleDesc] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: sess } = await supabaseExternal.auth.getUser();
        const uid = sess.user?.id;
        if (!uid) { setLoading(false); return; }
        const { data } = await supabaseExternal
          .from("profiles")
          .select("role, work_modes, vehicle_type, vehicle_description, offerings_notes, custom_sections")
          .eq("id", uid)
          .maybeSingle();
        const extras = (data as any)?.custom_sections?.__extras || {};
        const wm: string[] = Array.isArray((data as any)?.work_modes)
          ? (data as any).work_modes
          : (Array.isArray(extras.work_modes) ? extras.work_modes : []);
        setWorkModes(wm.filter(Boolean));
        setVehicleType(String((data as any)?.vehicle_type ?? extras.vehicle_type ?? "") || "");
        setVehicleDesc(String((data as any)?.vehicle_description ?? extras.vehicle_description ?? "") || "");
        setNotes(String((data as any)?.offerings_notes ?? extras.offerings_notes ?? "") || "");
        setRole(((data as any)?.role as string) || null);
      } catch { /* silencioso */ }
      finally { setLoading(false); }
    })();
  }, []);

  const goEdit = () => {
    try { navigate({ to: "/profile" as any, hash: "aceita-trabalhos" as any }); }
    catch { window.location.href = "/profile#aceita-trabalhos"; }
  };

  const invalidPrestador = role === "prestador" && workModes.length === 0;

  return (
    <Section title="Modos de trabalho e veículo" icon={<Briefcase className="w-4 h-4" />} accent={accent}>
      <p className="text-[11px] text-white/60 -mt-1">
        Prévia ao vivo dos formatos de contratação e do veículo que aparecem em <b>🎁 Oferece</b> do seu perfil público.
      </p>

      {loading ? (
        <div className="h-16 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1.5">
              💼 Aceita trabalhos como
            </p>
            {workModes.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {workModes.map((m, i) => (
                  <span
                    key={`${m}-${i}`}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase italic border"
                    style={{ borderColor: `${accent}55`, color: accent, background: `${accent}12` }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            ) : (
              <p className={`text-[11px] italic ${invalidPrestador ? "text-red-300" : "text-white/40"}`}>
                {invalidPrestador
                  ? "⚠️ Você é prestador e não escolheu nenhum formato. É obrigatório escolher ao menos um antes de salvar o perfil."
                  : "Nenhum formato selecionado."}
              </p>
            )}
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1.5 flex items-center gap-1.5">
              <Truck className="w-3 h-3" /> Veículo
            </p>
            {(vehicleType || vehicleDesc) ? (
              <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 text-[11px] text-white/85 space-y-0.5">
                {vehicleType && <div><b className="text-white/50 mr-1">Tipo:</b>{vehicleType}</div>}
                {vehicleDesc && <div className="italic text-white/70">{vehicleDesc}</div>}
              </div>
            ) : (
              <p className="text-[11px] italic text-white/40">Nenhum veículo cadastrado.</p>
            )}
          </div>

          {notes && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1.5">Observações</p>
              <p className="text-[11px] italic text-white/75 border-l-2 pl-2" style={{ borderColor: `${accent}80` }}>
                {notes}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={goEdit}
          className="h-10 px-4 rounded-xl text-[11px] font-black uppercase italic border"
          style={{ background: `${accent}18`, borderColor: `${accent}55`, color: accent }}
        >
          Gerenciar no editor de perfil →
        </button>
      </div>
    </Section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-black uppercase tracking-widest text-white/50 mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-black uppercase italic tracking-widest">
          {label}
        </span>
        {hint && <span className="block text-[10px] text-white/50 mt-0.5">{hint}</span>}
      </span>
      <span
        className="relative shrink-0 w-11 h-6 rounded-full transition-colors"
        style={{ backgroundColor: value ? "#00E5A0" : "rgba(255,255,255,0.15)" }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: value ? "translateX(20px)" : "translateX(0)" }}
        />
      </span>
    </button>
  );
}

function NavRow({
  label,
  hint,
  icon,
  to,
  onClick,
}: {
  label: string;
  hint?: string;
  icon: React.ReactNode;
  to?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span className="flex items-center gap-3 min-w-0">
        <span className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white/80 flex items-center justify-center shrink-0">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-black uppercase italic tracking-widest truncate">
            {label}
          </span>
          {hint && <span className="block text-[10px] text-white/50 truncate">{hint}</span>}
        </span>
      </span>
      <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
    </>
  );
  const className =
    "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition text-left";
  if (to) {
    return (
      <Link to={to as any} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}
