import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, LogIn, Loader2, KeyRound, ArrowLeft, Terminal, Eye, EyeOff, AlertTriangle, CheckCircle2, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/")({
  component: LoginComponent,
});

type DiagnosticStep = {
  label: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  detail?: string;
};

function LoginComponent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"login" | "forgot-password" | "diagnostic">("login");
  const [resetLoading, setResetLoading] = useState(false);
  const [diagnosticSteps, setDiagnosticSteps] = useState<DiagnosticStep[]>([]);
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
    
    // Configura o diagnóstico mas não bloqueia se for bem sucedido
    const steps: DiagnosticStep[] = [
      { label: "Conectividade Supabase", status: 'loading' },
      { label: "Autenticação de Usuário", status: 'pending' },
      { label: "Sincronização de Perfil", status: 'pending' },
      { label: "Redirecionamento Seguro", status: 'pending' },
    ];
    setDiagnosticSteps([...steps]);

    const performAuthWithRetry = async (retries = 3, delay = 1000): Promise<any> => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        
        if (error) {
          // Tratamento explícito de erros Supabase
          if (error.message?.includes("Email not confirmed")) {
            throw new Error("Por favor, confirme seu e-mail para acessar.");
          }
          if (error.status === 400 || error.message?.includes("Invalid login credentials")) {
            throw new Error("E-mail ou senha inválidos.");
          }
          throw error;
        }
        return data;
      } catch (err: any) {
        const isRetryable = err.status === 500 || err.name === "AuthRetryableFetchError" || err.message?.includes("fetch");
        if (retries > 0 && isRetryable) {
          console.warn(`Erro 500/Rede detectado. Tentando novamente em ${delay}ms... (${retries} restantes)`);
          await new Promise(res => setTimeout(res, delay));
          return performAuthWithRetry(retries - 1, delay * 1.5);
        }
        throw err;
      }
    };

    try {
      // Passo 1: Conectividade
      try {
        const { error: healthError } = await supabase.from('brand_flags').select('count', { count: 'exact', head: true });
        if (healthError && 'code' in healthError && healthError.code !== 'PGRST301' && healthError.code !== '42501') {
           throw healthError;
        }
      } catch (connErr) {
        setView("diagnostic");
        steps[0].status = 'error';
        steps[0].detail = "Falha de conexão com o Supabase externo. Verifique sua URL/Key ou rede.";
        setDiagnosticSteps([...steps]);
        throw connErr;
      }
      
      steps[0].status = 'success';
      steps[1].status = 'loading';
      setDiagnosticSteps([...steps]);

      // Passo 2: Auth
      const authPromise = performAuthWithRetry();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout na autenticação")), 15000));
      
      const authData = await Promise.race([authPromise, timeoutPromise]) as any;
      const user = authData.user;
      
      steps[1].status = 'success';
      steps[2].status = 'loading';
      setDiagnosticSteps([...steps]);

      // Passo 3: Perfil (Redução de latência: busca imediata e upsert automático)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, plan_id')
        .eq('id', user.id)
        .maybeSingle();

      let finalRole = profile?.role;

      if (!profile) {
        console.log("Perfil não encontrado. Criando perfil básico (upsert)...");
        // Fallback: tenta criar o perfil se não existir para evitar travamento
        const { data: newProfile, error: upsertError } = await supabase
          .from('profiles')
          .upsert({ 
            id: user.id, 
            email: user.email,
            role: 'lojista' // Default role
          })
          .select('role')
          .single();
        
        if (upsertError) {
          setView("diagnostic");
          steps[2].status = 'error';
          steps[2].detail = "Erro ao criar perfil. Verifique as permissões da tabela 'profiles'.";
          setDiagnosticSteps([...steps]);
          throw upsertError;
        }
        finalRole = newProfile.role;
      }

      steps[2].status = 'success';
      steps[3].status = 'loading';
      setDiagnosticSteps([...steps]);

      await logAccess({ 
        event_type: 'login_attempt', 
        status: 'success', 
        user_id: user.id,
        email: email.trim(),
        metadata: { role: finalRole, method: 'secured_flow' }
      });

      steps[3].status = 'success';
      setDiagnosticSteps([...steps]);

      // Redirecionamento instantâneo se tudo estiver OK
      const target = finalRole === 'admin' ? "/admin" : "/dashboard";
      window.location.href = target;

    } catch (error: any) {
      setLoading(false);
      // Converte qualquer objeto de erro para string legível
      const errorMsg = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
      
      if (!steps.some(s => s.status === 'error')) {
        setView("diagnostic");
        steps[1].status = 'error';
        steps[1].detail = errorMsg === "{}" ? "Erro interno de autenticação (objeto vazio)." : errorMsg;
        setDiagnosticSteps([...steps]);
      }
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

  if (view === "diagnostic") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background animate-in zoom-in-95 duration-300">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl text-primary mb-4 animate-pulse">
              <Search className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Diagnóstico de Acesso</h1>
            <p className="text-muted-foreground text-sm">Validando permissões e integridade do banco...</p>
          </div>

          <div className="bg-card backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-2xl space-y-4">
            {diagnosticSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                <div className="mt-0.5">
                  {step.status === 'loading' && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
                  {step.status === 'success' && <CheckCircle2 className="w-5 h-5 text-primary" />}
                  {step.status === 'error' && <AlertTriangle className="w-5 h-5 text-red-500" />}
                  {step.status === 'pending' && <div className="w-5 h-5 rounded-full border-2 border-white/10" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${step.status === 'error' ? 'text-red-400' : 'text-white'}`}>
                    {step.label}
                  </p>
                  {step.detail && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono leading-relaxed">
                      {step.detail}
                    </p>
                  )}
                </div>
              </div>
            ))}
            
            {diagnosticSteps.some(s => s.status === 'error') && (
              <div className="space-y-3">
                <button 
                  onClick={() => setView("login")}
                  className="w-full mt-4 bg-primary text-primary-foreground font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  Tentar novamente
                </button>
                {diagnosticSteps[0].status === 'error' && (
                  <Link
                    to="/auth/register"
                    search={{ email }}
                    className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    Primeiro Acesso? Cadastre-se aqui
                  </Link>
                )}
              </div>
            )}
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

        <div id="ts-visual-edit-probe-92cad893586e4871" className="hidden">
          CORREÇÃO CRÍTICA DE AUTENTICAÇÃO E DIAGNÓSTICO DE ACESSO:
          O fluxo de login está travando na etapa "Autenticação de Usuário" retornando um objeto de erro vazio `{}`. Refatore o código do diagnóstico e da autenticação imediatamente com as seguintes regras:
          1. TRATAMENTO DE ERROS DE AUTH (SUPABASE):
          - O método `supabase.auth.signInWithPassword()` deve tratar explicitamente os cenários de retorno:
          * Se o erro for "Email not confirmed", exiba uma mensagem amigável: "Por favor, confirme seu e-mail para acessar."
          * Se as credenciais estiverem incorretas, exiba: "E-mail ou senha inválidos."
          * Trate qualquer erro extra garantindo que `error.message` seja convertido para texto visível, e nunca exiba `{}` no diagnóstico.
          2. FLUXO DE LOGIN E REDIRECIONAMENTO DIRETO:
          - Quando o usuário fizer login com sucesso no formulário de login, obtenha a sessão ativa imediatamente (`supabase.auth.getSession()`).
          - Busque o perfil do usuário na tabela `profiles` pelo `id` do usuário logado.
          - Se a sessão e o perfil forem válidos, redirecione DIRETO para a Dashboard correspondente (Lojista, Prestador ou Parceiro) com base no campo `user_type` cadastrado no perfil.
          - Se o perfil não existir na tabela `profiles`, execute um upsert/fallback automático criando o perfil básico com o `user_type` correspondente antes de redirecionar, evitando travamento na sincronização.
          3. REMOÇÃO DE TELAS DE DIAGNÓSTICO INTERMEDIÁRIAS DESNECESSÁRIAS:
          - A tela "Diagnóstico de Acesso" não deve travar o fluxo do usuário final. Se os dados forem válidos, o login deve levar o usuário instantaneamente para a aplicação sem telas intermediárias lentas, mantendo o foco em carregamento instantâneo para mobile (conforme as Regras de Ouro).
          Refatore esta rotina de autenticação e teste o login novamente.
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
            <span>EXTERNAL_DB_ACTIVE: YES</span>
          </div>
        </div>
      </div>
    </div>
  );
}