import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, PlayCircle, GraduationCap, ChevronRight, Search, Library } from 'lucide-react';
import { ProfileHeader } from '@/components/ProfileHeader';
import { getMyLibrary } from '@/lib/info-products/entitlement-service';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { supabaseExternal } from '@/lib/supabaseExternal';

export const Route = createFileRoute('/_authenticated/biblioteca')({
  component: LibraryPage,
});

function LibraryPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabaseExternal.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id);
    });
  }, []);

  const { data: library, isLoading } = useQuery({
    queryKey: ['my-library', userId],
    queryFn: () => getMyLibrary(userId!),
    enabled: !!userId,
  });

  const filteredLibrary = library?.filter(item => 
    item.product.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-32">
      <ProfileHeader 
        role="cliente" 
        title="MINHA BIBLIOTECA" 
        subtitle="Seus conteúdos adquiridos e progresso"
        icon={<Library className="w-6 h-6" />}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10 space-y-8">
        {/* Barra de Busca e Filtros */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar em meus produtos..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/5 border-white/10 pl-10 rounded-2xl h-12 text-sm focus:ring-primary/50"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <LibraryCardSkeleton key={i} />)}
          </div>
        ) : filteredLibrary && filteredLibrary.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredLibrary.map(item => (
              <LibraryCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <EmptyLibrary />
        )}
      </main>
    </div>
  );
}

function LibraryCard({ item }: { item: any }) {
  const product = item.product;
  const isCourse = product.category === 'course';
  const isVideo = product.category === 'video';
  const isEbook = product.category === 'ebook';

  const ActionIcon = isEbook ? BookOpen : (isVideo ? PlayCircle : GraduationCap);
  const actionLabel = isEbook ? 'Abrir Leitor' : (isCourse ? 'Continuar Curso' : 'Assistir Agora');

  return (
    <Link 
      to="/info/$id"
      params={{ id: product.id }}
      className="group bg-white/[0.03] border border-white/10 rounded-[32px] overflow-hidden hover:border-primary/50 transition-all hover:translate-y-[-4px] flex flex-col h-full"
    >
      {/* Capa */}
      <div className="relative aspect-[16/10] overflow-hidden bg-white/5">
        {product.cover_url ? (
          <img 
            src={product.cover_url} 
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
            <Library className="w-12 h-12" />
          </div>
        )}
        <div className="absolute top-4 left-4">
           <span className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-white border border-white/10">
             {product.category}
           </span>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 className="text-sm font-black text-white uppercase italic tracking-tighter line-clamp-2 leading-tight">
            {product.title}
          </h3>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-2 flex items-center gap-1">
             Adquirido em {new Date(item.granted_at).toLocaleDateString()}
          </p>
        </div>

        <div className="space-y-3">
          {/* Mock de progresso - será real em prompts futuros */}
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-black text-muted-foreground uppercase tracking-widest">
              <span>Progresso</span>
              <span className="text-primary">0%</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-primary w-[0%] shadow-[0_0_10px_rgba(0,255,135,0.5)]" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/5">
             <span className="flex items-center gap-1.5 text-xs font-black text-white uppercase italic group-hover:text-primary transition-colors">
               <ActionIcon className="w-4 h-4" />
               {actionLabel}
             </span>
             <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function LibraryCardSkeleton() {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-[32px] overflow-hidden space-y-4">
      <Skeleton className="aspect-[16/10] w-full bg-white/5" />
      <div className="p-5 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4 bg-white/5" />
          <Skeleton className="h-3 w-1/2 bg-white/5" />
        </div>
        <Skeleton className="h-10 w-full rounded-2xl bg-white/5" />
      </div>
    </div>
  );
}

function EmptyLibrary() {
  return (
    <div className="py-32 flex flex-col items-center justify-center text-center space-y-6 bg-white/[0.02] border border-dashed border-white/10 rounded-[40px]">
      <div className="w-20 h-20 bg-white/5 rounded-[32px] flex items-center justify-center text-muted-foreground/30">
        <Library className="w-10 h-10" />
      </div>
      <div className="space-y-2 max-w-sm">
        <h3 className="text-xl font-bold text-white uppercase tracking-tight">Sua biblioteca está vazia</h3>
        <p className="text-sm text-muted-foreground">Você ainda não adquiriu nenhum info produto. Explore o marketplace para começar sua jornada.</p>
      </div>
      <Link to="/marketplace">
        <button className="bg-primary text-primary-foreground font-black px-8 py-4 rounded-2xl shadow-[0_0_20px_rgba(0,255,135,0.3)] hover:scale-105 transition-all uppercase tracking-widest text-xs">
          Explorar Marketplace
        </button>
      </Link>
    </div>
  );
}
