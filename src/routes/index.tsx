import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { 
  ShieldCheck, 
  CreditCard,
  ChevronRight,
  Zap,
  Lock,
  Mail,
  LayoutGrid,
  Activity,
  Users,
  Search,
  CheckCircle2,
  Star,
  ArrowRight,
  Shield,
  Clock,
  Menu,
  X
} from "lucide-react";
import { usePerformanceMode } from "@/hooks/use-performance-mode";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { glassClass } = usePerformanceMode();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 overflow-x-hidden">
      {/* HEADER / NAVBAR FIXA */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate({ to: "/" })}>
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-black text-2xl shadow-[0_0_20px_rgba(0,255,135,0.4)] group-hover:scale-110 transition-transform">
              F
            </div>
            <span className="text-2xl font-black tracking-tighter text-white">FIXXER</span>
          </div>

          {/* Menu Desktop */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#oque-e" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest">O que é</a>
            <a href="#para-quem" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest">Para Quem É</a>
            <a href="#reputacao" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest">Reputação</a>
            <a href="#planos" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest">Planos</a>
            <Link to="/terms" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest">Termos</Link>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={() => navigate({ to: "/auth/" as any })}
              className="px-6 py-2 text-sm font-bold text-white hover:text-primary transition-colors uppercase tracking-widest"
            >
              Entrar
            </button>
            <button 
              onClick={() => navigate({ to: "/cadastro" as any })}
              className="px-6 py-3 bg-primary text-primary-foreground font-black rounded-xl shadow-[0_0_20px_rgba(0,255,135,0.3)] hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-widest"
            >
              Cadastrar-se
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu Content */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-background border-b border-white/10 p-6 flex flex-col gap-6 animate-in slide-in-from-top duration-300 md:hidden">
            <a href="#oque-e" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-white uppercase tracking-widest">O que é</a>
            <a href="#para-quem" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-white uppercase tracking-widest">Para Quem É</a>
            <a href="#reputacao" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-white uppercase tracking-widest">Reputação</a>
            <a href="#planos" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-white uppercase tracking-widest">Planos</a>
            <Link to="/terms" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-white uppercase tracking-widest">Termos</Link>
            <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
              <button onClick={() => navigate({ to: "/auth/" as any })} className="w-full py-4 bg-white/5 text-white font-bold rounded-xl">Entrar</button>
              <button onClick={() => navigate({ to: "/cadastro" as any })} className="w-full py-4 bg-primary text-primary-foreground font-black rounded-xl">Cadastrar-se</button>
            </div>
          </div>
        )}
      </nav>

      {/* HERO SECTION */}
      <header className="relative pt-32 pb-20 px-6 flex flex-col items-center justify-center text-center overflow-hidden min-h-screen">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/10 rounded-[100%] blur-[120px] -z-10 animate-pulse" />
        
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in duration-1000">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-[0.2em] text-primary">
            <Zap className="w-3 h-3" />
            A Revolução dos Serviços Híbridos
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white leading-[0.9] uppercase italic">
            O Ecossistema Definitivo que Conecta <span className="text-primary text-shadow-glow">Lojistas, Prestadores e Clientes.</span>
          </h1>
          
          <p className="text-muted-foreground text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
            Gestão inteligente de Ordens de Serviço, montagens, assistências e venda de insumos com segurança de pagamento e reputação transparente.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <button 
              onClick={() => navigate({ to: "/auth/" as any })}
              className="px-10 py-5 bg-primary text-primary-foreground font-black rounded-2xl shadow-[0_0_30px_rgba(0,255,135,0.4)] hover:scale-105 active:scale-95 transition-all text-lg uppercase tracking-widest flex items-center justify-center gap-3"
            >
              Acessar Plataforma agora
              <ArrowRight className="w-5 h-5" />
            </button>
            <a 
              href="#planos"
              className="px-10 py-5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl border border-white/10 transition-all text-lg uppercase tracking-widest flex items-center justify-center"
            >
              Conhecer Planos
            </a>
          </div>

          <div className="flex flex-wrap justify-center gap-8 pt-12">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 bg-white/5 px-4 py-2 rounded-full border border-white/5">
              <Lock className="w-3 h-3 text-primary" /> Pagamento 100% Protegido
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 bg-white/5 px-4 py-2 rounded-full border border-white/5">
              <CheckCircle2 className="w-3 h-3 text-primary" /> Garantia de Execução
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 bg-white/5 px-4 py-2 rounded-full border border-white/5">
              <ShieldCheck className="w-3 h-3 text-primary" /> Reputação Auditada
            </div>
          </div>
        </div>
      </header>

      {/* O QUE É O FIXXER & COMO FUNCIONA */}
      <section id="oque-e" className="py-32 px-6 bg-background relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-xs font-black text-primary uppercase tracking-[0.3em]">Como Funciona</h2>
                <h3 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase italic leading-none">
                  A Ponte Tecnológica entre a Venda e a <span className="text-primary">Entrega Perfeita</span>
                </h3>
              </div>
              <p className="text-muted-foreground text-lg leading-relaxed">
                O FIXXER não é apenas um software, é uma infraestrutura industrial que elimina o caos operacional. Conectamos quem vende, quem executa e quem fornece peças, tudo em um fluxo automatizado e seguro.
              </p>
              
              <div className="grid grid-cols-1 gap-4">
                {[
                  { step: "01", title: "Solicitação de O.S.", desc: "O Lojista ou Cliente solicita o serviço via plataforma." },
                  { step: "02", title: "Aceite & Execução", desc: "Prestadores homologados aceitam e executam com fotos." },
                  { step: "03", title: "Suprimento B2B", desc: "Fornecedores enviam peças e insumos necessários." },
                  { step: "04", title: "Liberação & Nota", desc: "Pagamento liberado após validação e avaliação mútua." },
                ].map((item) => (
                  <div key={item.step} className="flex gap-6 p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-primary/20 transition-all group">
                    <div className="text-2xl font-black text-primary/30 group-hover:text-primary transition-colors">{item.step}</div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-white uppercase tracking-tight">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-square rounded-[40px] bg-gradient-to-br from-primary/20 to-transparent border border-white/10 p-2 relative">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=1000')] bg-cover bg-center rounded-[38px] opacity-40 grayscale hover:grayscale-0 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                
                {/* Floating Stats */}
                <div className="absolute -top-10 -right-10 p-6 rounded-3xl bg-card border border-white/10 shadow-2xl animate-bounce duration-[3000ms]">
                  <div className="flex items-center gap-3 text-primary mb-2">
                    <Star className="w-5 h-5 fill-primary" />
                    <span className="text-2xl font-black">4.9</span>
                  </div>
                  <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Média de Satisfação</div>
                </div>

                <div className="absolute -bottom-10 -left-10 p-6 rounded-3xl bg-card border border-white/10 shadow-2xl animate-pulse">
                  <div className="flex items-center gap-3 text-blue-500 mb-2">
                    <Clock className="w-5 h-5" />
                    <span className="text-2xl font-black">-40%</span>
                  </div>
                  <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Tempo de Resposta</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PARA QUEM É O FIXXER? */}
      <section id="para-quem" className="py-32 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-xs font-black text-primary uppercase tracking-[0.4em]">Ecossistema</h2>
            <h3 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase italic">Para quem é o <span className="text-primary">FIXXER?</span></h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Lojistas",
                desc: "Terceirize e gerencie montagens sem dor de cabeça. Reduza custos e acompanhe O.S. em tempo real.",
                icon: <LayoutGrid className="w-6 h-6" />,
                color: "blue"
              },
              {
                title: "Prestadores",
                desc: "Receba um fluxo contínuo de O.S. na sua região. Garantia de recebimento 100% sem calotes.",
                icon: <Users className="w-6 h-6" />,
                color: "green"
              },
              {
                title: "Fornecedores",
                desc: "Venda peças, ferragens e insumos diretamente para lojistas e prestadores em operação ativa.",
                icon: <CreditCard className="w-6 h-6" />,
                color: "purple"
              },
              {
                title: "Clientes",
                desc: "Acompanhe o status do serviço em tempo real com profissionais avaliados e verificados.",
                icon: <Search className="w-6 h-6" />,
                color: "orange"
              }
            ].map((pilar) => (
              <div key={pilar.title} className={`p-8 rounded-[32px] bg-white/5 border border-white/5 hover:border-primary/30 transition-all group flex flex-col h-full ${glassClass}`}>
                <div className={`w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500`}>
                  {pilar.icon}
                </div>
                <h4 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">{pilar.title}</h4>
                <p className="text-muted-foreground leading-relaxed flex-1">{pilar.desc}</p>
                <div className="mt-8 flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  Saiba mais <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SISTEMA DE REPUTAÇÃO & SEGURANÇA */}
      <section id="reputacao" className="py-32 px-6 bg-primary/5 relative">
        <div className="max-w-5xl mx-auto text-center space-y-20">
          <div className="space-y-6">
            <h3 className="text-4xl md:text-5xl font-black text-white uppercase italic tracking-tighter">Motor de Reputação <span className="text-primary">Auditada</span></h3>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Implementamos o mais rigoroso sistema de avaliação mútua do mercado. De 0.0 a 5.0 estrelas, todos se avaliam para garantir o nível industrial de qualidade.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="text-5xl font-black text-white">4.8+</div>
              <div className="text-xs font-black text-primary uppercase tracking-widest">Selo Prestador Ouro</div>
              <p className="text-sm text-muted-foreground">Exclusivo para profissionais com nota máxima em pontualidade e acabamento.</p>
            </div>
            <div className="space-y-4">
              <div className="text-5xl font-black text-white">Escrow</div>
              <div className="text-xs font-black text-primary uppercase tracking-widest">Custódia Segura</div>
              <p className="text-sm text-muted-foreground">O pagamento só é liberado após a comprovação fotográfica do serviço concluído.</p>
            </div>
            <div className="space-y-4">
              <div className="text-5xl font-black text-white">Zero</div>
              <div className="text-xs font-black text-primary uppercase tracking-widest">Taxa de Calote</div>
              <p className="text-sm text-muted-foreground">Tecnologia financeira que protege o capital de quem contrata e a renda de quem presta.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PLANOS E ASSINATURAS */}
      <section id="planos" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h3 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter">Escolha seu Plano <span className="text-primary">FIXXER</span></h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Starter */}
            <div className="p-10 rounded-[40px] bg-white/5 border border-white/5 flex flex-col hover:border-white/20 transition-all">
              <div className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">Starter / Free</div>
              <div className="text-5xl font-black text-white mb-8">R$ 0<span className="text-lg font-normal text-muted-foreground">/mês</span></div>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-center gap-3 text-sm text-muted-foreground font-bold"><CheckCircle2 className="w-4 h-4 text-primary" /> Perfil Básico</li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground font-bold"><CheckCircle2 className="w-4 h-4 text-primary" /> Acesso ao Feed de O.S.</li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground font-bold"><CheckCircle2 className="w-4 h-4 text-primary" /> Pagamento por Serviço</li>
              </ul>
              <button onClick={() => navigate({ to: "/cadastro" as any })} className="w-full py-5 rounded-2xl bg-white/5 text-white font-black uppercase tracking-widest hover:bg-white/10 transition-all">Começar Grátis</button>
            </div>

            {/* Pro */}
            <div className="p-10 rounded-[40px] bg-primary/10 border-2 border-primary flex flex-col relative scale-105 shadow-[0_0_50px_rgba(0,255,135,0.15)]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-[0.2em] rounded-full">Mais Escolhido</div>
              <div className="text-xs font-black text-primary uppercase tracking-widest mb-4">Pro / Elite</div>
              <div className="text-5xl font-black text-white mb-8">R$ 149<span className="text-lg font-normal text-muted-foreground">/mês</span></div>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-center gap-3 text-sm text-white font-bold"><CheckCircle2 className="w-4 h-4 text-primary" /> Taxas Reduzidas</li>
                <li className="flex items-center gap-3 text-sm text-white font-bold"><CheckCircle2 className="w-4 h-4 text-primary" /> Destaque no Feed</li>
                <li className="flex items-center gap-3 text-sm text-white font-bold"><CheckCircle2 className="w-4 h-4 text-primary" /> Relatórios de Produtividade</li>
                <li className="flex items-center gap-3 text-sm text-white font-bold"><CheckCircle2 className="w-4 h-4 text-primary" /> Prioridade de Chamados</li>
              </ul>
              <button onClick={() => navigate({ to: "/cadastro" as any })} className="w-full py-5 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest shadow-[0_0_20px_rgba(0,255,135,0.3)] hover:scale-105 transition-all">Assinar Pro</button>
            </div>

            {/* Enterprise */}
            <div className="p-10 rounded-[40px] bg-white/5 border border-white/5 flex flex-col hover:border-white/20 transition-all">
              <div className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">Enterprise</div>
              <div className="text-5xl font-black text-white mb-8">R$ 399<span className="text-lg font-normal text-muted-foreground">/mês</span></div>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-center gap-3 text-sm text-muted-foreground font-bold"><CheckCircle2 className="w-4 h-4 text-primary" /> Catálogo Ilimitado B2B</li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground font-bold"><CheckCircle2 className="w-4 h-4 text-primary" /> Integração via API</li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground font-bold"><CheckCircle2 className="w-4 h-4 text-primary" /> Suporte 24/7 Dedicado</li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground font-bold"><CheckCircle2 className="w-4 h-4 text-primary" /> Gestão Multi-Redes</li>
              </ul>
              <button onClick={() => navigate({ to: "/cadastro" as any })} className="w-full py-5 rounded-2xl bg-white/5 text-white font-black uppercase tracking-widest hover:bg-white/10 transition-all">Falar com Consultor</button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-20 px-6 border-t border-white/5 bg-background">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-black text-xl">F</div>
              <span className="text-xl font-black tracking-tighter text-white">FIXXER</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">A infraestrutura tecnológica definitiva para o mercado de serviços e montagem industrial.</p>
          </div>
          
          <div className="space-y-6">
            <h5 className="text-xs font-black text-white uppercase tracking-widest">Plataforma</h5>
            <ul className="space-y-4">
              <li><a href="#oque-e" className="text-sm text-muted-foreground hover:text-primary transition-colors">O que é</a></li>
              <li><a href="#para-quem" className="text-sm text-muted-foreground hover:text-primary transition-colors">Para Quem É</a></li>
              <li><a href="#planos" className="text-sm text-muted-foreground hover:text-primary transition-colors">Planos</a></li>
            </ul>
          </div>

          <div className="space-y-6">
            <h5 className="text-xs font-black text-white uppercase tracking-widest">Legal</h5>
            <ul className="space-y-4">
              <li><Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">Termos de Uso</Link></li>
              <li><Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacidade</Link></li>
            </ul>
          </div>

          <div className="space-y-6">
            <h5 className="text-xs font-black text-white uppercase tracking-widest">Suporte</h5>
            <div className="flex items-center gap-3 text-muted-foreground hover:text-white transition-colors cursor-pointer">
              <Mail className="w-4 h-4" />
              <span className="text-sm">suporte@fixxer.com.br</span>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
          <div>© 2026 FIXXER TECNOLOGIA LTDA.</div>
          <div className="flex items-center gap-6">
            <span>Brasil</span>
            <span>Cloud Infrastructure</span>
          </div>
        </div>
        <div id="ts-visual-edit-probe-d520cb08b4a84053" className="hidden">Edição Visual Aplicada</div>
      </footer>
    </div>
  );
}
