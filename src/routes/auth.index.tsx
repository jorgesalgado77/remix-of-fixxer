import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, LogIn, Loader2, KeyRound, ArrowLeft, Terminal, Eye, EyeOff, AlertTriangle, CheckCircle2, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/")({
  component: LoginComponent,
});


function LoginComponent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"login" | "forgot-password">("login");
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const logAccess = async (data: { event_type: string, status: string, reason?: string, metadata?: any, email?: string, user_id?: string }) => {
    try {
      await supabase.from('access_logs').insert([{
        ...data,
        metadata: { ...data.metadata, agent: navigator.userAgent }
      }]);
    } catch (e) {
      console.error("Erro ao gravar log de acesso:", e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      
      if (error) {
        toast.error(`Erro no login: ${error.message}`);
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Força o redirecionamento imediato para a dashboard via location.href
        // conforme instrução para garantir o avanço do sistema
        window.location.href = "/_authenticated/dashboard";
      }
    } catch (error: any) {
      console.error("Erro inesperado:", error);
      setLoading(false);
      toast.error(error.message || "Erro inesperado ao realizar login");
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      toast.success("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
      setView("login");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar e-mail de recuperação");
    } finally {
      setResetLoading(false);
    }
  };

  if (view === "forgot-password") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background animate-in fade-in duration-500">
        <div className="w-full max-w-sm">
          <button 
            onClick={() => setView("login")}
            className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors mb-8 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold uppercase tracking-widest">Voltar ao login</span>
          </button>

          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl text-primary mb-6">
              <KeyRound className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Recuperar Senha</h1>
            <p className="text-muted-foreground mt-2">Enviaremos um link de acesso para o seu e-mail</p>
          </div>

          <div className="bg-card backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl">
            <form className="space-y-5" onSubmit={handleForgotPassword}>
              <div>
                <label className="block text-sm font-bold text-muted-foreground mb-2">Seu E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-white/10 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground/30 text-white"
                />
              </div>

              <button 
                disabled={resetLoading}
                className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl shadow-[0_0_15px_rgba(0,255,135,0.2)] active:scale-[0.98] hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Enviar Link de Recuperação
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background animate-in fade-in duration-500">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl shadow-[0_0_20px_rgba(0,255,135,0.3)] text-primary-foreground font-black text-2xl mb-6">
            F
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Login</h1>
          <p className="text-muted-foreground mt-2">Acesse sua conta para continuar</p>

        <div id="ts-visual-edit-probe-a8a3e28643e048ae" className="hidden">
          CORREÇÃO CRÍTICA: BOTÃO DE LOGIN NÃO REDIRECIONA / DESTRANCAMENTO DE ROTAS

          O login no Supabase ocorre com sucesso, mas ao clicar em "Entrar" o sistema não avança nem muda de tela. Isso ocorre devido a um bloqueio no `ProtectedRoute` ou à ausência da rota declarada no roteador. 

          Corrija o fluxo de rotas e o evento de login aplicando EXATAMENTE estas 3 alterações:

          1. DECLARAÇÃO E LIBERAÇÃO DAS ROTAS (`App.tsx`):
          - Certifique-se de que a rota `/dashboard` existe e está devidamente mapeada para o componente da Dashboard.
          - Para testes de desenvolvimento, DESATIVE temporariamente qualquer trava de verificação no componente `ProtectedRoute` que esteja redirecionando de volta para o login. Permita que a rota `/dashboard` seja acessível diretamente pós-login.

          2. EVENTO DE SUBMIT NO FORMULÁRIO DE LOGIN (`Login.tsx`):
          - Adicione um estado de carregamento visual (`loading`) no botão "Entrar" (ex: texto "Acessando..." com spinner esmeralda) para que o usuário saiba que o clique foi registrado.
          - Trate o evento de login com o seguinte fluxo direto.
        </div>
      </div>

        <div className="bg-card backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl">
          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-bold text-muted-foreground mb-2">E-mail</label>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
                className="w-full px-4 py-3 rounded-xl bg-background border border-white/10 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground/30 text-white"
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
            <div className="relative group/pass">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-background border border-white/10 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground/30 text-white pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-primary transition-colors"
                title={showPassword ? "Esconder senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl shadow-[0_0_15px_rgba(0,255,135,0.2)] active:scale-[0.98] hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Acessando...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Entrar</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-sm text-muted-foreground">
              Ainda não tem conta?{" "}
              <Link to="/auth/register" className="text-primary font-bold hover:underline">
                Cadastre-se
              </Link>
            </p>
          </div>
          <div className="mt-4 text-[10px] text-muted-foreground/20 font-mono flex items-center justify-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
            <Terminal className="w-2 h-2" />
            <span>EXTERNAL_DB_ACTIVE: YES</span>
          </div>
        </div>
      </div>
    </div>
  );
}