import { createFileRoute } from '@tanstack/react-router';
import { Crown, ShieldCheck, CheckCircle2, ArrowRight, Coins, Info, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/_authenticated/ajuda')({
  component: HelpPage,
});

function HelpPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-12 pb-20">
      <header className="space-y-4">
        <div className="flex items-center gap-3 text-primary">
          <HelpCircle className="w-8 h-8" />
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">Central de Ajuda FIXXER</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Entenda como funciona o Selo Ouro e a Verificação de CNPJ para destacar seu perfil.
        </p>
      </header>

      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <Crown className="w-6 h-6 text-amber-400" />
          <h2 className="text-xl font-bold uppercase tracking-widest text-white">Selo Ouro (Plano Premium)</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-primary">O que é?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              O Selo Ouro identifica usuários do Plano Premium. É o nível mais alto de reconhecimento na plataforma, garantindo visibilidade prioritária em todos os feeds e buscas.
            </p>
            <h3 className="font-bold text-lg text-primary">Vantagens:</h3>
            <ul className="space-y-2">
              {[
                "Destaque visual exclusivo no perfil e cards",
                "Prioridade máxima nos resultados de busca",
                "Anúncios e solicitações ilimitadas",
                "Suporte prioritário via WhatsApp dedicado",
                "Maiores bonificações mensais de moedas"
              ].map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-amber-400/5 border border-amber-400/20 p-6 rounded-3xl flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-bold text-amber-300">Como Adquirir?</h3>
              <p className="text-sm text-amber-300/70">
                1. Acesse o menu de Planos.<br/>
                2. Selecione o Plano Premium.<br/>
                3. Complete o pagamento via PIX ou Cartão.<br/>
                4. O selo é ativado instantaneamente após a confirmação.
              </p>
            </div>
            <Button 
              className="mt-6 bg-amber-400 text-black font-black uppercase tracking-widest hover:bg-amber-500"
              onClick={() => {
                 window.dispatchEvent(new CustomEvent('fixxer:open-plan-details'));
              }}
            >
              Fazer Upgrade Agora
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <h2 className="text-xl font-bold uppercase tracking-widest text-white">CNPJ Verificado</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-primary">O que é?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A verificação de CNPJ garante que sua empresa é real e ativa. Isso gera confiança imediata para novos parceiros e clientes.
            </p>
            <h3 className="font-bold text-lg text-primary">Documentos Necessários:</h3>
            <ul className="space-y-2">
              {[
                "Cartão CNPJ atualizado (emissão < 30 dias)",
                "Contrato Social ou Requerimento de Empresário",
                "Foto da Fachada ou Comprovante de Endereço"
              ].map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-emerald-400/5 border border-emerald-400/20 p-6 rounded-3xl flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-bold text-emerald-300">Passo a Passo:</h3>
              <p className="text-sm text-emerald-300/70">
                1. Tenha 50 moedas em saldo para a taxa de análise.<br/>
                2. Acesse seu Perfil e clique em "Verificar CNPJ".<br/>
                3. Faça o upload dos documentos solicitados.<br/>
                4. Aguarde a análise (até 48h úteis).
              </p>
            </div>
            <Button 
              variant="outline"
              className="mt-6 border-emerald-400/50 text-emerald-400 font-bold uppercase tracking-widest hover:bg-emerald-400/10"
              onClick={() => {
                window.location.href = '/profile?focus=verification';
              }}
            >
              Iniciar Verificação
            </Button>
          </div>
        </div>
      </section>

      <div className="bg-primary/10 border border-primary/20 p-6 rounded-3xl flex items-center gap-4">
        <Coins className="w-10 h-10 text-primary animate-pulse" />
        <div>
          <h4 className="font-bold text-white uppercase italic">Dúvidas sobre pagamentos?</h4>
          <p className="text-xs text-muted-foreground">
            Todas as transações são protegidas e registradas em seu histórico financeiro. 
            Em caso de problemas, acione nosso suporte master.
          </p>
        </div>
      </div>
    </div>
  );
}
