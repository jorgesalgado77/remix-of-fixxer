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
  const [errorMsg, setErrorMsg] = useState('');
  const [view, setView] = useState<"login" | "forgot-password">("login");
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Verificação de conectividade ao carregar a tela de login
    const checkConnectivity = async () => {
      try {
        const { error } = await supabase.from('admin_config').select('id').limit(1);
        if (error) throw error;
        toast.success("Sistema conectado ao Supabase Cloud", {
          description: "Infraestrutura operacional.",
          duration: 3000,
        });
      } catch (err) {
        toast.error("Erro de conexão com o banco de dados", {
          description: "Verifique suas configurações de rede ou chaves de API.",
          duration: 5000,
        });
      }
    };
    
    checkConnectivity();

    // DESATIVADO PARA EVITAR LOOPS DE REDIRECIONAMENTO
    /*
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        window.location.href = "/_authenticated/dashboard";
      }
    };
    checkSession();
    */
  }, []);

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
    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Chamada de autenticação direta
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message || "Erro ao realizar login.");
        setLoading(false);
        return;
      }

      // 2. Se a sessão for retornada, força o redirecionamento direto por URL
      if (data?.session || data?.user) {
        localStorage.setItem('fixxer_user_email', email);

        if (email === 'jorgericardosalgado@gmail.com') {
          window.location.replace('/admin');
        } else {
          window.location.replace('/dashboard/lojista');
        }
      } else {
        setErrorMsg("Não foi possível validar a sessão do usuário.");
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Exceção no login:", err);
      setErrorMsg(err?.message || "Erro inesperado de comunicação.");
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
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Login</h1>
          <p className="text-muted-foreground mt-2">Acesse sua conta para continuar</p>

        <div id="ts-visual-edit-probe-faea4463318a44d5" className="hidden">
          {`DESEFEITO E RECONSTRUÇÃO DEFINITIVA DO FLUXO DE SUBMIT DO LOGIN

As chaves do Supabase já estão injetadas e o banco está operacional, porém ao clicar no botão "Entrar" com as credenciais corretas, o formulário não executa a navegação nem avança de tela.

Substitua e refatore integralmente a lógica do componente de Login e a tabela de rotas com a seguinte estrutura simplificada e direta:

### 1. REESCRITA DO COMPONENTE DE LOGIN (Login.tsx / Auth.tsx)
- Certifique-se de que a tag <form> possua o handler onSubmit={handleLogin} e que o botão "Entrar" seja do tipo type="submit".
- Substitua a função handleLogin pelo seguinte bloco à prova de falhas:

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Chamada de autenticação direta
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message || "Erro ao realizar login.");
        setLoading(false);
        return;
      }

      // 2. Se a sessão for retornada, força o redirecionamento direto por URL
      if (data?.session || data?.user) {
        localStorage.setItem('fixxer_user_email', email);

        if (email === 'jorgericardosalgado@gmail.com') {
          window.location.replace('/admin');
        } else {
          window.location.replace('/dashboard/lojista');
        }
      } else {
        setErrorMsg("Não foi possível validar a sessão do usuário.");
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Exceção no login:", err);
      setErrorMsg(err?.message || "Erro inesperado de comunicação.");
      setLoading(false);
    }
  };

  return (
    // Garanta que o botão exiba estado visual "Entrando..." quando loading = true
    // e que a mensagem de erro (errorMsg) apareça em texto vermelho caso aconteça algo.
  );
};`}
        </div>
        <div id="ts-visual-edit-probe-2dc08690fee849ec" className="hidden">
          {`INJEÇÃO DIRETA DE CREDENCIAIS DO SUPABASE NO CLIENTE E FIX DE CONEXÃO

Preciso garantir a conexão imediata do FIXXER com o meu projeto do Supabase sem depender unicamente de variáveis de ambiente do preview.

Reescreva o arquivo do cliente Supabase (src/integrations/supabase/client.ts ou src/lib/supabase.ts) definindo as credenciais diretamente no código com os seguintes dados:

### 1. DADOS DE CONEXÃO FIXOS (HARDCODED FALLBACK)
Configure as constantes de conexão com estes valores exatos:
- SUPABASE_URL: "https://rnhgpxembtgupxnrohxo.supabase.co"
- SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuaGdweGVtYnRndXB4bnJvaHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NTk3NjQsImV4cCI6MjEwMDEzNTc2NH0.qqZxpJKYzuK48EawEDMamXA2Cy2YVOB0RV0-CgsSwMA"

### 2. CÓDIGO DO CLIENTE SUPABASE
Certifique-se de que a inicialização do cliente esteja estruturada assim:

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://rnhgpxembtgupxnrohxo.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuaGdweGVtYnRndXB4bnJvaHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NTk3NjQsImV4cCI6MjEwMDEzNTc2NH0.qqZxpJKYzuK48EawEDMamXA2Cy2YVOB0RV0-CgsSwMA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});`}
        </div>
        <div id="ts-visual-edit-probe-f1dc2eaa215a4f53" className="hidden">
          Adicione toasts/notifications claros no Painel Admin e no fluxo de login para informar quando a conexão com o Supabase estiver ativa ou inativa.
        </div>
        <div id="ts-visual-edit-probe-c8dc31aafde64dfd" className="hidden">
          {`CONFIGURAÇÃO E MAPEAMENTO COMPLETO DAS CHAVES DA API DO SUPABASE EXTERNO

Preciso garantir a conexão e autenticação perfeita do FIXXER com o banco de dados Supabase. Mapeie e configure o cliente de integração do Supabase (src/integrations/supabase/client.ts ou equivalente) com tratamento rigoroso de variáveis de ambiente.

Siga exatamente estas etapas de configuração:

### 1. MAPEAMENTO DE VARIÁVEIS DE AMBIENTE (.env e .env.example)

Crie/atualize o arquivo .env na raiz do projeto contendo a estrutura abaixo para armazenar as chaves de conexão:

- VITE_SUPABASE_URL: URL do projeto no Supabase (ex: https://xxx.supabase.co)

- VITE_SUPABASE_ANON_KEY: Chave anônima (public anon key) do Supabase

### 2. REFATORAÇÃO DO CLIENTE SUPABASE (src/integrations/supabase/client.ts)

Reescreva a inicialização do cliente Supabase para garantir que a aplicação nunca quebre com erro 500 ou objetos vazios {} caso alguma chave falhe na leitura:

- Adicione verificação prévia das variáveis import.meta.env.VITE_SUPABASE_URL e import.meta.env.VITE_SUPABASE_ANON_KEY.

- Se as variáveis não estiverem definidas, exiba um log amigável e legível no console: [FIXXER Supabase Error]: Chaves de API do Supabase não encontradas no arquivo .env.

- Adicione tratamento para que as requisições de Autenticação, SELECT, INSERT e UPDATE utilizem persistence no localStorage por padrão (auth: { persistSession: true, autoRefreshToken: true }).

### 3. INTERFACE DE DESTAQUE NO PAINEL ADMIN PARA GERENCIAMENTO DE CHAVES

No Painel Administrativo (/admin), crie a aba "Configurações do Sistema / Integrações":

- Adicione um formulário visual em Glassmorphism Dark Metal com detalhes em Verde Esmeralda Neon (#00FF87) permitindo ao administrador visualizar o status da conexão do Supabase (Ativo/Inativo), testar a conectividade e visualizar as chaves configuradas.

### 4. INSTRUÇÕES PARA O USUÁRIO

Ao concluir a implementação, forneça a lista exata donde devo inserir minhas chaves reais no painel do Lovable (ex: na aba Project Settings -> Secrets / Environment Variables).

Execute essa reestruturação do cliente Supabase agora.`}
        </div>
      </div>

        <div className="bg-card backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl">
          <form className="space-y-5" onSubmit={handleLogin}>
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-300">
                {errorMsg}
              </div>
            )}
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