import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Lojista");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    
    if (cleanEmail === "jorgericardosalgado@gmail.com") {
      navigate("/admin");
    } else {
      navigate(`/dashboard/${role.toLowerCase()}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-black italic uppercase tracking-tight">Login</h2>
          <p className="text-white/40 text-xs mt-2 uppercase tracking-widest">Identifique-se para continuar</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-white/30 ml-1">E-mail</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input-fixxer" 
              placeholder="exemplo@fixxer.com.br"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-white/30 ml-1">Perfil</label>
            <select 
              value={role}
              onChange={e => setRole(e.target.value)}
              className="input-fixxer appearance-none"
            >
              <option>Lojista</option>
              <option>Prestador</option>
              <option>Parceiro</option>
              <option>Cliente</option>
            </select>
          </div>

          <button type="submit" className="btn-primary w-full mt-4">
            Entrar no Sistema
          </button>
        </form>
      </div>
    </div>
  );
}
