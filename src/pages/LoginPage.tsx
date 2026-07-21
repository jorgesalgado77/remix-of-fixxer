import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState("Lojista");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("fixxer_user_role", profile);
    localStorage.setItem("fixxer_authenticated", "true");
    if (email === "jorgericardosalgado@gmail.com") return navigate("/admin");
    navigate(`/dashboard/${profile.toLowerCase()}`);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-6">
      <form onSubmit={handleLogin} className="w-full max-w-sm bg-[#1A1A1B] p-8 rounded-3xl border border-white/10 space-y-6">
        <h2 className="text-2xl font-black italic uppercase">Login</h2>
        <input type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 bg-[#0A0A0B] border border-white/10 rounded-2xl outline-none focus:border-[#00FF87]" />
        <select value={profile} onChange={(e) => setProfile(e.target.value)} className="w-full p-4 bg-[#0A0A0B] border border-white/10 rounded-2xl outline-none focus:border-[#00FF87]">
          <option>Lojista</option>
          <option>Prestador</option>
          <option>Parceiro</option>
          <option>Cliente</option>
        </select>
        <button type="submit" className="w-full bg-[#00FF87] text-black font-black py-4 rounded-2xl uppercase tracking-widest text-xs">Entrar</button>
      </form>
    </div>
  );
}
