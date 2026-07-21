import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { 
  ArrowLeft, 
  Search, 
  MessageSquare, 
  Send, 
  Bookmark, 
  MoreVertical, 
  Star, 
  Flame, 
  Image as ImageIcon, 
  Video 
} from "lucide-react";

export default function FeedLojistaPage() {
  const [filter, setFilter] = useState("todos");
  const [search, setSearch] = useState("");

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col font-sans">
      {/* Topbar Fixa */}
      <header className="border-b border-white/10 bg-[#0A0A0B]/90 backdrop-blur-md sticky top-0 z-50 p-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <Link 
            className="w-10 h-10 bg-[#1A1A1B] border border-white/10 rounded-xl flex items-center justify-center text-white/70 hover:text-white transition-colors" 
            to="/_authenticated/lojista"
          >
            <ArrowLeft className="w-5 h-5"/>
          </Link>
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40"/>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar oportunidades, prestadores, materiais..."
              className="w-full bg-[#1A1A1B] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#00FF87]"
            />
          </div>
        </div>

        {/* Filtros em Pílulas com Scroll Invisível */}
        <div className="max-w-3xl mx-auto flex items-center gap-2 overflow-x-auto pt-3 pb-1 scrollbar-none">
          {["todos", "cliente", "prestador", "fornecedor", "lojista"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase whitespace-nowrap cursor-pointer transition-all ${
                filter === cat
                  ? "bg-[#00FF87] text-black shadow-[0_0_10px_rgba(0,255,135,0.3)]"
                  : "bg-[#1A1A1B] text-white/60 border border-white/10 hover:text-white"
              }`}
            >
              {cat === "todos" && "Todos os Anúncios"}
              {cat === "cliente" && "🔥 Clientes Finais"}
              {cat === "prestador" && "🛠️ Prestadores"}
              {cat === "fornecedor" && "🚚 Fornecedores"}
              {cat === "lojista" && "🏪 Lojistas"}
            </button>
          ))}
        </div>
      </header>

      {/* Container de Feed com Scroll Infinito */}
      <main className="max-w-3xl mx-auto w-full p-4 space-y-4 flex-1">
        {/* CARD DE EXEMPLO: CLIENTE FINAL (DESTAQUE MÁXIMO) */}
        <article className="bg-[#1A1A1B] border-2 border-[#00FF87] rounded-3xl p-5 space-y-4 shadow-[0_0_20px_rgba(0,255,135,0.15)] relative">
          {/* Badge de Destaque */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00FF87]/10 text-[#00FF87] text-[10px] font-black uppercase border border-[#00FF87]/30">
            <Flame className="w-3.5 h-3.5 animate-pulse"/>
            Oportunidade - Cliente Final
          </div>

          {/* Cabeçalho Autor */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-[#0A0A0B] border border-[#00FF87] rounded-2xl flex items-center justify-center font-bold text-[#00FF87]">
                CF
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-sm">Mariana Souza</h4>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/60">Cliente Final</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-white/50 mt-0.5">
                  <span className="text-[#00FF87] font-bold flex items-center gap-1">
                    <Star className="w-3 h-3 fill-[#00FF87] text-[#00FF87]"/> 5.0
                  </span>
                  <span>• Sorocaba, SP • há 10 min</span>
                </div>
              </div>
            </div>
            {/* Menu 3 Pontinhos */}
            <button className="p-2 text-white/40 hover:text-white rounded-lg cursor-pointer">
              <MoreVertical className="w-5 h-5"/>
            </button>
          </div>

          {/* Conteúdo do Post */}
          <div className="space-y-2">
            <h3 className="text-base font-bold text-white uppercase tracking-tight">Preciso de Montagem Urgente para Guarda-Roupa Casal</h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Comprei um guarda-roupas de 6 portas e preciso de montador com experiência para atendimento até sábado. Produto já entregue na caixa.
            </p>
          </div>

          {/* Mídia (Exemplo Container de Imagens/Vídeos) */}
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0A0A0B] aspect-video flex items-center justify-center text-white/30">
            <div className="flex flex-col items-center gap-2">
              <ImageIcon className="w-8 h-8"/>
              <span className="text-[10px] uppercase font-bold tracking-widest">[Preview da Foto/Vídeo do Produto]</span>
            </div>
          </div>

          {/* Barra de Ações */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
            <button className="flex-1 bg-[#00FF87] hover:bg-[#00FF87]/90 text-black font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer">
              <MessageSquare className="w-4 h-4"/> Chat Direto
            </button>
            <button className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer">
              <Send className="w-4 h-4 text-[#00FF87]"/> Enviar Proposta
            </button>
            <button className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/60 hover:text-white cursor-pointer transition-colors">
              <Bookmark className="w-4 h-4"/>
            </button>
          </div>
        </article>
      </main>
    </div>
  );
}
