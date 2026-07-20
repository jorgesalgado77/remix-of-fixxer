import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { 
  ShieldCheck, 
  CreditCard,
  ChevronRight,
  Zap
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">
      {/* Hero Section */}
      <header className="relative flex-1 flex flex-col items-center justify-center px-6 py-12 text-center overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-50/50 rounded-[100%] blur-3xl -z-10 -translate-y-1/2" />
        
        <div className="max-w-md mx-auto animate-in fade-in zoom-in duration-700">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-3xl shadow-2xl shadow-blue-200 text-white font-black text-3xl mb-8">
            F
          </div>
          
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.1]">
            A evolução da <br />
            <span className="text-blue-600">gestão em marcenaria</span>
          </h1>
          
          <p className="text-slate-500 text-lg leading-relaxed mb-10 px-4">
            A plataforma definitiva para lojistas, prestadores e fornecedores do setor moveleiro.
          </p>

          <div className="flex flex-col gap-4 w-full">
            <button 
              onClick={() => navigate({ to: "/auth" })}
              className="w-full bg-blue-600 text-white font-bold py-5 rounded-2xl shadow-xl shadow-blue-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg"
            >
              Começar Agora
              <ChevronRight className="w-5 h-5" />
            </button>
            <p className="text-slate-400 text-sm font-medium">
              Gestão financeira, projetos e automação.
            </p>
          </div>
        </div>
      </header>

      {/* Trust Badges / Mini-features */}
      <div className="px-6 py-8 border-t border-slate-50">
        <div className="flex justify-around items-center gap-4 opacity-50 grayscale">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Seguro</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Rápido</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Split</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm active:bg-slate-50 transition-colors flex gap-4">
      <div className="bg-slate-50 w-12 h-12 rounded-xl flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-slate-900 text-sm mb-1">{title}</h4>
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
