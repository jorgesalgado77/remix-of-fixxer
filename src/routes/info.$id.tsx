import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { 
  ArrowLeft, 
  Star, 
  CheckCircle2, 
  Clock, 
  Play, 
  Lock, 
  ChevronRight, 
  BookOpen, 
  Video, 
  GraduationCap,
  ShieldCheck,
  FileText,
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getInfoProductDetails } from '@/lib/info-products/info-service';
import { resolveIdentity } from '@/lib/identity/identity-service';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { InfoSecurePlayer } from '@/components/InfoSecurePlayer';
import { getActiveOffer, InfoOffer } from '@/lib/info-products/offer-service';
import type { ResolvedProfile } from '@/lib/identity/identity-types';
import { toast } from 'sonner';


export const Route = createFileRoute('/info/$id')({
  component: ProductDetailsPage,
});

function ProductDetailsPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch() as { offerId?: string };
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [activeOffer, setActiveOffer] = useState<InfoOffer | null>(null);
  const [creator, setCreator] = useState<ResolvedProfile | null>(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getInfoProductDetails(id);
        if (!data) {
          toast.error("Produto não encontrado");
          navigate({ to: '/marketplace' as any });
          return;
        }
        setProduct(data);
        const identity = await resolveIdentity(data.creator_id);
        setCreator(identity);
        const offer = await getActiveOffer(id);
        setActiveOffer(offer);
      } catch (e) {
        console.error("Erro ao carregar detalhes:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);


  if (loading) return <DetailsSkeleton />;
  if (!product) return null;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* HEADER NAVEGAÇÃO */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => window.history.back()}
            className="text-muted-foreground hover:text-white font-bold uppercase tracking-widest text-[10px] gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>

          <div className="flex items-center gap-4">
             <Badge className="bg-primary/20 text-primary border-primary/20 text-[9px] font-black uppercase tracking-widest">
               {product.category === 'ebook' ? 'E-book' : product.category === 'video' ? 'Vídeo' : 'Curso'}
             </Badge>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* COLUNA ESQUERDA: CONTEÚDO */}
          <div className="lg:col-span-2 space-y-12">
            {/* HERO INFO */}
            <div className="space-y-6">
               <h1 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-[0.9]">
                 {product.title}
               </h1>
               
               {creator && (
                 <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 w-fit">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted">
                      {creator.presentation.avatarUrl && (
                        <img src={creator.presentation.avatarUrl} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-primary uppercase tracking-widest">Criado por</div>
                      <div className="text-lg font-bold text-white uppercase tracking-tight">{creator.presentation.name}</div>
                    </div>
                 </div>
               )}

               <p className="text-muted-foreground text-lg leading-relaxed">
                 {product.description || "Sem descrição disponível."}
               </p>
            </div>

            {/* PREVIEW / COVER */}
            <div className="aspect-video rounded-[40px] overflow-hidden bg-white/5 border border-white/10 relative group">
               {product.preview_url ? (
                 <InfoSecurePlayer 
                   productId={product.id} 
                   filePath={product.preview_url}
                   type={product.category === 'ebook' ? 'pdf' : 'video'}
                   className="w-full h-full"
                 />
               ) : (
                 <img 
                   src={product.cover_url || ''} 
                   className="w-full h-full object-cover opacity-50 grayscale group-hover:grayscale-0 transition-all duration-700" 
                 />
               )}
               {!product.preview_url && (
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/60 backdrop-blur-xl p-6 rounded-3xl border border-white/10 text-center space-y-2">
                       <Lock className="w-8 h-8 text-primary mx-auto" />
                       <p className="text-xs font-black text-white uppercase tracking-widest">Preview não disponível</p>
                    </div>
                 </div>
               )}
            </div>

            {/* MÓDULOS / AULAS (SE CURSO) */}
            {product.category === 'course' && (
              <div className="space-y-8">
                 <div className="flex items-center justify-between">
                   <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Conteúdo do Curso</h2>
                   <Badge variant="outline" className="border-white/10 text-muted-foreground text-[10px] uppercase">
                     {product.modules?.length || 0} Módulos
                   </Badge>
                 </div>

                 <div className="space-y-4">
                   {product.modules?.map((module: any, idx: number) => (
                     <div key={module.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-4">
                             <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-black text-muted-foreground">
                               {String(idx + 1).padStart(2, '0')}
                             </div>
                             <h3 className="font-bold text-white uppercase tracking-tight">{module.title}</h3>
                           </div>
                           <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="pl-12 space-y-2">
                           {module.lessons?.map((lesson: any) => (
                             <div key={lesson.id} className="flex items-center justify-between py-2 text-sm text-muted-foreground group">
                                <div className="flex items-center gap-3">
                                   <Play className="w-3 h-3 group-hover:text-primary transition-colors" />
                                   <span>{lesson.title}</span>
                                </div>
                                <Lock className="w-3 h-3 opacity-40" />
                             </div>
                           ))}
                        </div>
                     </div>
                   ))}
                 </div>
              </div>
            )}
          </div>

          {/* COLUNA DIREITA: COMPRA */}
          <div className="space-y-6">
            <div className="sticky top-32 p-8 rounded-[40px] bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-8 shadow-2xl overflow-hidden relative">
               {activeOffer && (
                 <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest px-4 py-1 rounded-bl-2xl shadow-lg">
                   Oferta Ativa
                 </div>
               )}

               <div className="space-y-2">
                 <div className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">
                   {activeOffer ? 'Preço de Oferta' : 'Investimento Único'}
                 </div>
                 
                 <div className="flex flex-col">
                   {(activeOffer?.compare_at_price || (activeOffer ? product.price : null)) && (
                     <span className="text-sm font-black text-white/30 italic line-through uppercase">
                       R$ {(activeOffer?.compare_at_price || product.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                     </span>
                   )}
                   <div className="text-5xl font-black text-white italic tracking-tighter">
                     R$ {(activeOffer ? activeOffer.price : product.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                   </div>
                 </div>
               </div>

               <div className="space-y-4">
                 <Button 
                   onClick={() => {
                     // Fluxo integrado de Checkout (Prompt 21) com suporte a Ofertas
                     navigate({ 
                       to: '/checkout' as any, 
                       search: { 
                         productId: product.id,
                         offerId: activeOffer?.id
                       } as any 
                     });
                   }}
                   className="w-full bg-primary text-primary-foreground font-black py-8 rounded-2xl shadow-[0_0_30px_rgba(0,255,135,0.4)] hover:scale-105 transition-all uppercase tracking-widest text-sm gap-3"
                 >
                   Garantir Acesso Agora
                   <ArrowRight className="w-5 h-5" />
                 </Button>

                 
                 <p className="text-[10px] text-center text-muted-foreground font-bold uppercase tracking-widest">
                   Pagamento 100% Seguro • Acesso Imediato
                 </p>
               </div>

               <div className="pt-8 border-t border-white/5 space-y-4">
                  <BenefitItem icon={<ShieldCheck className="w-4 h-4" />} text="Garantia de 7 Dias" />
                  <BenefitItem icon={<Clock className="w-4 h-4" />} text="Acesso Vitalício" />
                  <BenefitItem icon={<FileText className="w-4 h-4" />} text="Certificado de Conclusão" />
                  <BenefitItem icon={<MessageSquare className="w-4 h-4" />} text="Suporte do Especialista" />
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function BenefitItem({ icon, text }: { icon: React.ReactNode, text: string }) {
  return (
    <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground uppercase tracking-widest">
      <div className="text-primary">{icon}</div>
      {text}
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="min-h-screen bg-background p-12 space-y-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <Skeleton className="h-20 w-3/4 bg-white/5 rounded-2xl" />
          <Skeleton className="h-6 w-1/2 bg-white/5 rounded-lg" />
          <Skeleton className="aspect-video w-full bg-white/5 rounded-[40px]" />
        </div>
        <Skeleton className="h-[500px] w-full bg-white/5 rounded-[40px]" />
      </div>
    </div>
  );
}
