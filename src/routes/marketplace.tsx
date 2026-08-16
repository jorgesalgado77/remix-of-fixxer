import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { 
  Search, 
  Filter, 
  BookOpen, 
  Video, 
  GraduationCap, 
  Star, 
  ArrowRight,
  ChevronDown,
  LayoutGrid,
  TrendingUp,
  Clock,
  Zap
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { getPublicInfoProducts, InfoProduct } from '@/lib/info-products/info-service';
import { resolveIdentity } from '@/lib/identity/identity-service';
import { getActiveOffer, InfoOffer } from '@/lib/info-products/offer-service';
import { Badge } from '@/components/ui/badge';

import { Skeleton } from '@/components/ui/skeleton';

export const Route = createFileRoute('/marketplace')({
  component: MarketplacePage,
});

function MarketplacePage() {
  const [products, setProducts] = useState<InfoProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<'newest' | 'rating'>('newest');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { products: data } = await getPublicInfoProducts({ category, sort });
        
        // Resolver identidades dos creators (Canônico)
        const enriched = await Promise.all(data.map(async (p) => {
           try {
             const identity = await resolveIdentity(p.creator_id);
             return {
               ...p,
               creator_name: identity.presentation.name,
               creator_avatar: identity.presentation.avatarUrl
             };
           } catch (e) {
             return p;
           }
        }));

        setProducts(enriched);
      } catch (e) {
        console.error("Erro ao carregar marketplace:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [category, sort]);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* NAVBAR SIMPLES (REUTILIZAR PADRÃO) */}
      <nav className="border-b border-white/5 bg-background/80 backdrop-blur-xl sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-black text-xl shadow-[0_0_15px_rgba(0,255,135,0.3)] group-hover:scale-110 transition-transform">
              F
            </div>
            <span className="text-xl font-black tracking-tighter text-white uppercase italic">FIXXER <span className="text-primary">INFO</span></span>
          </Link>

          <div className="flex items-center gap-4">
             <Button variant="ghost" size="sm" asChild className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-white">
               <Link to="/auth">Entrar</Link>
             </Button>
             <Button size="sm" className="bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs px-6 rounded-xl shadow-[0_0_20px_rgba(0,255,135,0.3)]">
               Começar a Criar
             </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* HERO / SEARCH */}
        <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-primary/10 via-background to-background border border-white/5 p-8 md:p-16 text-center space-y-8">
           <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -z-10 rounded-full" />
           <div className="space-y-4 max-w-2xl mx-auto">
             <h1 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-none">
               Domine novas <span className="text-primary">habilidades</span> com os melhores especialistas.
             </h1>
             <p className="text-muted-foreground text-lg">Cursos, E-books e Treinamentos exclusivos do ecossistema FIXXER.</p>
           </div>

           <div className="max-w-xl mx-auto relative group">
             <div className="absolute inset-0 bg-primary/20 blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
             <div className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl p-1 backdrop-blur-xl">
               <Search className="w-5 h-5 text-muted-foreground ml-4" />
               <Input 
                 placeholder="O que você quer aprender hoje?" 
                 className="bg-transparent border-0 focus-visible:ring-0 text-white placeholder:text-muted-foreground/50 h-12"
                 onChange={(e) => {
                   // Integrar com busca real no info-service
                   const term = e.target.value;
                   if (term.length > 2) {
                     getPublicInfoProducts({ category, sort, search: term }).then(res => setProducts(res.products));
                   }
                 }}
               />
               <Button className="bg-primary text-primary-foreground font-black rounded-xl px-6 uppercase tracking-widest text-xs h-10">Buscar</Button>
             </div>
           </div>
        </div>

        {/* FILTROS & CATEGORIAS */}
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between border-b border-white/5 pb-8">
           <div className="flex flex-wrap gap-2">
             <CategoryBadge active={category === undefined} label="Tudo" onClick={() => setCategory(undefined)} />
             <CategoryBadge active={category === 'ebook'} label="E-books" icon={<BookOpen className="w-3 h-3" />} onClick={() => setCategory('ebook')} />
             <CategoryBadge active={category === 'video'} label="Vídeos" icon={<Video className="w-3 h-3" />} onClick={() => setCategory('video')} />
             <CategoryBadge active={category === 'course'} label="Cursos" icon={<GraduationCap className="w-3 h-3" />} onClick={() => setCategory('course')} />
           </div>

           <div className="flex items-center gap-4">
             <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Ordenar por:</span>
             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-white font-bold text-xs uppercase tracking-widest rounded-xl gap-2">
                   {sort === 'newest' ? 'Recentes' : 'Mais Bem Avaliados'}
                   <ChevronDown className="w-3 h-3" />
                 </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end" className="bg-background border-white/10">
                 <DropdownMenuItem onClick={() => setSort('newest')} className="text-xs font-bold uppercase tracking-widest">Recentes</DropdownMenuItem>
                 <DropdownMenuItem onClick={() => setSort('rating')} className="text-xs font-bold uppercase tracking-widest">Melhor Avaliados</DropdownMenuItem>
               </DropdownMenuContent>
             </DropdownMenu>
           </div>
        </div>

        {/* GRID DE PRODUTOS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
             Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)
          ) : products.length > 0 ? (
            products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          ) : (
            <div className="col-span-full py-24 text-center space-y-4">
               <Zap className="w-12 h-12 text-muted-foreground/20 mx-auto" />
               <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">Nenhum produto encontrado nesta categoria.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function CategoryBadge({ label, active, onClick, icon }: { label: string; active: boolean; onClick: () => void; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-[10px] uppercase tracking-[0.2em] transition-all border ${
        active 
          ? 'bg-primary border-primary text-primary-foreground shadow-[0_0_15px_rgba(0,255,135,0.2)]' 
          : 'bg-white/5 border-white/10 text-muted-foreground hover:text-white hover:border-white/20'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ProductCard({ product }: { product: InfoProduct }) {
  const [activeOffer, setActiveOffer] = useState<InfoOffer | null>(null);

  useEffect(() => {
    getActiveOffer(product.id).then(setActiveOffer);
  }, [product.id]);

  const displayPrice = activeOffer ? activeOffer.price : product.price;
  const comparePrice = activeOffer?.compare_at_price || (activeOffer ? product.price : null);

  return (
    <Link 
      to="/info/$id" 
      params={{ id: product.id }} 
      search={{ offerId: activeOffer?.id }}
      className="group flex flex-col bg-white/[0.03] border border-white/10 rounded-[32px] overflow-hidden hover:border-primary/40 hover:bg-white/[0.05] transition-all duration-500"
    >
      <div className="aspect-[4/3] relative overflow-hidden bg-muted">
         {product.cover_url ? (
           <img 
             src={product.cover_url} 
             alt={product.title}
             className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
             loading="lazy"
           />
         ) : (
           <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
             <LayoutGrid className="w-12 h-12" />
           </div>
         )}
         <div className="absolute top-4 left-4 flex flex-col gap-2">
            <Badge className="bg-black/60 backdrop-blur-md border-white/10 text-[9px] font-black uppercase tracking-widest w-fit">
              {product.category === 'ebook' ? 'E-book' : product.category === 'video' ? 'Vídeo' : 'Curso'}
            </Badge>
            {activeOffer && (
              <Badge className="bg-emerald-500 text-white border-none text-[8px] font-black uppercase tracking-widest px-2 shadow-[0_0_10px_rgba(16,185,129,0.5)] w-fit">
                Oferta Ativa
              </Badge>
            )}
         </div>
         {product.rating_avg > 0 && (
           <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-[10px] font-black text-white">{product.rating_avg.toFixed(1)}</span>
           </div>
         )}
      </div>

      <div className="p-6 flex flex-col flex-1 space-y-4">
         <div className="space-y-1">
            <h3 className="text-lg font-bold text-white uppercase tracking-tight line-clamp-2 leading-tight group-hover:text-primary transition-colors">
              {product.title}
            </h3>
            <div className="flex items-center gap-2">
               <div className="w-4 h-4 rounded-full bg-white/10 overflow-hidden">
                 {product.creator_avatar && <img src={product.creator_avatar} className="w-full h-full object-cover" />}
               </div>
               <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest truncate">
                 {product.creator_name || 'Especialista FIXXER'}
               </span>
            </div>
         </div>

         <div className="pt-2 mt-auto border-t border-white/5 flex items-center justify-between gap-2">
            <div className="flex flex-col">
               {comparePrice && (
                 <span className="text-[10px] text-white/40 font-bold line-through uppercase tracking-widest">
                   R$ {comparePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                 </span>
               )}
               <div className="text-xl font-black text-white italic">
                  R$ {displayPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
               </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all shrink-0">
               <ArrowRight className="w-4 h-4" />
            </div>
         </div>
      </div>
    </Link>
  );
}


function ProductSkeleton() {
  return (
    <div className="flex flex-col bg-white/5 border border-white/10 rounded-[32px] overflow-hidden space-y-4">
      <Skeleton className="aspect-[4/3] rounded-none bg-white/5" />
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-3/4 bg-white/5" />
          <Skeleton className="h-3 w-1/2 bg-white/5" />
        </div>
        <div className="pt-4 flex items-center justify-between">
          <Skeleton className="h-8 w-24 bg-white/5" />
          <Skeleton className="h-8 w-8 rounded-full bg-white/5" />
        </div>
      </div>
    </div>
  );
}
