# Plano: Ajuste Estético e Reorganização do Painel (Desktop)

O objetivo é reorganizar a disposição dos itens na página de Info Produtos e nos painéis de usuário para evitar sobreposição do card de perfil (`ProfileSummaryCard`) e melhorar a estética visual em telas desktop, seguindo a referência visual enviada.

## Ações Propostas

### 1. Reorganização do Layout Principal (Desktop)
- Ajustar o `ProfileHeader.tsx` para garantir que o cabeçalho e as ações não conflitem com a sidebar fixa.
- Adicionar um recuo (padding-left) no conteúdo principal (`main`) quando a sidebar fixa estiver ativa em telas desktop (lg+).
- Refatorar o grid de layouts nos componentes que utilizam o `ProfileHeader`.

### 2. Melhoria Visual do Cabeçalho e Ações
- Unificar a barra de botões de ação no topo, integrando-a ao header de forma mais limpa, conforme a imagem de referência (Creator Studio).
- Ajustar o z-index e posicionamento para evitar sobreposição indesejada.

### 3. Ajustes no ProfileSummaryCard
- Refinar o estilo da variante `sidebar` para que ela se integre melhor à lateral, sem "flutuar" excessivamente sobre o conteúdo.

## Detalhes Técnicos
- **CSS/Tailwind:** Utilização de `lg:pl-72` (ou valor similar) no contêiner principal para abrir espaço para o card fixo na esquerda.
- **Estrutura DOM:** Garantir que o `ProfileHeader` não encapsule o conteúdo de forma a quebrar o fluxo de grid lateral.
- **Z-Index:** Padronizar `z-40` para o card e `z-50` para o header sticky.

## Relatório de Execução Previsto
- [ ] Refatoração de `src/components/ProfileHeader.tsx`.
- [ ] Ajustes de padding em `src/routes/_authenticated.admin/infoprodutos.tsx`.
- [ ] Ajustes de estilo em `src/components/ProfileSummaryCard.tsx`.
