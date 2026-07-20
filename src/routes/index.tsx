import { createFileRoute } from "@tanstack/react-router";
import { 
  Hammer, 
  MessageSquare, 
  LayoutDashboard, 
  Users, 
  TrendingUp, 
  ShieldCheck, 
  CreditCard,
  ChevronRight,
  Star,
  Zap
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-primary/20">
      {/* Hero Section */}
      <header className="relative overflow-hidden bg-white px-6 pt-16 pb-12 text-center border-b border-slate-200">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50" />
        
        <div className="relative z-10 max-w-lg mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold mb-6">
            <Zap className="w-3 h-3 fill-current" />
            <span>WEBAPP FIXXER</span>
          </div>
          
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-4 leading-tight">
            Ecossistema Completo para <span className="text-blue-600">Marcenarias</span>
          </h1>
          
          <p className="text-slate-600 text-sm leading-relaxed mb-8">
            Intermediação, gestão de projetos e fluxo financeiro automatizado. 
            Otimizado para performance mobile extrema.
          </p>

          <div className="flex flex-col gap-3">
            <button className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 active:scale-95 transition-transform flex items-center justify-center gap-2">
              Começar Agora
              <ChevronRight className="w-4 h-4" />
            </button>
            <button className="w-full bg-white border border-slate-200 text-slate-700 font-semibold py-4 rounded-xl active:scale-95 transition-transform">
              Ver Demonstração
            </button>
          </div>
        </div>
      </header>

      {/* Quick Access Grid */}
      <main className="flex-1 px-6 py-10">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">Diretrizes do Projeto</h2>
        
        <div className="grid grid-cols-1 gap-4">
          <FeatureCard 
            icon={<ShieldCheck className="w-5 h-5 text-emerald-500" />}
            title="Antifraude & Segurança"
            description="Comprovação obrigatória de contratos e auditoria visual em todas as etapas."
          />
          <FeatureCard 
            icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
            title="Split Financeiro (ASAAS)"
            description="Pagamentos automáticos baseados em gatilhos contratuais e entregas."
          />
          <FeatureCard 
            icon={<LayoutDashboard className="w-5 h-5 text-indigo-500" />}
            title="Linha de Produção Digital"
            description="Acompanhamento em tempo real: do Medidor ao Supervisor."
          />
          <FeatureCard 
            icon={<MessageSquare className="w-5 h-5 text-orange-500" />}
            title="Comunicação Integrada"
            description="Chat interno seguro com compressão de imagem e alertas via WhatsApp."
          />
        </div>

        {/* Development Philosophy Section */}
        <div className="mt-12 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-amber-50 p-2 rounded-lg">
              <Star className="w-5 h-5 text-amber-500 fill-current" />
            </div>
            <h3 className="font-bold text-slate-900">Regras de Ouro</h3>
          </div>
          <ul className="space-y-4">
            <li className="flex gap-3 items-start">
              <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
              <p className="text-xs text-slate-600 leading-normal">
                <span className="font-bold text-slate-900">Performance Mobile:</span> Foco em hardware de entrada e baixa memória RAM.
              </p>
            </li>
            <li className="flex gap-3 items-start">
              <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
              <p className="text-xs text-slate-600 leading-normal">
                <span className="font-bold text-slate-900">Fluidez Visual:</span> Sem efeitos pesados ou loops de renderização desnecessários.
              </p>
            </li>
            <li className="flex gap-3 items-start">
              <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
              <p className="text-xs text-slate-600 leading-normal">
                <span className="font-bold text-slate-900">Integridade:</span> Auditoria minuciosa para evitar duplicação e quebras de código.
              </p>
            </li>
          </ul>
        </div>
      </main>

      {/* Bottom Nav / Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-sm">
              F
            </div>
            <span className="font-bold tracking-tight">FIXXER</span>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Users className="w-4 h-4" />
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Hammer className="w-4 h-4" />
            </div>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 text-center">
          © 2026 FIXXER Ecosystem. Todos os direitos reservados.
        </p>
      </footer>
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
