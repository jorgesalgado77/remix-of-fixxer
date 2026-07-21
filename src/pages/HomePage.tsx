import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-[#00FF87] rounded-2xl flex items-center justify-center text-black font-black text-3xl mb-6 shadow-[0_0_20px_rgba(0,255,135,0.4)]">
        F
      </div>
      <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">FIXXER</h1>
      <p className="text-white/60 max-w-md text-base mb-8">
        Ecossistema Integrado para Lojistas, Prestadores, Parceiros e Clientes Finais.
      </p>
      <Link className="px-8 py-4 bg-[#00FF87] hover:bg-[#00FF87]/90 text-black font-black rounded-2xl text-base transition-all shadow-[0_0_15px_rgba(0,255,135,0.3)] cursor-pointer" to="/login">
        Começar / Acessar Sistema
      </Link>
    </div>
  );
}