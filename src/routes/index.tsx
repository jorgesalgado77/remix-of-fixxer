import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { 
  ShieldCheck, 
  CreditCard,
  ChevronRight,
  Zap,
  Lock,
  Mail,
  LayoutGrid
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

      {/* Admin Features Info / Visual Edit Probe */}
      <div className="px-6 py-12 border-t border-white/5 bg-white/2 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className={`p-6 rounded-3xl ${glassClass} border border-white/5`}>
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-white">Segurança de Acesso</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Verifique se apenas o usuário administrador tem acesso ao Painel Administrativo e se as rotas ficam bloqueadas para usuários comuns.
            </p>
          </div>

          <div className={`p-6 rounded-3xl ${glassClass} border border-white/5`}>
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-white">Gestão de Admins</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Implemente um fluxo para criar e gerenciar usuários administradores com base em uma lista de emails autorizados, sem precisar editar código.
            </p>
          </div>

          <div className={`p-6 rounded-3xl ${glassClass} border border-white/5`}>
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-white">Navegação Fluida</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Garanta que os componentes de navegação usam o import correto de Link no projeto para eliminar erros de build e manter consistência na UI.
            </p>
          </div>

          <div className={`p-6 rounded-3xl ${glassClass} border border-white/5`}>
            <div className="flex items-center gap-3 mb-4">
              <LayoutGrid className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-white">Painel Central</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Crie um dashboard no painel administrativo com atalhos para todas as telas do sistema e indicadores do status da conta.
            </p>
          </div>
        </div>

        <div className="flex justify-around items-center gap-4 mt-12 opacity-70">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">Seguro</span>
          </div>
          <div className="flex items-center gap-2 text-primary">
            <Zap className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">Rápido</span>
          </div>
          <div className="flex items-center gap-2 text-primary">
            <CreditCard className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">Split</span>
          </div>
        </div>
      </div>
    </div>
  );
}
