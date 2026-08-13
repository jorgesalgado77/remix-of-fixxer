# Plano de Implementação - Prompt 16: Creator Sales Center

Implementação completa do módulo de Vendas do Creator Studio no módulo de Info Produtos, garantindo a exibição de dados reais do Supabase, dashboard analítico e lista detalhada de vendas com filtros e exportação.

## 1. Banco de Dados (Supabase Externo)
Criação da estrutura de vendas e status para info produtos.

- **Tabela `info_sales`**: Registro principal de vendas.
    - `id` (uuid, pk)
    - `creator_id` (uuid, fk -> profiles)
    - `buyer_id` (uuid, fk -> profiles)
    - `product_id` (uuid, fk -> info_products)
    - `offer_id` (uuid, fk -> info_offers)
    - `coupon_id` (uuid, fk -> info_coupons, nullable)
    - `amount_original` (decimal)
    - `amount_discount` (decimal)
    - `amount_paid` (decimal)
    - `fee_platform` (decimal)
    - `amount_net` (decimal)
    - `status` (enum: PENDING, PAID, FAILED, CANCELLED, REFUNDED, EXPIRED)
    - `payment_method` (text)
    - `payment_id` (text, asaas reference)
    - `created_at` (timestamp)
- **RLS**: Apenas o creator (`creator_id = auth.uid()`) ou comprador (`buyer_id = auth.uid()`) podem ler seus dados. Admin Master tem acesso total.

## 2. Backend (TanStack Server Functions)
Implementação da lógica de agregação e filtros no service `v2-monetization.ts`.

- **`getCreatorSalesStats`**: Agregação server-side para o dashboard (totais, taxa fixxer, receita líquida, ticket médio).
- **`getCreatorSalesList`**: Consulta paginada com filtros por status e período.
- **`getSaleDetails`**: Busca detalhada de uma única transação, incluindo dados do comprador (protegendo PII).
- **`exportSalesCSV`**: Geração de relatório para download.

## 3. Frontend (Creator Studio)
Substituição do placeholder "Em breve" por componentes reais em `src/routes/_authenticated.infoprodutos.tsx`.

- **Dashboard Analítico**: Cards com métricas principais (Vendas totais, Receita Líquida, etc).
- **Filtros de Período**: Interface para Hoje, 7 dias, 30 dias e Personalizado.
- **Tabela de Vendas**: Lista com paginação e badges de status.
- **Modal de Detalhes**: Visualização completa da venda, oferta e entitlement.
- **Tooltips**: Implementação de dicas curtas em todos os botões de ação.

## 4. Segurança e Qualidade
- **Zero Mocks**: Todas as chamadas usam `supabaseExternal`.
- **Performance**: Implementação de debounce nos filtros e paginação para evitar sobrecarga no Realme C55.
- **Auditoria**: Criação de script SQL de seed para uma compra real de teste.
- **Relatório**: Geração do documento `docs/FIXXER_INFO_PRODUCTS_PROMPT_16_AUDIT.md`.

## Detalhes Técnicos
- Uso de `useQuery` com `keepPreviousData` para transições suaves entre filtros.
- Separação de componentes para `SalesDashboard`, `SalesTable` e `SaleDetailModal`.
- Garantia de que a barra de botões duplicada removida anteriormente não retorne.
