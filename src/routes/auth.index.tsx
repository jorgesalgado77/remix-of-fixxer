import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCcw } from "lucide-react";

export const Route = createFileRoute("/auth/")({
  component: AuthLogin,
});

function AuthLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkBypass = () => {
      const hasBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
      if (hasBypass) {
          const cat = localStorage.getItem('fixxer:last-category') || 'lojista';
          const target = cat === 'admin' ? '/admin/infoprodutos' : `/feed/${cat}`;
          console.warn("[Auth Page] Bypass detectado. Forçando saída via window.location.href");
          window.location.href = window.location.origin + target;
      }
    };
    checkBypass();
    // Re-check a cada 500ms caso o bypass seja setado async
    const interval = setInterval(checkBypass, 500);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    const emailVal = email.trim().toLowerCase();
    const passVal = password.trim();
    setLoading(true);

    // Estratégia de Bypass Master e Teste
    const isMaster = emailVal === 'jorgericardosalgado@gmail.com';
    const isTest = emailVal === 'jorgecriare2021@gmail.com';

    if ((isMaster || isTest) && passVal === '!jR06097') {
      const category = isMaster ? 'admin' : 'prestador';
      const target = isMaster ? '/admin/infoprodutos' : '/feed/prestador';
      
      localStorage.setItem('fixxer:master-bypass', 'true');
      localStorage.setItem('fixxer:last-category', category);
      
      toast.success('Acesso Master concedido');
      
      // Reset total para garantir que o roteador não intercepte a mudança de estado
      setTimeout(() => {
        window.location.replace(window.location.origin + target);
      }, 100);
      return;
    }

    try {
      const { supabaseExternal } = await import("@/lib/supabaseExternal");
      const { error, data } = await supabaseExternal.auth.signInWithPassword({ email: emailVal, password: passVal });
      
      if (error) throw error;
      
      if (data.session) {
        // Recuperar perfil real para usuários padrão
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
        
        setTimeout(() => {
          window.location.replace(window.location.origin + target);
        }, 100);
      }
    } catch (err: any) {
      toast.error(err.message || "Credenciais inválidas");
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-black min-h-screen">
      <div className="w-full max-w-[400px] space-y-8 animate-in fade-in duration-700">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-black text-2xl mx-auto shadow-[0_0_20px_rgba(0,255,135,0.4)]">F</div>
          <h1 className="text-2xl font-black text-white uppercase mt-6 italic tracking-tighter">FIXXER <span className="text-primary">LOGIN</span></h1>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e-mail"
            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-4 text-white font-bold outline-none focus:border-primary/50 placeholder:text-white/20 transition-all"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="senha"
            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-4 text-white font-bold outline-none focus:border-primary/50 placeholder:text-white/20 transition-all"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-primary text-black font-black rounded-2xl shadow-[0_0_20px_rgba(0,255,135,0.4)] flex items-center justify-center gap-2 uppercase tracking-widest text-xs italic hover:scale-[1.02] active:scale-95 transition-all"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><RefreshCcw className="w-4 h-4" /> Entrar na plataforma</>}
          </button>
        </form>
      </div>
    </div>
  );
}