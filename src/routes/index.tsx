import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: () => (
    <div className="p-4 prose dark:prose-invert max-w-none">
      <h2>Correção de Scroll Persistente na Página "/lojista"</h2>

      <p><strong>Problema:</strong></p>
      <p>O comportamento de scroll na página <code>/lojista</code> não está funcionando como esperado e persiste um problema que impede a navegação correta.</p>

      <p><strong>Objetivo:</strong></p>
      <p>Corrigir o problema de scroll na página <code>/lojista</code> para garantir que a funcionalidade de rolagem esteja operante e fluida.</p>

      <p><strong>Requisitos:</strong></p>
      <ul>
        <li>Identificar a causa raiz do problema de scroll.</li>
        <li>Implementar a correção necessária para restaurar o comportamento adequado do scroll.</li>
        <li>Testar exaustivamente a página <code>/lojista</code> para garantir que o scroll funcione em diferentes dispositivos e navegadores.</li>
      </ul>

      <p><strong>Passos Sugeridos:</strong></p>
      <ol>
        <li>Analisar o código-fonte da página <code>/lojista</code>, focando em scripts relacionados ao scroll, CSS e estrutura HTML.</li>
        <li>Verificar conflitos com outras bibliotecas ou scripts que possam estar afetando o scroll.</li>
        <li>Realizar testes de depuração para isolar o componente ou a linha de código responsável pelo erro.</li>
        <li>Aplicar a correção e testar novamente.</li>
      </ol>
    </div>
  )
})
