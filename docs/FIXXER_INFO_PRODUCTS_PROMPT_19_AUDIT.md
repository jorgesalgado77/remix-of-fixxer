# Auditoria: FIXXER INFO PRODUTOS — PROMPT 19
## Integração Financeira de Cupons e Checkout

### Objetivo
Conectar o motor de cupons ao fluxo de checkout com segurança absoluta, evitando condições de corrida e garantindo integridade no ledger financeiro.

### Requisitos Atômicos
- [x] **Coupon Lock**: Implementada RPC `validate_and_apply_info_coupon` com `FOR UPDATE` para evitar uso duplo em condições de corrida.
- [x] **Cálculo no Backend**: Preço final calculado via RPC no Supabase, consumido pelo `createServerFn` no checkout.
- [x] **Persistência de Metadados**: Checkout envia `couponCode` e metadados para o Asaas (simulado).
- [x] **Webhook Robusto**: `asaas.ts` atualizado para registrar `coupon_code` e usar o valor efetivo da transação no ledger `info_sales`.
- [x] **Imutabilidade Histórica**: O Ledger `info_sales` armazena o valor bruto e desconto no momento da compra.
- [x] **Rastreabilidade**: Adicionado join em `getSaleDetails` para exibir dados do cupom usado na venda.

### Artefatos Alterados
- `supabase/migrations/20260815000003_info_coupon_checkout_integration.sql`: Nova RPC com lock.
- `src/lib/info-products/v2-monetization.ts`: Refatoração do service para suportar a nova RPC e detalhes de venda.
- `src/lib/info-products/checkout.functions.ts`: Integração da validação de cupom no fluxo de criação de pagamento.
- `src/routes/api/public/asaas.ts`: Pequenos ajustes na lógica de captura do cupom (já pré-implementada no Prompt 18, agora endurecida).

### Verificação
- [x] Verificado que a RPC utiliza `FOR UPDATE` na tabela `info_coupons`.
- [x] Verificado que o checkout não permite avançar com cupom inválido.
- [x] Verificado que o ledger `info_sales` é a única fonte de verdade para o valor pago.

### Pendente
- Execução do SQL no Supabase Externo (fornecido no chat).
