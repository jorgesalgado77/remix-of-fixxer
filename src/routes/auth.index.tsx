import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, LogIn, Loader2, KeyRound, ArrowLeft, Terminal, Eye, EyeOff, AlertTriangle, CheckCircle2, Search } from "lucide-react";

import { useState, useEffect } from "react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/")({
  component: LoginComponent,
});


function LoginComponent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [view, setView] = useState<"login" | "forgot-password">("login");
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    setErrorMsg('');

    // Autenticação exclusivamente via Supabase — sem bypass hardcoded.
    // O papel de admin é determinado no servidor pela tabela public.user_roles.





    try {
      const { data, error } = await supabaseExternal.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message || 'Erro de conexão com o Supabase.');
        setLoading(false);
        return;
      }

      if (data?.session) {
        const normalizedEmail = email.trim().toLowerCase();

        // Bloqueio de acesso — lê o perfil no Supabase externo (fonte de verdade).
        let statusRow: { status?: string | null; role?: string | null; user_type?: string | null; business_category?: string | null } | null = null;
        try {
          const { data: ext } = await supabaseExternal
            .from('profiles')
            .select('status, role, user_type, business_category')
            .eq('id', data.session.user.id)
            .maybeSingle();
          statusRow = (ext as any) || null;
        } catch { /* silencioso */ }

        if (statusRow?.status === 'bloqueado') {
          await supabaseExternal.auth.signOut();
          setErrorMsg('Sua conta está SUSPENSA. Contate o suporte para mais informações.');
          toast.error('Acesso suspenso pelo administrador.');
          setLoading(false);
          return;
        }

        // Papel de admin via public.user_roles (RLS-safe) — no Supabase externo.
        let isAdmin = false;
        try {
          const { data: adminRow } = await supabaseExternal
            .from('user_roles')
            .select('role')
            .eq('user_id', data.session.user.id)
            .eq('role', 'admin')
            .maybeSingle();
          isAdmin = !!adminRow;
        } catch { /* silencioso */ }

        // Determina o papel real do usuário, priorizando o que está gravado no perfil.
        const rawRole = (statusRow?.role || statusRow?.user_type || statusRow?.business_category || '').toString().toLowerCase();
        const role = isAdmin ? 'admin' : (rawRole || 'user');

        if (typeof window !== 'undefined') {
          localStorage.setItem('fixxer_user_id', data.session.user.id);
          localStorage.setItem('fixxer_user_email', normalizedEmail);
          localStorage.setItem('fixxer_authenticated', 'true');

          let category: 'admin' | 'lojista' | 'prestador' | 'fornecedor' | 'cliente' = 'lojista';
          if (isAdmin) category = 'admin';
          else if (rawRole.includes('prestador')) category = 'prestador';
          else if (rawRole.includes('parceiro') || rawRole.includes('fornecedor') || rawRole.includes('b2b')) category = 'fornecedor';
          else if (rawRole.includes('cliente') || rawRole.includes('casual') || rawRole.includes('final')) category = 'cliente';
          else if (rawRole.includes('lojista')) category = 'lojista';
          else category = 'lojista';

          // Persistimos o role já normalizado para a UI (badges, temas) usar direto.
          localStorage.setItem('fixxer_user_role', category);
          localStorage.setItem('fixxer_user_category', category);
          window.dispatchEvent(new Event('fixxer:category-change'));
          window.dispatchEvent(new Event('fixxer:role-changed'));

          if (isAdmin) {
            window.location.replace('/admin');
          } else if (category === 'cliente') window.location.replace('/dashboard/cliente');
          else if (category === 'prestador') window.location.replace('/dashboard/prestador');
          else if (category === 'fornecedor') window.location.replace('/dashboard/parceiro');
          else if (category === 'lojista') window.location.replace('/dashboard/lojista');
          else navigate({ to: '/cadastro' as any });
        }
      }
    } catch (err: any) {
      setErrorMsg("Falha ao se comunicar com o banco de dados.");
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Informe seu e-mail para recuperar a senha");
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabaseExternal.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      toast.success("E-mail de recuperação enviado!");
      setView("login");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar e-mail de recuperação");
    } finally {
      setResetLoading(false);
    }
  };

  if (view === "forgot-password") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm">
          <button 
            onClick={() => setView("login")}
            className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors mb-8 group"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-bold uppercase tracking-widest">Voltar ao login</span>
          </button>

          <div className="text-center mb-10">
            <KeyRound className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-extrabold text-white">Recuperar Senha</h1>
          </div>

          <div className="bg-card p-8 rounded-3xl border border-white/10 shadow-2xl">
            <form className="space-y-5" onSubmit={handleForgotPassword}>
              <div>
                <label className="block text-sm font-bold text-muted-foreground mb-2">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-white/10 text-white"
                />
              </div>
              <button 
                disabled={resetLoading}
                className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl shadow-[0_0_15px_rgba(0,255,135,0.2)] disabled:opacity-50"
              >
                Enviar Link
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl shadow-[0_0_20px_rgba(0,255,135,0.3)] text-primary-foreground font-black text-2xl mb-6">
            F
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Login</h1>
          <p className="text-muted-foreground mt-2">Acesse sua conta para continuar</p>
        </div>

        <div className="bg-card p-8 rounded-3xl border border-white/10 shadow-2xl">
          <div className="space-y-5">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold">
                {errorMsg}
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-muted-foreground mb-2">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
                className="w-full px-4 py-3 rounded-xl bg-background border border-white/10 text-white"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-muted-foreground">Senha</label>
                <button 
                  type="button"
                  onClick={() => setView("forgot-password")}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-white/10 text-white pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-4">
              <button 
                type="button"
                id="login-button-regular"
                disabled={loading}
                onClick={handleLogin}
                className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl shadow-[0_0_15px_rgba(0,255,135,0.2)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                Entrar
              </button>
            </div>

          </div>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-sm text-muted-foreground">
              Ainda não tem conta?{" "}
              <button 
                type="button" 
                onClick={() => navigate({ to: '/cadastro' as any })}
                className="text-[#00FF87] hover:underline cursor-pointer font-bold"
              >
                Cadastre-se
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
