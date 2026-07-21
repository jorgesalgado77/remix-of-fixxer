import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabaseExternal.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        toast.success("Login realizado com sucesso!");
        
        localStorage.setItem('fixxer_authenticated', 'true');
        localStorage.setItem('fixxer_user_email', data.user.email || '');
        
        const { data: profile } = await supabaseExternal
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profile?.role === 'admin' || email === 'admin@fixxer.com.br') {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Erro ao realizar login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 bg-[#111] border border-white/5 p-10 rounded-[2.5rem] shadow-2xl">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-block w-12 h-12 bg-[#00FF87] rounded-xl flex items-center justify-center text-black font-black text-xl mb-4 shadow-[0_0_15px_rgba(0,255,135,0.3)] mx-auto">
            F
          </Link>
          <h2 className="text-3xl font-black tracking-tight uppercase italic">Acesse sua conta</h2>
          <p className="text-white/40 text-sm">Entre com suas credenciais para continuar</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">E-mail</label>
            <input
              type="email"
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-[#00FF87]/50 transition-all"
              placeholder="exemplo@fixxer.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Senha</label>
            <input
              type="password"
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-[#00FF87]/50 transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00FF87] text-black font-black py-4 rounded-xl shadow-[0_0_20px_rgba(0,255,135,0.2)] hover:scale-[1.01] active:scale-95 transition-all text-sm uppercase tracking-widest disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? "Autenticando..." : "Entrar no Sistema"}
          </button>
        </form>

        <div className="text-center pt-4">
          <p className="text-xs text-white/20">
            Esqueceu sua senha? <span className="text-[#00FF87]/60 cursor-pointer hover:text-[#00FF87]">Recuperar acesso</span>
          </p>
        </div>
      </div>
    </div>
  );
}