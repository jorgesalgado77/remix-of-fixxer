# FIXXER — INFO PRODUTOS — ROADMAP

Data: 13/08/2026
Cada etapa só avança quando a anterior estiver comprovadamente concluída (build, typecheck, lint, testes, mobile, RLS, console e rede limpos) e com relatório de auditoria próprio.

---

## Prompt 00 — Discovery & Contrato (CONCLUÍDO)
Inventário do FIXXER, domínio documentado, contrato V1/V1.5/V2/V3, sem tabelas novas.
Entregas: `FIXXER_INFO_PRODUCTS_ARCHITECTURE.md`, `..._CANONICAL_CONTRACT.md`, `..._ROADMAP.md`, `..._PROMPT_00_AUDIT.md`.

## Prompt 01 — Schema V1 (migration + RLS)
Migration versionada criando `info_products`, `info_product_files`, `info_product_modules`, `info_product_lessons`, `info_product_previews`, `info_product_offers`, com GRANTs, RLS por `auth.uid()`, policy pública de vitrine e policy owner-side de rascunho. Bucket privado `info-products-private` + bucket público de capa. SQL completo entregue no chat.

## Prompt 02 — Painel do Criador (Prestador)
CRUD de produto com autorização por `user_roles`, reuso de `use-media-upload` para capa/arquivo, rotas code-split, mobile-first, tooltips nos botões de ação.

## Prompt 03 — Estrutura de curso
Módulos e aulas com ordenação, reordenação e validação; queries paginadas, sem N+1.

## Prompt 04 — Vitrine pública + preview
Rota pública SSR com `head()` próprio (title, description, OG/Twitter), preview limitado, sem exposição de arquivo pago.

## Prompt 05 — Pagamento e Entitlement
`info_purchases`, `info_payments`, `info_entitlements`; server route `/api/public/...` com verificação de assinatura do gateway e idempotência; entitlement criado apenas no backend.
**PENDENTE hoje:** o gateway (ASAAS) ainda não está integrado ao FIXXER — decisão e credenciais necessárias antes deste prompt.

## Prompt 06 — Consumo do conteúdo
Leitor de ebook e player de vídeo com Signed URL de curta duração validada por entitlement, `info_progress`, retomada de ponto, player carregado sob demanda.

## Prompt 07 — Descoberta e integração no feed
Produtos aparecendo nas seções existentes com cache SWR, skeleton, estados de erro/vazio e filtros do lado do cliente.

## Prompt 08 — Reviews, cupons e analytics (V1.5)
Reuso de `reviews`, `info_coupons`, agregações via RPC/view.

## Prompt 09 — Admin Master
Configuração do módulo em `system_settings` (comissão, limites, moderação) com label, descrição, tooltip, validação, confirmação destrutiva e audit log.

## Prompt 10 — Payout, certificado e assinatura (V2)
Reuso do ledger `coin_transactions` e do fluxo PIX existente.

## Futuro (V3-ready)
Creator LOJISTA/FORNECEDOR, afiliados de info produto, DRM/marca d'água, turmas/comunidade.
