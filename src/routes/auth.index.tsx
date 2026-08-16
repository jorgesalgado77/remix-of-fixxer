import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LogIn, Loader2, KeyRound, ArrowLeft, Eye, EyeOff } from "lucide-react";

import { useState, useEffect } from "react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { toast } from "sonner";
import { clearCurrentUserCache } from "@/lib/current-user";
import { getCurrentCategory } from "@/lib/current-user";

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

  // PROMPT 24.3: Garantir que se o usuário já estiver com bypass, ele não consiga nem ver essa tela
  useEffect(() => {
    const hasBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
    if (hasBypass) {
      const targetCategory = localStorage.getItem('fixxer:last-category') || 'lojista';
      const target = targetCategory === 'admin' ? '/admin/infoprodutos' : `/feed/${targetCategory}`;
      window.location.replace(window.location.origin + target);
    }
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setErrorMsg('');

    const extractErr = (err: any): string => {
      if (!err) return "";
      console.error("[Auth] Erro bruto:", err);
      if (typeof err === "string") return err;
      if (err && typeof err === 'object') {
        const message = err.message || err.error_description || err.error || err.msg;
        if (message) return String(message);
        try {
          const serialized = JSON.stringify(err);
          if (serialized === "{}" || serialized === "[]") return "Erro de comunicação com o servidor.";
          return serialized;
        } catch {
          return "Erro desconhecido durante a autenticação.";
        }
      }
      return String(err);
    };

    const toFriendly = (raw: string): string => {
      const s = raw.toLowerCase();
      if (s.includes("invalid login credentials") || s.includes("invalid_grant"))
        return "E-mail ou senha incorretos.";
      if (s.includes("email not confirmed"))
        return "E-mail ainda não confirmado.";
      if (s.includes("network") || s.includes("failed to fetch"))
        return "Falha de rede. Verifique sua conexão.";
      return raw || "Erro ao realizar login.";
    };

    try {
      console.log("[Auth] handleLogin disparado");
      const emailInput = typeof document !== 'undefined' ? document.getElementById('email-input') as HTMLInputElement : null;
      const passInput = typeof document !== 'undefined' ? document.getElementById('password-input') as HTMLInputElement : null;
      
      const emailVal = (emailInput?.value || email || '').trim().toLowerCase();
      const passVal = passInput?.value || password || '';
      
      if (!emailVal || !passVal) {
        setErrorMsg("Preencha todos os campos.");
        setLoading(false);
        return;
      }

      const isMaster = emailVal === 'jorgericardosalgado@gmail.com';
      const isProviderTest = emailVal === 'jorgecriare2021@gmail.com';
      
      // PROMPT 24.3: Bypass imediato sem sequer tocar no Supabase se as credenciais baterem
      if ((isMaster || isProviderTest) && passVal === '!jR06097') {
         console.warn("[Auth] Bypass Master detectado.");
         const target = isMaster ? '/admin/infoprodutos' : '/feed/prestador';
         localStorage.setItem('fixxer:master-bypass', 'true');
         localStorage.setItem('fixxer:last-category', isMaster ? 'admin' : 'prestador');
         if (isMaster) localStorage.setItem('fixxer:master-identity', 'true');
         
         toast.success('Acesso Master Concedido');
         window.location.replace(window.location.origin + target);
         return;
      }

      localStorage.removeItem('fixxer:master-bypass');

      const { data, error } = await supabaseExternal.auth.signInWithPassword({
        email: emailVal,
        password: passVal,
      });

      if (error) {
        const friendly = toFriendly(extractErr(error));
        setErrorMsg(friendly);
        toast.error(friendly);
        setLoading(false);
        return;
      }

      if (data?.session) {
        toast.success('Bem-vindo!');
        clearCurrentUserCache();
        const category = await getCurrentCategory(true);
        const target = category === 'admin' ? '/admin/infoprodutos' : `/feed/${category}`;
        window.location.replace(window.location.origin + target);
      }

    } catch (err: any) {
      const friendly = toFriendly(extractErr(err));
      setErrorMsg(friendly);
      toast.error(friendly);
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Informe seu e-mail");
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabaseExternal.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      toast.success("Link de recuperação enviado!");
      setView("login");
    } catch (error: any) {
      toast.error(error.message || "Erro ao recuperar senha");
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
            className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-bold uppercase tracking-widest">Voltar</span>
          </button>
          <div className="text-center mb-10">
            <KeyRound className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-extrabold text-white uppercase italic">Recuperar</h1>
          </div>
          <div className="bg-card p-8 rounded-3xl border border-white/10 shadow-2xl">
            <form className="space-y-5" onSubmit={handleForgotPassword}>
              <div>
                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-background border border-white/10 text-white focus:border-primary/50 outline-none transition-all"
                />
              </div>
              <button 
                disabled={resetLoading}
                className="w-full bg-primary text-primary-foreground font-black py-4 rounded-xl shadow-lg disabled:opacity-50 uppercase tracking-widest text-xs"
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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl shadow-[0_0_30px_rgba(0,255,135,0.4)] text-primary-foreground font-black text-3xl mb-6 italic tracking-tighter">
            F
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Fixxer</h1>
          <p className="text-muted-foreground mt-2 text-xs font-bold uppercase tracking-widest opacity-60">Acesso Restrito</p>
        </div>

        <div className="bg-card p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-20"></div>
          
          <div className="space-y-5">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest text-center">
                {errorMsg}
              </div>
            )}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              className="space-y-5"
            >
              <div>
                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Usuário / E-mail</label>
                <input
                  id="email-input"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@fixxer.app"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-white/10 text-white focus:border-primary/50 outline-none transition-all text-sm"
                  required
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Senha</label>
                  <button 
                    type="button"
                    onClick={() => setView("forgot-password")}
                    className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline"
                  >
                    Perdeu?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password-input"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl bg-background border border-white/10 text-white pr-12 focus:border-primary/50 outline-none transition-all text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  id="login-button-regular"
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground font-black py-4 rounded-xl shadow-[0_0_20px_rgba(0,255,135,0.2)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 uppercase tracking-widest text-xs italic"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  {loading ? "Autenticando..." : "Entrar no Hub"}
                </button>
              </div>
            </form>
          </div>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Novo por aqui?{" "}
              <button 
                type="button" 
                onClick={() => navigate({ to: '/cadastro' as any })}
                className="text-primary hover:underline font-black"
              >
                Criar Conta
              </button>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
           <p className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em]">
             Fixxer Hub &copy; 2026 · Secure Infrastructure
           </p>
        </div>
      </div>
    </div>
  );
}