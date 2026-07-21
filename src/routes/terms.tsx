import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Shield, FileText, Lock, Users, Activity, HelpCircle, Clock } from "lucide-react";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-20">
        {/* Navigation / Back */}
        <Link 
          to="/"
          className="inline-flex items-center gap-2 text-xs font-black text-muted-foreground hover:text-primary transition-colors uppercase tracking-[0.2em] mb-12 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar para o Início
        </Link>

        {/* Header */}
        <header className="space-y-6 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
            <Shield className="w-3 h-3" />
            Compliance FIXXER
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white italic tracking-tighter uppercase leading-none">
            Termos de <span className="text-primary text-shadow-glow">Uso</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">
            Bem-vindo à plataforma FIXXER. Estes termos regem a utilização de nossa infraestrutura de serviços, garantindo segurança, transparência e qualidade industrial para todos os membros do ecossistema.
          </p>
          <div className="pt-4 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
              <Clock className="w-3 h-3 text-primary" /> Atualizado em: 21 de Julho de 2026
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
              <FileText className="w-3 h-3 text-primary" /> Versão 1.4.2
            </div>
          </div>
        </header>

        {/* Content Sections */}
        <div className="grid grid-cols-1 gap-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          <section className="space-y-6 p-8 rounded-[32px] bg-white/5 border border-white/5 hover:border-primary/10 transition-all group">
            <div className="flex items-center gap-4 text-white">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight italic">1. Aceitação dos Termos</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed pl-14">
              Ao acessar, cadastrar-se ou utilizar qualquer funcionalidade da FIXXER, você confirma que leu, entendeu e aceita integralmente estes Termos de Uso. Este é um contrato vinculativo entre você (ou a entidade que representa) e a FIXXER TECNOLOGIA LTDA.
            </p>
          </section>

          <section className="space-y-6 p-8 rounded-[32px] bg-white/5 border border-white/5 hover:border-primary/10 transition-all group">
            <div className="flex items-center gap-4 text-white">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight italic">2. Regras para os Pilares</h2>
            </div>
            <div className="pl-14 space-y-6">
              <div className="space-y-2">
                <h4 className="text-white font-bold uppercase tracking-tight text-sm">Lojistas e Clientes:</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">Devem fornecer informações precisas sobre o local de serviço e produtos. O cancelamento injustificado de O.S. após o deslocamento do prestador pode acarretar multas operacionais.</p>
              </div>
              <div className="space-y-2">
                <h4 className="text-white font-bold uppercase tracking-tight text-sm">Prestadores e Técnicos:</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">Devem manter conduta profissional, utilizar EPIs quando necessário e realizar o registro fotográfico (check-in/check-out) conforme exigido para liberação de pagamentos.</p>
              </div>
              <div className="space-y-2">
                <h4 className="text-white font-bold uppercase tracking-tight text-sm">Fornecedores:</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">Garantem a veracidade da disponibilidade de estoque e a conformidade técnica das peças e ferragens anunciadas no ecossistema.</p>
              </div>
            </div>
          </section>

          <section className="space-y-6 p-8 rounded-[32px] bg-white/5 border border-white/5 hover:border-primary/10 transition-all group">
            <div className="flex items-center gap-4 text-white">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Activity className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight italic">3. Sistema de Reputação (0 a 5 Estrelas)</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed pl-14">
              A FIXXER utiliza um motor de Avaliação Mútua Obrigatória. Ao final de cada O.S., as partes devem atribuir uma nota de 0 a 5. Tentativas de manipulação de reputação, avaliações falsas ou coercitivas resultarão na suspensão imediata da conta sem aviso prévio. A FIXXER reserva-se o direito de auditar qualquer avaliação a seu critério exclusivo.
            </p>
          </section>

          <section className="space-y-6 p-8 rounded-[32px] bg-white/5 border border-white/5 hover:border-primary/10 transition-all group">
            <div className="flex items-center gap-4 text-white">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight italic">4. Custódia e Liberação de Valores</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed pl-14">
              Operamos via Sistema de Escrow (Custódia Segura). O valor contratado é debitado do pagador no aceite da proposta e mantido em conta de custódia protegida. A liberação para o prestador ocorre em até 24h após a validação do serviço pela plataforma (fotos de conclusão). Em caso de disputa, o valor permanecerá retido até a resolução técnica pela equipe de suporte FIXXER.
            </p>
          </section>

          <section className="space-y-6 p-8 rounded-[32px] bg-white/5 border border-white/5 hover:border-primary/10 transition-all group">
            <div className="flex items-center gap-4 text-white">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight italic">5. Responsabilidade e Conflitos</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed pl-14">
              A FIXXER atua como facilitadora tecnológica e infraestrutura de gestão. A responsabilidade técnica pela execução do serviço é integral do prestador. No entanto, o seguro de garantia FIXXER pode ser acionado em casos de danos materiais comprovados via auditoria interna, limitado aos termos da apólice vigente.
            </p>
          </section>
        </div>

        {/* Footer actions */}
        <div className="mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
            © 2026 FIXXER TECNOLOGIA LTDA. | Todos os direitos reservados.
          </div>
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="px-8 py-4 bg-primary/10 hover:bg-primary/20 text-primary font-black rounded-2xl border border-primary/20 transition-all text-xs uppercase tracking-widest"
          >
            Voltar ao Topo
          </button>
        </div>
      </div>
      <div id="ts-visual-edit-probe-6b996a2ca6c446cc" className="hidden">Edição Visual Aplicada</div>
    </div>
  );
}

// Helper icons needed but might not be in Lucide directly or need specific imports
function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
