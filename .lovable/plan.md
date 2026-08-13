# Plano de Implementação - Dashboard de Afiliados, Conciliação e Antifraude

Este plano detalha a implementação do dashboard no Creator Studio para links e comissões, o sistema de conciliação de splits/webhooks e a fila de revisão antifraude no Admin Master.

## Tarefas Técnicas

### 1. Backend & Banco de Dados
- Criar migração para a tabela `info_webhook_logs` (idempotência e reprocessamento).
- Criar tabela `info_fraud_queue` para gestão de revisões manuais.
- Adicionar RPC `reprocess_failed_webhook` para recuperação de falhas.

### 2. Creator Studio (Dashboard de Afiliados)
- Desenvolver nova aba "Afiliados" no `CreatorProductForm` ou `PanelActions`.
- Exibir lista de links gerados, cliques, conversões e comissões acumuladas.
- Adicionar filtros por período e produto.

### 3. Admin Master (Conciliação e Antifraude)
- Implementar aba "Conciliação" para monitorar splits e falhas de webhook.
- Criar "Fila de Revisão" com ações de Aprovar, Cancelar e Revogar.
- Implementar exportação CSV robusta para eventos de afiliados (cliques, splits, revogações).

### 4. Integração & Segurança
- Reforçar o middleware do webhook ASAAS para registrar logs de tentativa/falha.
- Garantir que a revogação de comissão atualize o saldo do afiliado corretamente.

## Detalhes Adicionais
- As exportações CSV seguirão o padrão do sistema com cabeçalhos sanitizados.
- A interface manterá o estilo visual "Cyberpunk/Minimalist" da Fixxer Academy.
