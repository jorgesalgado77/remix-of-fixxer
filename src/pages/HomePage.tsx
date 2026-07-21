import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-[#00FF87] rounded-[2rem] flex items-center justify-center text-black font-black text-4xl mb-8 shadow-[0_0_30px_rgba(0,255,135,0.3)]">
        F
      </div>
      <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-4">FIXXER</h1>
      <p className="text-white/40 max-w-[280px] mb-12 text-sm leading-relaxed">
        Ecossistema integrado de serviços para lojistas, prestadores e clientes.
      </p>
      <Link to="/login" className="btn-primary w-full max-w-xs">
        Acessar Plataforma
      </Link>
    </div>
  );
}
