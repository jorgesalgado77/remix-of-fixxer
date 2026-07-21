import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
    <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col items-center justify-center p-6 w-full" style={{ backgroundColor: '#0A0A0B', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100%', padding: '1.5rem', color: 'white' }}>
      <div className="max-w-md w-full space-y-8 bg-[#111] border border-white/5 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden" style={{ maxWidth: '28rem', width: '100%', backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '2.5rem', padding: '2.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        
        {/* Header com Logo Esmeralda */}
        <div className="text-center space-y-2 relative z-10" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="inline-block w-12 h-12 bg-[#00FF87] rounded-xl flex items-center justify-center text-black font-black text-xl mb-4 shadow-[0_0_15px_rgba(0,255,135,0.3)] mx-auto" style={{ display: 'inline-flex', width: '3rem', height: '3rem', backgroundColor: '#00FF87', borderRadius: '0.75rem', alignItems: 'center', justifyContent: 'center', color: 'black', fontWeight: '900', fontSize: '1.25rem', marginBottom: '1rem', boxShadow: '0 0 15px rgba(0,255,135,0.3)', marginLeft: 'auto', marginRight: 'auto' }}>
            F
          </div>
          <h2 className="text-3xl font-black tracking-tight uppercase italic text-white" style={{ fontSize: '1.875rem', fontWeight: '900', letterSpacing: '-0.025em', textTransform: 'uppercase', fontStyle: 'italic', color: 'white', margin: 0 }}>Acesse sua conta</h2>
          <p className="text-white/40 text-sm" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Entre com suas credenciais para continuar</p>
        </div>

        {/* Formulário de Login */}
        <form onSubmit={handleLogin} className="space-y-6 relative z-10" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="space-y-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1" style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginLeft: '0.25rem' }}>
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jorgericardosalgado@gmail.com" 
              className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-[#00FF87]"
              style={{ width: '100%', backgroundColor: '#0A0A0B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', padding: '0.875rem', color: '#FFF', fontSize: '0.875rem', boxSizing: 'border-box' }}
            />
          </div>

          <div className="space-y-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1" style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginLeft: '0.25rem' }}>
              Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-[#00FF87]"
              style={{ width: '100%', backgroundColor: '#0A0A0B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', padding: '0.875rem', color: '#FFF', fontSize: '0.875rem', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#00FF87] hover:bg-[#00e67a] text-black font-black py-4 rounded-xl shadow-[0_0_20px_rgba(0,255,135,0.2)] flex items-center justify-center gap-2 group transition-all text-sm uppercase tracking-widest active:scale-95"
            style={{ width: '100%', backgroundColor: '#00FF87', color: 'black', fontWeight: '900', padding: '1rem', borderRadius: '0.75rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.875rem', transition: 'all 0.2s' }}
          >
            Entrar no Sistema
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 text-center relative z-10" style={{ paddingTop: '1rem', textAlign: 'center' }}>
          <div className="flex items-center justify-center gap-2 text-[10px] text-white/20 uppercase tracking-[0.2em]" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '10px', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
            <ShieldCheck className="w-3 h-3" />
            Conexão Segura FIXXER
          </div>
        </div>
      </div>
    </div>
  );
}
