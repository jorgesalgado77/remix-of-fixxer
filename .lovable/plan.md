# Plano de Implementação: Sistema de Cupons (Prompt 18)

Este plano descreve a implementação do sistema de cupons real para Info Produtos, garantindo validação server-side, idempotência e rastreabilidade financeira total.

## 1. Banco de Dados (Supabase Externo)

Criar a infraestrutura de cupons com RLS e lógica de validação centralizada.

- **Tabela `info_coupons`**:
  - `id`, `creator_id` (FK), `code` (Normalizado, Unique per creator), `name`, `description`.
  - `discount_type` (`PERCENTAGE`, `FIXED_AMOUNT`).
  - `discount_value` (decimal).
  - `product_id` (opcional, null = catálogo todo).
  - `start_date`, `end_date`.
  - `max_uses` (null = ilimitado), `max_uses_per_user`.
  - `min_purchase_value`.
  - `status` (`DRAFT`, `ACTIVE`, `PAUSED`, `EXPIRED`, `EXHAUSTED`).
  - `usage_count` (denormalizado para performance).
- **Tabela `info_coupon_usage`**: Registro de cada uso para auditoria e limites.
- **RPC `validate_info_coupon`**: Função centralizada para validar todas as regras no backend.
- **RPC `apply_info_coupon`**: Função atômica para registrar o uso e incrementar contadores.

## 2. Backend & Services (`src/lib/info-products/`)

- **`v2-monetization.ts`**:
  - Implementar CRUD de cupons para o criador.
  - Implementar `validateCoupon` (chama RPC).
  - Implementar `getCouponAnalytics` (agregação real de vendas por cupom).
- **`checkout.functions.ts`**:
  - Atualizar para incluir `couponCode` na criação do pagamento ASAAS.
- **`src/routes/api/public/asaas.ts`**:
  - Atualizar webhook para registrar o cupom na venda consolidada (`info_sales`) e disparar o incremento de uso.

## 3. UI (Creator Studio)

- **Nova Aba "Cupons" em `/infoprodutos`**:
  - Listagem de cupons com status, uso e receita gerada.
  - Botão "Criar Cupom" com formulário completo.
  - Ações: Editar, Pausar/Ativar, Duplicar, Arquivar, Ver Uso.
  - Tooltips explicativos em todos os botões de ação.
- **Filtros e Paginação**: Server-side para suportar grandes volumes.

## 4. UI (Checkout/Comprador)

- Implementar campo de cupom na tela de pagamento (Checkout).
- Validação em tempo real (front chama backend).
- Feedback visual de desconto aplicado.

## 5. Qualidade e Testes

- **Testes de Regressão (`src/tests/info-coupons.spec.ts`)**:
  - Suíte completa cobrindo validade, limites, tipos de desconto e uso duplicado.
- **Auditoria**: Relatório em `docs/FIXXER_INFO_PRODUCTS_PROMPT_18_AUDIT.md`.

## Detalhes Técnicos

```text
Entidade: info_coupons
Fluxo de Validação:
1. Cliente envia código.
2. Server Fn chama RPC `validate_info_coupon`.
3. RPC verifica:
   - Existência e Status (ACTIVE).
   - Datas (Validity).
   - Elegibilidade (Product ID).
   - Valor Mínimo.
   - Limites (Global e User).
4. Retorna Objeto de Desconto ou Erro.
```
