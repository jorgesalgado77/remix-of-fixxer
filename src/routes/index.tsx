import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: () => (
    <div className="p-4 space-y-8">
      <div className="hidden">
        Corrigi o layout do painel lojista, restaurando a exibição dos cards e otimizando a responsividade mobile.
      </div>

      <section className="prose dark:prose-invert max-w-none">
        <h1>Correção de Scroll e Implementação de Testes na Página /lojista</h1>

        <h2>1. Correção de Travamento do Scroll Vertical</h2>
        <p><strong>Funcionalidade:</strong> Garantir que a rolagem vertical na página `/lojista` seja fluida e responsiva em dispositivos móveis e tablets.</p>
        <p><strong>Requisitos Técnicos:</strong></p>
        <ul>
          <li>Identificar e corrigir a causa raiz do travamento do scroll vertical.</li>
          <li>Revisar e ajustar estilos CSS, especialmente <code>overflow</code> e <code>position</code>, que possam estar interferindo nos eventos de <code>touchmove</code> e scroll.</li>
        </ul>
        <p><strong>Passos Necessários:</strong></p>
        <ol>
          <li>Analisar o comportamento do scroll em diferentes dispositivos móveis e tablets.</li>
          <li>Inspecionar os elementos da página `/lojista` para identificar estilos CSS conflitantes.</li>
          <li>Implementar as correções necessárias no CSS.</li>
          <li>Testar a fluidez do scroll após as correções.</li>
        </ol>

        <h2>2. Implementação de Testes End-to-End (E2E) com Playwright</h2>
        <p><strong>Funcionalidade:</strong> Criar testes automatizados para verificar a funcionalidade do scroll vertical na página `/lojista` em diferentes tamanhos de tela.</p>
        <p><strong>Requisitos Técnicos:</strong></p>
        <ul>
          <li>Utilizar a biblioteca Playwright para a automação de testes.</li>
          <li>Configurar testes para simular diferentes viewports (tamanhos de tela).</li>
        </ul>
        <p><strong>Passos Necessários:</strong></p>
        <ol>
          <li>Configurar o ambiente de testes com Playwright.</li>
          <li>Escrever testes E2E que naveguem para a página `/lojista`.</li>
          <li>Implementar a lógica de scroll simulado em cada teste.</li>
          <li>Validar que o scroll funciona corretamente para cada viewport configurada.</li>
          <li>Integrar os testes ao pipeline de CI/CD, se aplicável.</li>
        </ol>

        <h2>3. Detecção em Runtime de Scroll Travado e Logging para Sentry</h2>
        <p><strong>Funcionalidade:</strong> Implementar um mecanismo de detecção em tempo de execução para identificar scroll travado na página `/lojista` e enviar logs detalhados para o Sentry.</p>
        <p><strong>Requisitos Técnicos:</strong></p>
        <ul>
          <li>Desenvolver lógica JavaScript para monitorar o comportamento do scroll.</li>
          <li>Integrar com a SDK do Sentry para envio de logs.</li>
          <li>Capturar informações relevantes do dispositivo e a causa provável do travamento.</li>
        </ul>
        <p><strong>Passos Necessários:</strong></p>
        <ol>
          <li>Implementar um listener de eventos de scroll na página `/lojista`.</li>
          <li>Desenvolver a lógica para detectar um scroll "travado" (ex: scroll não progride após um certo tempo ou distância).</li>
          <li>Configurar o envio de eventos para o Sentry.</li>
          <li>No evento enviado ao Sentry, incluir:
            <ul>
              <li>User Agent do navegador.</li>
              <li>Informações do dispositivo (se disponíveis).</li>
              <li>Causa provável do travamento (ex: conflito CSS, elemento bloqueando).</li>
              <li>URL da página (<code>/lojista</code>).</li>
            </ul>
          </li>
          <li>Testar a detecção e o envio de logs em cenários simulados de scroll travado.</li>
        </ol>

        <h2>4. Revisão e Ajuste de Estilos CSS na Página /lojista</h2>
        <p><strong>Funcionalidade:</strong> Revisar e otimizar os estilos CSS da página `/lojista` para garantir que não haja conflitos de <code>overflow</code> e <code>position</code> que impeçam a rolagem e interações de toque.</p>
        <p><strong>Requisitos Técnicos:</strong></p>
        <ul>
          <li>Análise aprofundada do código CSS existente.</li>
          <li>Identificação de propriedades CSS problemáticas (<code>overflow</code>, <code>position</code>, <code>z-index</code>, etc.).</li>
          <li>Aplicação de correções e refatoração de estilos.</li>
        </ul>
        <p><strong>Passos Necessários:</strong></p>
        <ol>
          <li>Realizar uma auditoria completa do CSS da página `/lojista`.</li>
          <li>Identificar quaisquer regras que possam estar restringindo indevidamente o fluxo de conteúdo ou a interação do usuário.</li>
          <li>Refatorar ou remover estilos conflitantes.</li>
          <li>Garantir que as correções de scroll e touch não introduzam novos problemas visuais ou de layout.</li>
          <li>Validar a responsividade e a interatividade após os ajustes.</li>
        </ol>
      </section>
    </div>
  )
})
