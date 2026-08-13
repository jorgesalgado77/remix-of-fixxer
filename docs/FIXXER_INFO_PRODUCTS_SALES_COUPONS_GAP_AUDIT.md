# FIXXER Info Produtos - GAP Audit (Vendas & Cupons)

## 1. Mapeamento de Infraestrutura Existente

### Tabelas (Supabase Externo)
- **info_products**: Tabela mestre de produtos (identificada via referências em migrations de monetização).
- **info_bundles**: Combos de produtos.
- **info_subscription_plans**: Planos de assinatura.
- **info_product_entitlements**: Controle de acesso (entitlements).
- **info_affiliates & info_affiliate_sales**: Sistema de afiliados e comissões.
- **info_webhook_logs**: Log de eventos ASAAS.
- **info_fraud_queue**: Fila de auditoria antifraude.

### Services & Functions (TanStack Start)
- **checkout.functions.ts**: Implementação parcial de integração ASAAS (simulada via mock quando a chave está ausente).
- **entitlement-service.ts**: Validação de acesso segura (checkUserEntitlement).
- **v2-monetization.ts**: Analytics, Branding e Afiliados.

## 2. Lacunas Identificadas (GAPs)

### Cupons (Coupons)
- **Tabela**: Não localizada definição SQL para `info_coupons` ou `info_product_coupons`.
- **Interface**: Aba "Cupons" em `CreatorStudioPage` (`src/routes/_authenticated.infoprodutos.tsx`) exibe o placeholder "Em breve".
- **Lógica**: Nenhuma lógica de aplicação de desconto localizada no `checkout.functions.ts`.

### Vendas (Sales Management)
- **Interface**: Aba "Vendas" em `CreatorStudioPage` exibe o placeholder "Em breve".
- **Creator Wallet**: Não localizada interface de extrato detalhado para o criador dentro do módulo Info Produtos (existe `src/routes/_authenticated.extrato.tsx` mas é genérico do Fixxer).
- **Analytics**: Implementado apenas simulacro em `v2-monetization.ts` (`getInfoModuleAnalytics`).

### Ofertas (Offers)
- **Definição**: Nenhuma tabela `info_offers` localizada. A precificação está atômica em `info_products`.
- **Gap**: Falta suporte para múltiplas ofertas (preços diferentes) para o mesmo produto.

## 3. Mapa de Dependências

```text
PRODUCT (info_products)
↓
OFFER (PENDENTE: info_offers)
↓
COUPON (PENDENTE: info_coupons)
↓
CHECKOUT (checkout.functions.ts)
↓
ASAAS (api/public/asaas.ts)
↓
PAYMENT (info_webhook_logs)
↓
PURCHASE (PENDENTE: info_purchases)
↓
SPLIT (info_affiliate_sales / RPC apply_affiliate_commission)
↓
LEDGER (existing financial system)
↓
ENTITLEMENT (info_product_entitlements)
↓
ACCESS (entitlement-service.ts)
↓
ANALYTICS (v2-monetization.ts)
```

## 4. Status Final
- **Infraestrutura Base**: 80% Operacional.
- **Módulo Comercial**: 20% Operacional (Placeholders predominantes).
- **Segurança**: Preservada via IdentityService e RLS existentes.

