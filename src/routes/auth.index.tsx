import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/")({
  component: AuthLogin,
});

function AuthLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
      
      localStorage.setItem('fixxer:master-bypass', 'true');
      localStorage.setItem('fixxer:last-category', isMaster ? 'admin' : 'prestador');
      
      toast.success('Acesso concedido');
      
      // FORÇAR SAÍDA DA PÁGINA
      window.location.href = window.location.origin + target;
      return;
    }

    // Fallback real Supabase
    try {
      const { supabaseExternal } = await import("@/lib/supabaseExternal");
      const { error, data } = await supabaseExternal.auth.signInWithPassword({ email: emailVal, password: passVal });
      if (error) throw error;
      if (data.session) {
        window.location.href = window.location.origin + "/feed";
      }
    } catch (err: any) {
      toast.error(err.message || "Erro no login");
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-black min-h-screen">
      <div className="w-full max-w-[400px] space-y-8">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-black text-2xl mx-auto">F</div>
          <h1 className="text-2xl font-black text-white uppercase mt-6 tracking-tighter italic">Login <span className="text-primary">FIXXER</span></h1>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-4 text-white font-bold outline-none focus:border-primary/50"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-4 text-white font-bold outline-none focus:border-primary/50"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-primary text-black font-black rounded-2xl shadow-[0_0_20px_rgba(0,255,135,0.4)] flex items-center justify-center gap-2 uppercase tracking-widest text-xs italic"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar na Plataforma"}
          </button>
        </form>
      </div>
    </div>
  );
}