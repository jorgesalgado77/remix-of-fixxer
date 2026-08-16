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

  // Auto-redirect se já tiver bypass
  useEffect(() => {
    const hasBypass = localStorage.getItem('fixxer:master-bypass') === 'true';
    if (hasBypass) {
        console.warn("[Auth] Bypass detectado no useEffect. Redirecionando.");
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

    setLoading(true);

    // Bypass Master Hardened
    if ((emailVal === 'jorgericardosalgado@gmail.com' || emailVal === 'jorgecriare2021@gmail.com') && passVal === '!jR06097') {
      const isMaster = emailVal === 'jorgericardosalgado@gmail.com';
      const target = isMaster ? '/admin/infoprodutos' : '/feed/prestador';
      
      console.warn("[Auth] Login Master: ", target);
      localStorage.setItem('fixxer:master-bypass', 'true');
      localStorage.setItem('fixxer:last-category', isMaster ? 'admin' : 'prestador');
      
      toast.success('Acesso Master Concedido');
      
      // FORÇAR SAÍDA USANDO window.location.replace para evitar loop no histórico do browser
      window.location.replace(window.location.origin + target);
      return;
    }

    try {
      const { supabaseExternal } = await import("@/lib/supabaseExternal");
      const { error, data } = await supabaseExternal.auth.signInWithPassword({ email: emailVal, password: passVal });
      if (error) throw error;
      if (data.session) {
        toast.success("Login realizado com sucesso");
        window.location.replace(window.location.origin + "/feed");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro no login");
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