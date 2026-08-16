import { createFileRoute, useNavigate, useLocation } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { toast } from "sonner";
import { Mail, Lock, Loader2, ShieldAlert } from "lucide-react";
import { clearCurrentUserCache } from "@/lib/current-user";

export const Route = createFileRoute("/auth/")({
  component: AuthLogin,
});

function AuthLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirecionamento instantâneo se já houver bypass ou sessão detectada via layout
  useEffect(() => {
    const hasBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
    if (hasBypass) {
        console.warn("[Auth Page] Bypass ativo. Executando saída.");
        const cat = localStorage.getItem('fixxer:last-category') || 'lojista';
        const target = cat === 'admin' ? '/admin/infoprodutos' : `/feed/${cat}`;
        window.location.replace(window.location.origin + target);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    const emailVal = email.trim().toLowerCase();
    const passVal = password.trim();

    if (!emailVal || !passVal) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);
    console.log("[Auth] handleLogin disparado para", emailVal);

    try {
      const isMaster = emailVal === 'jorgericardosalgado@gmail.com';
      const isProviderTest = emailVal === 'jorgecriare2021@gmail.com';
      
      // Bypass Hardened para Master
      if ((isMaster || isProviderTest) && passVal === '!jR06097') {
         console.warn("[Auth] Bypass Master ativado.");
         const target = isMaster ? '/admin/infoprodutos' : '/feed/prestador';
         
         localStorage.setItem('fixxer:master-bypass', 'true');
         localStorage.setItem('fixxer:last-category', isMaster ? 'admin' : 'prestador');
         if (isMaster) localStorage.setItem('fixxer:master-identity', 'true');
         
         toast.success('Acesso Master Concedido');
         
         // Força a saída usando o origin completo para evitar que o TanStack intercepte e cause loop
         window.location.href = window.location.origin + target;
         return;
      }

      const { data, error } = await supabaseExternal.auth.signInWithPassword({
        email: emailVal,
        password: passVal,
      });

      if (error) throw error;

      if (data?.session) {
        toast.success("Login realizado com sucesso");
        // Deixa o layout _authenticated lidar com o destino com base no perfil
        window.location.reload();
      }
    } catch (err: any) {
      console.error("[Auth Error]", err);
      toast.error(err.message || "Erro ao realizar login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-black">
      <div className="w-full max-w-[400px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <div 
            onClick={() => navigate({ to: "/" })}
            className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-black text-2xl shadow-[0_0_20px_rgba(0,255,135,0.4)] mx-auto cursor-pointer hover:scale-110 transition-transform"
          >
            F
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-white uppercase mt-6">Bem-vindo de volta</h1>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">
            Acesse sua conta FIXXER
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">E-mail</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-bold placeholder:text-white/20"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Senha</label>
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-bold placeholder:text-white/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-primary text-primary-foreground font-black rounded-2xl shadow-[0_0_20px_rgba(0,255,135,0.3)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-3 mt-4"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Entrar na conta"
            )}
          </button>
        </form>

        <div className="text-center">
           <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">
            Não tem uma conta?{" "}
            <span 
              onClick={() => navigate({ to: "/cadastro" as any })}
              className="text-primary hover:underline cursor-pointer"
            >
              Cadastre-se aqui
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}