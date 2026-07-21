import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const isAuth = localStorage.getItem("fixxer_authenticated") === "true";
    if (isAuth) {
      const role = localStorage.getItem("fixxer_user_role");
      if (role === "Admin") navigate("/admin");
      else navigate("/dashboard");
    }
  }, [navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    localStorage.setItem("fixxer_user_email", cleanEmail);
    localStorage.setItem("fixxer_authenticated", "true");

    if (cleanEmail === "jorgericardosalgado@gmail.com") {
      localStorage.setItem("fixxer_user_role", "Admin");
      navigate("/admin");
    } else {
      localStorage.setItem("fixxer_user_role", "Lojista");
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col items-center justify-center p-6 w-full">
      <div className="max-w-md w-full space-y-8 bg-[#111] border border-white/5 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#00FF87]/10 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="text-center space-y-2 relative z-10">
          <div className="inline-block w-12 h-12 bg-[#00FF87] rounded-xl flex items-center justify-center text-black font-black text-xl mb-4 shadow-[0_0_15px_rgba(0,255,135,0.3)] mx-auto">
            F
          </div>
          <h2 className="text-3xl font-black tracking-tight uppercase italic text-white">Acesse sua conta</h2>
          <p className="text-white/40 text-sm">Entre com suas credenciais para continuar</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jorgericardosalgado@gmail.com" 
              className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-[#00FF87] transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-[#00FF87] transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#00FF87] hover:bg-[#00e67a] text-black font-black py-4 rounded-xl shadow-[0_0_20px_rgba(0,255,135,0.2)] flex items-center justify-center gap-2 group transition-all text-sm uppercase tracking-widest active:scale-95"
          >
            Entrar no Sistema
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="pt-4 text-center relative z-10">
          <div className="flex items-center justify-center gap-2 text-[10px] text-white/20 uppercase tracking-[0.2em]">
            <ShieldCheck className="w-3 h-3 text-[#00FF87]/40" />
            Conexão Segura FIXXER
          </div>
        </div>
      </div>
    </div>
  );
}
