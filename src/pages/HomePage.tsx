import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 italic uppercase">FIXXER</h1>
      <p className="text-white/60 max-w-sm mb-8 text-sm">Ecossistema Integrado: Lojistas, Prestadores e Clientes.</p>
      <Link to="/login" className="bg-[#00FF87] hover:bg-[#00e67a] text-black font-black py-4 px-8 rounded-2xl transition-all uppercase tracking-widest text-xs">
        Acessar Plataforma
      </Link>
    </div>
  );
}
