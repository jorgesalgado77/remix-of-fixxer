import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCcw, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/auth/")({
  component: AuthLogin,
});

function AuthLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkBypass = () => {
      const hasBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
      const cat = localStorage.getItem('fixxer:last-category');
      
      if (hasBypass && cat) {
          const target = cat === 'admin' ? '/admin/infoprodutos' : `/feed/${cat}`;
          if (window.location.pathname.startsWith('/auth')) {
              console.warn("[Auth Page Audit] Ejeção Automática (Bypass Ativo):", {
                category: cat,
                target,
                uid: localStorage.getItem('fixxer:bypass-uid')
              });
              
              Object.keys(sessionStorage).forEach(key => {
                if (key.includes('tsr-') || key.includes('tanstack')) {
                  sessionStorage.removeItem(key);
                }
              });
              
              window.location.replace(window.location.origin + target);
          }
      }
    };

    checkBypass();
    const interval = setInterval(checkBypass, 100); 
    return () => clearInterval(interval);
  }, []);

  const handleLogin = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (loading) return;
    
    const emailVal = email.trim().toLowerCase();
    const passVal = password.trim();
    
    console.log("[Auth Audit] Tentativa de login iniciada:", { email: emailVal });

    if (!emailVal || !passVal) {
      toast.error("Preencha todos os campos.");
      return;
    }

    // Limpeza absoluta pré-login para evitar lixo de sessões anteriores
    localStorage.removeItem('fixxer:master-bypass');
    localStorage.removeItem('fixxer:bypass-uid');
    localStorage.removeItem('fixxer:last-category');
    if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
    }
    
    setLoading(true);

    const isMaster = emailVal === 'jorgericardosalgado@gmail.com';
    const isTest = emailVal === 'jorgecriare2021@gmail.com'; // Jorge Salgado é usuário PRESTADOR

    if ((isMaster || isTest) && passVal === '!jR06097') {
      const category = isMaster ? 'admin' : 'prestador';
      const target = isMaster ? '/admin/infoprodutos' : '/feed/prestador';
      
      console.warn("[Auth Audit] MASTER BYPASS IDENTIFICADO:", { 
        user: isMaster ? 'Admin Master' : 'Jorge Salgado',
        category,
        target
      });
      
      localStorage.setItem('fixxer:master-bypass', 'true');
      localStorage.setItem('fixxer:last-category', category);
      
      if (typeof sessionStorage !== 'undefined') {
        Object.keys(sessionStorage).forEach(key => {
          if (key.includes('tsr-') || key.includes('tanstack')) {
            sessionStorage.removeItem(key);
          }
        });
      }

      import("@/lib/supabaseExternal").then(({ supabaseExternal }) => {
        supabaseExternal
          .from("profiles")
          .select("id, display_name, avatar_url")
          .eq("display_name", isMaster ? 'Admin Master' : 'Jorge Salgado')
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) console.error("[Auth Audit] Erro ao buscar ID real:", error);
            if (data?.id) {
              console.warn("[Auth Audit] ID Real resolvido:", data.id);
              localStorage.setItem('fixxer:bypass-uid', data.id);
              // Forçar atualização do cache de identidade com dados reais do banco
              const cacheKey = "fixxer_identity_cache_v1.3";
              const stored = JSON.parse(localStorage.getItem(cacheKey) || "{}");
              if (stored[data.id]) {
                delete stored[data.id];
                localStorage.setItem(cacheKey, JSON.stringify(stored));
              }
              window.dispatchEvent(new Event("fixxer:identity-change"));
            }
          });
      }).catch(e => console.warn("[Auth Audit] Falha ao importar supabase:", e));
      
      toast.success('Acesso Master concedido');
      
      // Pequeno delay para garantir que o bypass-uid foi gravado
      setTimeout(() => {
        const fullTarget = window.location.origin + target;
        console.warn("[Auth Audit] Redirecionamento Brutal Final para:", fullTarget);
        window.location.replace(fullTarget);
      }, 150);
      return;
    }

    (async () => {
      try {
        const { supabaseExternal } = await import("@/lib/supabaseExternal");
        const { error, data } = await supabaseExternal.auth.signInWithPassword({ 
          email: emailVal, 
          password: passVal 
        });
        
        if (error) throw error;
        
        if (data.session) {
          const { data: profile } = await supabaseExternal
            .from("profiles")
            .select("role, user_type")
            .eq("id", data.session.user.id)
            .maybeSingle();
          
          const raw = (profile as any)?.role || (profile as any)?.user_type || "lojista";
          const cat = raw.toLowerCase().includes("prestador") ? "prestador" : 
                      raw.toLowerCase().includes("admin") ? "admin" : "lojista";
          
          localStorage.setItem('fixxer:last-category', cat);
          const target = cat === 'admin' ? '/admin/infoprodutos' : `/feed/${cat}`;
          
          if (typeof sessionStorage !== 'undefined') {
            Object.keys(sessionStorage).forEach(key => {
              if (key.includes('tsr-') || key.includes('tanstack')) {
                sessionStorage.removeItem(key);
              }
            });
          }
          
          setTimeout(() => {
            console.log("[Auth Audit] Login bem-sucedido, redirecionando para:", target);
            window.location.href = window.location.origin + target;
          }, 5);
        }
      } catch (err: any) {
        console.error("[Auth Audit] Falha na autenticação:", err);
        // Persistir campos em caso de erro (não resetar estado local)
        toast.error(err.message || "Credenciais inválidas");
        setLoading(false);
      }
    })();
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-black min-h-screen">
      <div className="w-full max-w-[400px] space-y-8">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-black text-2xl mx-auto">F</div>
          <h1 className="text-2xl font-black text-white uppercase mt-6 italic tracking-tighter">FIXXER <span className="text-primary">LOGIN</span></h1>
        </div>
        
        <div className="space-y-4">
          <input
            type="email"
            name="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e-mail"
            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-4 text-white font-bold outline-none focus:border-primary/50"
            autoComplete="username"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleLogin();
              }
            }}
          />
          <div className="relative group">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="senha"
              className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-4 text-white font-bold outline-none focus:border-primary/50 pr-12"
              autoComplete="current-password"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleLogin();
                }
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <button
            type="button"
            id="login-submit-btn"
            onClick={(e) => {
              if (e) {
                e.preventDefault();
                e.stopPropagation();
              }
              handleLogin();
            }}
            disabled={loading}
            className="w-full h-14 bg-primary text-black font-black rounded-2xl flex items-center justify-center gap-2 uppercase italic hover:scale-[1.02] transition-all"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><RefreshCcw className="w-4 h-4" /> Entrar</>}
          </button>
        </div>
      </div>
    </div>
  );
}