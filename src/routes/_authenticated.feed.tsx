import { createFileRoute } from "@tanstack/react-router";
import { usePerformanceMode } from "@/hooks/use-performance-mode";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Search, 
  Filter, 
  MapPin, 
  Star, 
  MessageSquare, 
  User, 
  Clock, 
  Package,
  CheckCircle2,
  ChevronRight,
  Send,
  AlertCircle
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/feed")({
  component: FeedPage,
});

function FeedPage() {
  const { glassClass } = usePerformanceMode();
  const { session, userRole } = Route.useRouteContext();
  const [activeTab, setActiveTab] = useState<'demandas' | 'prestadores' | 'parceiros'>(
    userRole === 'lojista' ? 'prestadores' : 'demandas'
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [
    "Montagem", "Conferência", "Projetos", "Frete", "Marmoraria", "Gesso", "Pintura", "Elétrica"
  ];

  const { data: posts, isLoading } = useQuery({
    queryKey: ['feed-posts', activeTab, searchQuery, selectedCategory],
    queryFn: async () => {
      let type: string;
      if (activeTab === 'demandas') type = 'Demanda_OS';
      else if (activeTab === 'prestadores') type = 'Vitrine_Prestador';
      else type = 'Vitrine_Parceiro';

      let q = supabase
        .from('feed_posts')
        .select(`
          *,
          profiles:user_id (
            full_name,
            company_name,
            avatar_url,
            karma_score,
            specialty
          )
        `)
        .eq('post_type', type)
        .eq('status', 'Ativo')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        q = q.or(`title.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,state.ilike.%${searchQuery}%`);
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
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto pb-24">
      <header className="space-y-4">
        <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">Feed de Oportunidades</h1>
        
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {userRole === 'lojista' ? (
            <>
              <TabButton active={activeTab === 'prestadores'} onClick={() => setActiveTab('prestadores')} label="Prestadores" />
              <TabButton active={activeTab === 'parceiros'} onClick={() => setActiveTab('parceiros')} label="Parceiros" />
            </>
          ) : (
            <TabButton active={activeTab === 'demandas'} onClick={() => setActiveTab('demandas')} label="Demandas de O.S." />
          )}
        </div>

        <div className={`flex items-center gap-3 p-3 rounded-2xl border border-white/10 ${glassClass}`}>
          <Search className="w-5 h-5 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Buscar por cidade, estado ou título..." 
            className="bg-transparent border-none outline-none text-sm text-white w-full font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shrink-0 border ${
                selectedCategory === cat 
                  ? 'bg-primary text-black border-primary' 
                  : 'bg-white/5 text-muted-foreground border-white/10 hover:border-white/20'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      <main className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className={`h-48 rounded-3xl animate-pulse ${glassClass}`} />)}
          </div>
        ) : !posts?.length ? (
          <div className="text-center py-20 opacity-30">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
            <p className="text-sm font-bold uppercase tracking-widest">Nenhum anúncio encontrado</p>
          </div>
        ) : (
          posts.map((post: any) => (
            <FeedCard key={post.id} post={post} glassClass={glassClass} userRole={userRole} />
          ))
        )}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-tighter transition-all border ${
        active 
          ? 'bg-primary text-black border-primary shadow-[0_0_15px_rgba(0,255,135,0.3)]' 
          : 'bg-white/5 text-muted-foreground border-white/10 hover:border-white/20'
      }`}
    >
      {label}
    </button>
  );
}

function FeedCard({ post, glassClass, userRole }: { post: any, glassClass: string, userRole: string }) {
  const profile = post.profiles;
  const isOS = post.post_type === 'Demanda_OS';
  
  const maskContacts = (text: string) => {
    return text.replace(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}/g, '[CONTATO PROTEGIDO]')
               .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[E-MAIL PROTEGIDO]');
  };

  return (
    <div className={`p-5 rounded-3xl border border-white/10 ${glassClass} hover:border-primary/30 transition-all group`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary border border-white/5 overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary font-black uppercase italic">
                {profile?.full_name?.[0] || 'F'}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-xs font-black text-white uppercase italic truncate max-w-[150px]">
              {profile?.company_name || profile?.full_name}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                <MapPin className="w-3 h-3 text-primary" /> {post.city}/{post.state}
              </span>
              <span className="text-[9px] font-black text-amber-500 flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" /> {profile?.karma_score?.toFixed(1) || '5.0'}
              </span>
            </div>
          </div>
        </div>
        {isOS && (
           <div className="px-2 py-1 rounded bg-primary/10 border border-primary/20 text-[8px] font-black text-primary uppercase tracking-widest">
             {post.proposals_count} Propostas
           </div>
        )}
      </div>

      <div className="space-y-2 mb-6">
        <h4 className="text-sm font-black text-white uppercase italic group-hover:text-primary transition-colors">{post.title}</h4>
        <p className="text-[10px] text-muted-foreground font-medium leading-relaxed line-clamp-3">
          {maskContacts(post.description)}
        </p>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div className="flex flex-col">
          <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Condição</span>
          <span className="text-xs font-black text-white">
            {post.price_type === 'Fixo' ? `R$ ${post.price_value}` : `${post.price_value}%`}
            {post.is_negotiable && <span className="ml-2 text-[8px] text-primary/70">[Negociável]</span>}
          </span>
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-primary hover:text-black border border-white/10 hover:border-primary transition-all text-[10px] font-black uppercase italic">
          {isOS ? 'Enviar Proposta' : 'Ver Detalhes'}
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
