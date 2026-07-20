import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { 
  ShieldCheck, 
  CreditCard,
  ChevronRight,
  Zap,
  Lock,
  Mail,
  LayoutGrid,
  Activity
} from "lucide-react";
import { usePerformanceMode } from "@/hooks/use-performance-mode";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { glassClass } = usePerformanceMode();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      {/* Hero Section */}
      <header className="relative flex-1 flex flex-col items-center justify-center px-6 py-12 text-center overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 rounded-[100%] blur-3xl -z-10 -translate-y-1/2" />
        
        <div className="max-w-md mx-auto animate-in fade-in zoom-in duration-700">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-3xl shadow-[0_0_30px_rgba(0,255,135,0.4)] text-primary-foreground font-black text-3xl mb-8">
            F
          </div>
          
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
            A evolução da <br />
            <span className="text-primary">gestão em marcenaria</span>
          </h1>
          
          <p className="text-muted-foreground text-lg leading-relaxed mb-10 px-4">
            A plataforma definitiva para lojistas, prestadores e fornecedores do setor moveleiro.
          </p>

          <div className="flex flex-col gap-4 w-full">
            <button 
              onClick={() => navigate({ to: "/auth" })}
              className="w-full bg-primary text-primary-foreground font-bold py-5 rounded-2xl shadow-[0_0_20px_rgba(0,255,135,0.3)] active:scale-[0.98] hover:opacity-90 transition-all flex items-center justify-center gap-2 text-lg"
            >
              Começar Agora
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

  {/* Section: Planos de Assinatura */}
      <section className="px-6 py-20 bg-background border-t border-white/5" id="planos">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-black text-center text-white mb-16 tracking-tight">
            Escolha o seu plano <span className="text-primary">FIXXER</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Lojista */}
            <div className={`p-8 rounded-3xl ${glassClass} border border-white/10 flex flex-col`}>
              <h3 className="text-xl font-bold text-white mb-4">Lojista</h3>
              <p className="text-muted-foreground text-sm mb-8 flex-1">Gestão de múltiplos profissionais, antifraude de contratos e auditoria de laudos.</p>
              <div className="text-3xl font-black text-white mb-8">R$ 299<span className="text-sm text-muted-foreground font-normal">/mês</span></div>
              <button className="w-full py-4 rounded-xl bg-white/10 hover:bg-white/20 transition-all font-bold text-white">Selecionar</button>
            </div>

            {/* Prestador */}
            <div className={`p-8 rounded-3xl ${glassClass} border border-primary/30 flex flex-col relative`}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-[10px] font-black uppercase rounded-full">Popular</div>
              <h3 className="text-xl font-bold text-white mb-4">Prestador</h3>
              <p className="text-muted-foreground text-sm mb-8 flex-1">Lotação de agenda, badges de verificação e liberação acelerada de recebíveis.</p>
              <div className="text-3xl font-black text-white mb-8">R$ 149<span className="text-sm text-muted-foreground font-normal">/mês</span></div>
              <button className="w-full py-4 rounded-xl bg-primary text-primary-foreground transition-all font-bold">Selecionar</button>
            </div>

            {/* Fornecedor */}
            <div className={`p-8 rounded-3xl ${glassClass} border border-white/10 flex flex-col`}>
              <h3 className="text-xl font-bold text-white mb-4">Fornecedor</h3>
              <p className="text-muted-foreground text-sm mb-8 flex-1">Anúncios na dashboard, captação de leads de materiais e vitrine destacada.</p>
              <div className="text-3xl font-black text-white mb-8">R$ 399<span className="text-sm text-muted-foreground font-normal">/mês</span></div>
              <button className="w-full py-4 rounded-xl bg-white/10 hover:bg-white/20 transition-all font-bold text-white">Selecionar</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
