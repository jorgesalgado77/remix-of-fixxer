# Auditoria de Reconciliação Financeira (Prompt 17)

## Status: CONCLUÍDO

Implementada a infraestrutura de rastreabilidade financeira completa para o módulo de Info Produtos, garantindo integridade matemática e idempotência.

### Requisitos Atendidos

- [x] **Tabela de Vendas Consolidada**: Criada `info_sales` como ledger imutável.
- [x] **Centralização de Cálculo**: Implementada RPC `calculate_sale_split` no Supabase e service `calculateSaleSplit` no frontend.
- [x] **Idempotência**: Webhook ASAAS refatorado para utilizar `upsert` na tabela de vendas com `external_id` único.
- [x] **Gestão de Refund**: Fluxo de estorno implementado para atualizar status da venda e revogar acesso.
- [x] **Auditoria Matemática**: Criada suíte de testes `src/tests/info-sales-reconciliation.spec.ts`.

### Artefatos Alterados

- `supabase/migrations/20260815000001_info_sales_financial_reconciliation.sql` (Schema e RPC)
- `src/lib/info-products/v2-monetization.ts` (Service de reconciliação)
- `src/routes/api/public/asaas.ts` (Handler de Webhook endurecido)
- `src/tests/info-sales-reconciliation.spec.ts` (Testes unitários financeiros)

### Verificação

1. **Cálculo**: Validado via testes unitários para diferentes faixas de valores e descontos.
2. **Webhook**: O handler agora busca o criador do produto e calcula as taxas dinamicamente antes de registrar a venda.
3. **Segurança**: RLS habilitado na nova tabela `info_sales` permitindo acesso apenas a criadores e compradores.

### Pendente

- Implementação da interface visual para o Criador ajustar sua `tax_base` (bruto vs líquido) no Admin Master. Atualmente segue o padrão global de 15% sobre o valor efetivamente pago (net_paid).
