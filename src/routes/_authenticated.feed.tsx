import { createFileRoute } from "@tanstack/react-router";
import { usePerformanceMode } from "@/hooks/use-performance-mode";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  Search, 
  MapPin, 
  Star, 
  MessageSquare, 
  Clock, 
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  Briefcase,
  Home,
  User,
  Store,
  Filter,
  Layers,
  FileText
} from "lucide-react";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/_authenticated/feed")({
  component: FeedPage,
});

function FeedPage() {
  const { glassClass } = usePerformanceMode();
  const { userRole } = Route.useRouteContext();
  
  // Tab logic based on user role
  const [activeTab, setActiveTab] = useState<'demandas_lojista' | 'obras_b2c' | 'prestadores' | 'parceiros'>(
    (userRole === 'lojista' || userRole === 'cliente') ? 'prestadores' : 'demandas_lojista'
  );
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState("");

  const categories = {
    tecnico: ["Projetista", "Medidor", "Montador", "Supervisor", "Frete Dedicado"],
    obras: ["Gesso", "Eletricista", "Encanador", "Alvenaria", "Pintura", "Marmoraria", "Vidraçaria", "Limpeza"]
  };

  const allCategories = [...categories.tecnico, ...categories.obras];

  const { data: posts, isLoading } = useQuery({
    queryKey: ['feed-posts', activeTab, searchQuery, selectedCategory, locationFilter],
    queryFn: async () => {
      let q = supabase
        .from('feed_posts')
        .select(`
          *,
          profiles:user_id (
            full_name,
            company_name,
            avatar_url,
            karma_score,
            user_type,
            specialties
          )
        `)
        .eq('status', 'Ativo')
        .order('created_at', { ascending: false });

      // Tab mapping to DB fields/types
      if (activeTab === 'demandas_lojista') {
        q = q.eq('post_type', 'Demanda_OS');
      } else if (activeTab === 'obras_b2c') {
        q = q.eq('post_type', 'Demanda_B2C');
      } else if (activeTab === 'prestadores') {
        q = q.eq('post_type', 'Vitrine_Prestador');
      } else if (activeTab === 'parceiros') {
        q = q.eq('post_type', 'Vitrine_Parceiro');
      }

      if (searchQuery) {
        q = q.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }
      
      if (locationFilter) {
        q = q.or(`city.ilike.%${locationFilter}%,state.ilike.%${locationFilter}%`);
      }
      
      if (selectedCategory) {
        q = q.eq('category', selectedCategory);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto pb-24 animate-in fade-in duration-500">
      <header className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
              <Layers className="w-6 h-6 text-[#00FF87]" />
              Feed <span className="text-[#00FF87]">Multicategorias</span>
            </h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Conexão B2B & B2C em tempo real</p>
          </div>
          
          {/* SELETOR DE VISÃO (CHIPS NO TOPO) */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide md:pb-0">
            {(userRole === 'lojista' || userRole === 'cliente') ? (
              <>
                <TabChip 
                  active={activeTab === 'prestadores'} 
                  onClick={() => setActiveTab('prestadores')} 
                  label="Encontrar Prestadores" 
                  icon={<User className="w-3 h-3" />}
                />
                <TabChip 
                  active={activeTab === 'parceiros'} 
                  onClick={() => setActiveTab('parceiros')} 
                  label="Encontrar Parceiros" 
                  icon={<Store className="w-3 h-3" />}
                />
              </>
            ) : (
              <>
                <TabChip 
                  active={activeTab === 'demandas_lojista'} 
                  onClick={() => setActiveTab('demandas_lojista')} 
                  label="Demandas Lojistas" 
                  icon={<Briefcase className="w-3 h-3" />}
                />
                <TabChip 
                  active={activeTab === 'obras_b2c'} 
                  onClick={() => setActiveTab('obras_b2c')} 
                  label="Obras Clientes" 
                  icon={<Home className="w-3 h-3" />}
                />
              </>
            )}
          </div>
        </div>

        {/* BARRA DE FILTROS AVANÇADOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className={`flex items-center gap-3 p-3 rounded-2xl border border-white/10 ${glassClass}`}>
            <Search className="w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar título ou palavra-chave..." 
              className="bg-transparent border-none outline-none text-xs text-white w-full font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className={`flex items-center gap-3 p-3 rounded-2xl border border-white/10 ${glassClass}`}>
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Cidade ou Estado..." 
              className="bg-transparent border-none outline-none text-xs text-white w-full font-medium"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            />
          </div>
        </div>

        {/* CATEGORIAS ESPECÍFICAS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Filtrar por Especialidade</span>
            {selectedCategory && (
              <button 
                onClick={() => setSelectedCategory(null)}
                className="text-[9px] font-bold text-red-400 uppercase tracking-widest hover:underline"
              >
                Limpar Filtro
              </button>
            )}
          </div>
          <div className="flex flex-col gap-3">
             <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <span className="shrink-0 text-[8px] font-bold text-primary/50 uppercase self-center mr-1">Técnico:</span>
                {categories.tecnico.map(cat => (
                  <CategoryChip 
                    key={cat} 
                    label={cat} 
                    active={selectedCategory === cat} 
                    onClick={() => setSelectedCategory(cat)} 
                  />
                ))}
             </div>
             <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <span className="shrink-0 text-[8px] font-bold text-blue-400/50 uppercase self-center mr-1">Obras:</span>
                {categories.obras.map(cat => (
                  <CategoryChip 
                    key={cat} 
                    label={cat} 
                    active={selectedCategory === cat} 
                    onClick={() => setSelectedCategory(cat)} 
                  />
                ))}
             </div>
          </div>
        </div>
      </header>

      <main className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className={`h-40 rounded-3xl animate-pulse ${glassClass}`} />)}
          </div>
        ) : !posts?.length ? (
          <div className="text-center py-20 opacity-30">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
            <p className="text-sm font-bold uppercase tracking-widest">Nenhum anúncio encontrado</p>
          </div>
        ) : (
          posts.map((post: any) => (
            <FeedCard key={post.id} post={post} glassClass={glassClass} />
          ))
        )}
      </main>
    </div>
  );
}

function TabChip({ active, onClick, label, icon }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all border flex items-center gap-2 shrink-0 ${
        active 
          ? 'bg-[#00FF87] text-black border-[#00FF87] shadow-[0_0_15px_rgba(0,255,135,0.3)]' 
          : 'bg-white/5 text-muted-foreground border-white/10 hover:border-white/20'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function CategoryChip({ label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all shrink-0 border ${
        active 
          ? 'bg-white/10 text-[#00FF87] border-[#00FF87]' 
          : 'bg-black/20 text-muted-foreground border-white/5 hover:border-white/20'
      }`}
    >
      {label}
    </button>
  );
}

function FeedCard({ post, glassClass }: { post: any, glassClass: string }) {
  const profile = post.profiles;
  const isB2C = post.post_type === 'Demanda_B2C';
  const isOS = post.post_type === 'Demanda_OS';
  const isVitrine = post.post_type.startsWith('Vitrine');
  
  const maskContacts = (text: string) => {
    if (!text) return "";
    return text.replace(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/g, '[CONTATO PROTEGIDO]')
               .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[E-MAIL PROTEGIDO]');
  };

  return (
    <div className={`p-5 rounded-3xl border border-white/5 ${glassClass} hover:border-[#00FF87]/30 transition-all group relative overflow-hidden`}>
      {/* CARD HEADER */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/5 overflow-hidden flex items-center justify-center">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-[#00FF87]/50" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[11px] font-black text-white uppercase italic truncate max-w-[150px]">
                {profile?.company_name || profile?.full_name || "Usuário FIXXER"}
              </h3>
              {isB2C && <Home className="w-3 h-3 text-blue-400" title="Obra Residencial" />}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5 text-[#00FF87]" /> {post.city}/{post.state}
              </span>
              {isVitrine && (
                <span className="text-[8px] font-black text-amber-500 flex items-center gap-1">
                  <Star className="w-2.5 h-2.5 fill-current" /> {profile?.karma_score?.toFixed(1) || '5.0'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* BADGES ESPECÍFICOS */}
        {isVitrine && (
          <div className="flex flex-col items-end gap-1">
             <span className="px-2 py-0.5 rounded-full bg-[#00FF87]/10 text-[#00FF87] text-[7px] font-black uppercase tracking-widest border border-[#00FF87]/20">
               Disponível Agora
             </span>
          </div>
        )}
        {isOS && post.is_negotiable && (
          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[7px] font-black uppercase tracking-widest border border-blue-500/20">
            Negociável
          </span>
        )}
      </div>

      {/* CARD BODY */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[13px] font-black text-white uppercase italic group-hover:text-[#00FF87] transition-colors">
            {post.title}
          </h4>
          <span className="text-[9px] font-bold text-muted-foreground bg-white/5 px-2 py-0.5 rounded">
            {post.category}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground font-medium leading-relaxed line-clamp-2">
          {maskContacts(post.description)}
        </p>
        
        {isB2C && (
           <div className="flex items-center gap-2 mt-2">
             <div className="px-2 py-1 rounded bg-white/5 border border-white/10 flex items-center gap-1.5 cursor-pointer hover:bg-white/10 transition-colors">
               <FileText className="w-3 h-3 text-blue-400" />
               <span className="text-[8px] font-bold text-white uppercase">Ver Planta/Projeto</span>
             </div>
           </div>
        )}
      </div>

      {/* CARD FOOTER */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div className="flex flex-col">
          <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">
            {isVitrine ? 'A partir de' : 'Remuneração'}
          </span>
          <span className="text-xs font-black text-white">
            {post.price_type === 'Fixo' ? `R$ ${post.price_value}` : post.price_value ? `${post.price_value}%` : 'A combinar'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {isVitrine ? (
            <>
              <button className="p-2 rounded-xl bg-white/5 hover:bg-[#00FF87]/10 border border-white/10 hover:border-[#00FF87]/30 transition-all text-[#00FF87]">
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
              <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-[9px] font-black uppercase italic">
                Ver Perfil
                <ChevronRight className="w-3 h-3" />
              </button>
            </>
          ) : (
            <button className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#00FF87] text-black border border-[#00FF87] hover:shadow-[0_0_15px_rgba(0,255,135,0.4)] transition-all text-[9px] font-black uppercase italic">
              {isB2C ? 'Enviar Orçamento' : 'Enviar Proposta'}
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* DECORATIVE ELEMENT */}
      <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-[#00FF87]/5 blur-3xl rounded-full"></div>
    </div>
  );
}