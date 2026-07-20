import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, LogIn, Loader2, KeyRound, ArrowLeft, Terminal } from "lucide-react";
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
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("CLIQUE NO LOGIN DETECTADO");
    
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);
    try {
      console.log("Tentando signInWithPassword para:", email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      console.log("Resultado Auth:", { data, error });

      if (error) {
        console.error("Erro de autenticação Supabase:", error);
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("E-mail ou senha incorretos. Verifique suas credenciais.");
        }
        throw error;
      }

      if (!data.user) {
        throw new Error("Usuário não encontrado após autenticação.");
      }

      // Buscar perfil para redirecionamento inteligente
      console.log("Buscando perfil na tabela public.profiles...");
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle(); // Usar maybeSingle para evitar erro se não existir
      
      console.log("Resultado da busca de perfil:", { profile, profileError });

      if (profileError) {
        console.error("Erro ao buscar perfil:", profileError);
        // Fallback: se não tiver perfil mas autenticou, manda para dashboard
        toast.success("Login realizado! Redirecionando...");
        navigate({ to: "/dashboard" });
        return;
      }

      if (!profile) {
        console.warn("Perfil não encontrado. Verifique se o trigger handle_new_user funcionou.");
        toast.success("Login realizado! Perfil básico em criação...");
        navigate({ to: "/dashboard" });
        return;
      }

      toast.success("Bem-vindo ao FIXXER!");
      
      if (profile?.role === 'admin') {
        navigate({ to: "/admin" });
      } else {
        navigate({ to: "/dashboard" });
      }
    } catch (error: any) {
      console.error("Erro no fluxo de login:", error);
      toast.error(error.message || "Erro ao realizar login. Tente novamente.");
    } finally {
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
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Bem-vindo de volta</h1>
          <p className="text-muted-foreground mt-2">Acesse sua conta FIXXER</p>
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
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-background border border-white/10 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground/30 text-white"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl shadow-[0_0_15px_rgba(0,255,135,0.2)] active:scale-[0.98] hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              Entrar
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
            <span>EXTERNAL_DB_ACTIVE: {supabase.auth.onAuthStateChange ? "YES" : "NO"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}