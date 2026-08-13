import { createFileRoute } from '@tanstack/react-router';
import { Award, BookOpen, Clock, Zap, Star, ShieldCheck, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/academy')({
  component: FixxerAcademyPage,
});

function FixxerAcademyPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] pb-32">
      <header className="relative py-24 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-primary/5 -z-10 blur-3xl opacity-50" />
        <div className="max-w-7xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">
            <Award className="w-3 h-3" />
            FIXXER Academy
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white leading-none uppercase italic">
            Transforme seu <span className="text-primary">Conhecimento</span> em Maestria Industrial.
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto font-medium">
            O catálogo definitivo de cursos e treinamentos para os melhores prestadores, lojistas e empreendedores do ecossistema.
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 space-y-20">
        {/* INFO CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <AcademyBenefitCard 
            icon={<ShieldCheck className="text-primary" />}
            title="Certificação Reconhecida"
            desc="Seja validado pelo selo FIXXER e ganhe destaque prioritário no ecossistema."
          />
          <AcademyBenefitCard 
            icon={<Zap className="text-amber-400" />}
            title="Acesso Imediato"
            desc="Aprenda no seu ritmo com aulas gravadas, e-books e materiais exclusivos."
          />
          <AcademyBenefitCard 
            icon={<Star className="text-blue-400" />}
            title="Expertise Real"
            desc="Conteúdo gerado por quem opera no mercado, sem teorias vazias."
          />
        </div>

        {/* CATÁLOGO EM BREVE */}
        <div className="py-32 text-center space-y-8 bg-white/[0.02] border border-dashed border-white/10 rounded-[64px]">
          <div className="w-24 h-24 bg-white/5 rounded-[40px] flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-12 h-12 text-muted-foreground/30" />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Catálogo em Curadoria</h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm uppercase tracking-widest font-bold">
              Estamos selecionando os melhores criadores para a Academy. Prepare sua conta para as assinaturas em breve.
            </p>
          </div>
          <div className="flex justify-center gap-4">
            <Button className="bg-primary text-primary-foreground font-black px-10 h-14 rounded-2xl shadow-[0_0_20px_rgba(0,255,135,0.3)] hover:scale-105 transition-all uppercase tracking-widest text-xs">
              Lista de Espera
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function AcademyBenefitCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/10 p-10 rounded-[40px] space-y-6 hover:bg-white/[0.05] transition-all group">
      <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div className="space-y-2">
        <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">{title}</h4>
        <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
