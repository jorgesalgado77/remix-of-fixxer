# FIXXER — INFO PRODUTOS — CONTRATO CANÔNICO (Prompt 00)

Data: 13/08/2026
Status: **contrato de domínio**. Nenhuma tabela criada nesta etapa.

Este documento é a fonte única de verdade do domínio INFO PRODUTOS. Qualquer prompt seguinte deve obedecê-lo ou atualizá-lo explicitamente.

---

## 1. Nomenclatura canônica

Prefixo obrigatório de todas as entidades novas: `info_`. Isso evita colisão com `product_types`, `offerings`, `feed_posts` e `service_orders` já existentes.

| Domínio | Entidade canônica | Versão | Observação |
|---|---|---|---|
| INFO PRODUCT | `info_products` | V1 | Produto digital do criador |
| PRODUCT TYPE | enum `info_product_type` | V1 | `EBOOK`, `VIDEO_LESSON`, `VIDEO_COURSE` |
| CREATOR | `profiles` + `user_roles` (`creator_id`, `creator_role`) | V1 | **Não cria tabela nova** |
| PRODUCT FILE | `info_product_files` | V1 | Arquivo em bucket privado |
| PRODUCT MODULE | `info_product_modules` | V1 | Só para `VIDEO_COURSE` |
| PRODUCT LESSON | `info_product_lessons` | V1 | Aula dentro de módulo |
| PRODUCT PREVIEW | `info_product_previews` | V1 | Amostra pública (páginas/segundos) |
| PRODUCT OFFER | `info_product_offers` | V1 | Preço BRL, vigência, status |
| PURCHASE | `info_purchases` | V1 | Intenção/registro de compra |
| PAYMENT | `info_payments` | V1 | Evento financeiro do gateway (idempotente) |
| ENTITLEMENT | `info_entitlements` | V1 | Direito de acesso — criado só pelo backend |
| PROGRESS | `info_progress` | V1 | Progresso por aula/página |
| DOWNLOAD PERMISSION | campo em `info_product_files` + Signed URL | V1 | Download opcional por arquivo |
| REVIEW | `reviews` existente (`target_type='info_product'`) | V1.5 | **Reuso, não duplicar** |
| COUPON | `info_coupons` | V1.5 | Percentual/valor, limite de uso |
| CREATOR ANALYTICS | view/RPC agregada | V1.5 | Sem tabela nova |
| CREATOR PAYOUT | `info_payouts` + `coin_transactions`/PIX existentes | V2 | Reusa ledger |
| CERTIFICATE | `info_certificates` | V2 | Só `VIDEO_COURSE` concluído |
| SUBSCRIPTION | `info_subscriptions` | V2 | Recorrência |
| AFFILIATE | `affiliate_*` existentes estendidos | V3 | **Reuso obrigatório** |

---

## 2. Escopo por versão

### V1 (mínimo entregável)
- Tipos: `EBOOK`, `VIDEO_LESSON`, `VIDEO_COURSE` (curso → módulos → aulas).
- Criador: **somente PRESTADOR** pode publicar.
- Fluxo: criar rascunho → upload → preview → oferta em BRL → publicar → vitrine pública → compra → pagamento confirmado no backend → entitlement → consumo com Signed URL → progresso.
- Painel do criador: lista, edição, status, vendas do período.

### V1.5
- Cupons, reviews de produto (via `reviews`), analytics do criador, busca/filtros na vitrine, favoritos (reuso de `favorite_posts`/`user_favorites`).

### V2
- Payout do criador, certificado de conclusão, assinatura recorrente, bundles.

### V3-ready (arquitetura, não implementação)
- Creator LOJISTA/FORNECEDOR, afiliados de info produto, multi-idioma, DRM/marca d'água, comunidade/turmas.

---

## 3. Invariantes não negociáveis

1. `info_entitlements` só pode ser inserido/ativado por rotina de backend após `info_payments.status = 'confirmed'`, com chave de idempotência única por evento do gateway.
2. Frontend nunca decide acesso: sempre pergunta ao backend.
3. Arquivo pago vive em bucket **privado**; URL sempre assinada e de curta duração, emitida após validação de entitlement.
4. `VIDEO_COURSE` é a única hierarquia com módulos/aulas; `EBOOK` e `VIDEO_LESSON` têm arquivo único.
5. Preço em **BRL inteiro em centavos** (`price_cents`), nunca float.
6. Nenhum mock, nenhum dado hardcoded de negócio, nenhum fallback fake em caso de falha do Supabase — erro é exibido com retry.
7. `localStorage` apenas como cache de leitura, nunca fonte de verdade.
8. Toda tabela nova nasce com `GRANT` explícito + RLS habilitada + policies por `auth.uid()`, incluindo policy owner-side de SELECT para rascunhos.

---

## 4. Máquinas de estado

**Produto:** `draft → in_review (V1.5) → published → unpublished → archived`
**Compra:** `pending → paid → refunded | failed | expired`
**Entitlement:** `active → revoked | expired`

Transições financeiras são idempotentes e registradas; nenhuma transição parte do cliente.

---

## 5. Autorização (matriz V1)

| Ação | Anon | Cliente/Lojista/Fornecedor | Prestador | Admin |
|---|---|---|---|---|
| Ver vitrine de produto publicado | sim | sim | sim | sim |
| Ver preview | sim | sim | sim | sim |
| Comprar | não | sim | sim | sim |
| Consumir conteúdo | não | com entitlement | com entitlement | auditoria |
| Criar/publicar produto | não | não (V1) | sim | sim |
| Moderar/despublicar | não | não | não | sim |
