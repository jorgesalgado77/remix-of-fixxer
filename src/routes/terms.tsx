import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Termos de Uso</h1>
        
        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <p>Última atualização: 21 de Julho de 2026.</p>
          
          <h2 className="text-xl font-bold text-white">1. Aceitação dos Termos</h2>
          <p>Ao acessar e utilizar a plataforma FIXXER, você concorda em cumprir integralmente estes termos.</p>
          
          <h2 className="text-xl font-bold text-white">2. Regras de Utilização</h2>
          <p>Cada categoria de usuário (Lojista, Prestador, Fornecedor e Cliente) deve atuar conforme as diretrizes operacionais estabelecidas para manter a integridade da plataforma.</p>
          
          <h2 className="text-xl font-bold text-white">3. Sistema de Avaliação</h2>
          <p>A FIXXER preza pela transparência. Avaliações falsas são estritamente proibidas e podem resultar em banimento permanente.</p>

          <h2 className="text-xl font-bold text-white">4. Custódia de Pagamento</h2>
          <p>Os valores de serviços são retidos pela plataforma como medida de segurança (Escrow) e liberados apenas após a conclusão e validação do serviço.</p>
        </div>

        <button 
          onClick={() => window.history.back()}
          className="bg-primary text-primary-foreground font-bold px-8 py-4 rounded-xl"
        >
          Voltar para o Início
        </button>
      </div>
    </div>
  );
}
