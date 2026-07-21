import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    
    // Armazenamento local para simular sessão
    localStorage.setItem("fixxer_user_email", cleanEmail);
    localStorage.setItem("fixxer_authenticated", "true");

    // Lógica de redirecionamento baseada no e-mail (Admin Master fixo)
    if (cleanEmail === "jorgericardosalgado@gmail.com" || cleanEmail === "admin@fixxer.com.br") {
      localStorage.setItem("fixxer_user_role", "Admin");
      navigate("/admin");
    } else {
      localStorage.setItem("fixxer_user_role", "Lojista");
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 bg-[#111] border border-white/5 p-10 rounded-[2.5rem] shadow-2xl">
        <div className="text-center space-y-2">
          <div className="inline-block w-12 h-12 bg-[#00FF87] rounded-xl flex items-center justify-center text-black font-black text-xl mb-4 shadow-[0_0_15px_rgba(0,255,135,0.3)] mx-auto">
            F
          </div>
          <h2 className="text-3xl font-black tracking-tight uppercase italic">Acesse sua conta</h2>
          <p className="text-white/40 text-sm">Entre com suas credenciais para continuar</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@fixxer.com.br" 
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
      </div>
    </div>
  );
}
