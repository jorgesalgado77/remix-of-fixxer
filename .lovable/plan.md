# Plano de Acessibilidade e Dados Reais do Modal PIX (Prompt 15.8)

Refatorar o `PixManagerModal` para garantir acessibilidade plena, carregamento síncrono de dados reais e filtros financeiros precisos.

## Mudanças sugeridas

### Acessibilidade e UX
- **Gestão de Foco**: Garantir que o foco fique retido no `DialogContent` do Radix e retorne ao acionador no fechamento.
- **Controles de Fechamento**: Adicionar botão "X" visível no canto superior direito e suporte nativo a ESC.
- **Skeletons**: Implementar `Skeleton` loaders para as métricas e campos de formulário enquanto a identidade e as estatísticas carregam.

### Integração de Dados Reais
- **Saldos do Usuário**: Substituir métricas mock por agregações reais do hook `useProviderStats` atualizado.
- **Chave PIX**: 
    - Validar `pix_key` real do Supabase.
    - Se ausente, exibir CTA: "Configurar Chave PIX" com link para `/configuracoes`.
- **Filtros de Período**:
    - Adicionar UI de `Tabs` ou `Select` para 7, 15, 30 dias.
    - Implementar filtro personalizado por datas (`Popover` + `Calendar`).

### Tecnologias e Lógica
- **Filtros**: Usar `subDays` (date-fns ou nativo) para enviar `dateRange` ao Supabase.
- **Navegação**: Usar `useNavigate` para o redirecionamento de configuração.
- **Performance**: Invalidação de queries via `queryClient` ao trocar o período.

## Detalhes Técnicos
- Refatorar `src/components/PixManagerModal.tsx`.
- Expandir `src/hooks/use-provider-stats.ts` para suportar filtros de tempo.
- Ajustar `src/routes/_authenticated.tsx` para passar a chave PIX fresca.

## Testes de Verificação
- **ESC Key**: Deve fechar o modal.
- **Sem Chave**: Deve aparecer o botão de "Configurar".
- **Filtro 7d**: Deve diminuir o saldo para refletir apenas a última semana.
- **Mobile**: O foco deve circular entre os campos sem escapar para o fundo da página.
