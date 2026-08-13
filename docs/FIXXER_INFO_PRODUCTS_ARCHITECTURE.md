# FIXXER — INFO PRODUTOS — ARQUITETURA (Prompt 00)

Data: 13/08/2026
Escopo: Discovery e inventário. **Nenhuma tabela, RPC ou componente comercial foi criado nesta etapa.**

---

## 1. Regra fundamental

O módulo INFO PRODUTOS é uma **extensão** do FIXXER existente:

- Banco autoritativo único: **Supabase EXTERNO** via `@/lib/supabaseExternal`.
- Sem Lovable Cloud, sem Lovable AI, sem banco interno, sem app paralelo.
- Alterações estruturais somente por **migration SQL versionada** em `supabase/migrations/`, entregue no chat para execução manual.

---

## 2. Inventário — Frontend

| Camada | Estado atual | Reuso para INFO PRODUTOS |
|---|---|---|
| Framework | TanStack Start v1 + React 19 + Vite 7 | Rotas novas em `src/routes/` (file-based) |
| Roteamento protegido | `src/routes/_authenticated.tsx` (layout + header + `PixManagerModal` global via evento `fixxer:open-pix-modal`) | Painel do criador entra sob `_authenticated.*` |
| Rotas públicas | `index.tsx`, `auth.*`, `cadastro`, `lojista.$id`, `prestador.$id`, `parceiro.$id`, `cliente.$id`, `perfil.$userId`, `r.$code` | Vitrine pública de produto seguirá o mesmo padrão SSR + `head()` |
| Server routes HTTP | `src/routes/api/public/push.dispatch.ts` | Modelo para o webhook de pagamento (`/api/public/...` + verificação de assinatura) |
| Estilo | Tailwind v4 via `src/styles.css` + shadcn/ui em `src/components/ui` | Reuso total; sem novo design system |
| Estado/dados | TanStack Query + hooks locais + cache SWR em `localStorage` (apenas cache, nunca fonte de verdade) | Mesmo padrão |

### Componentes já existentes reutilizáveis

- **Identidade:** `ProfileSummaryCard.tsx`, `ProfileHeader.tsx`, `PanelActions.tsx`, `PlanBadge.tsx`, `AvailabilityBadge.tsx`.
- **Mídia/upload:** `src/hooks/use-media-upload.ts` (signed URL + progresso + retry + thumbnail), `src/utils/image-compression.ts`, `src/utils/image-validation.ts`, `src/lib/upload-with-progress.ts`, `src/lib/upload-with-retry.ts`, `AttachmentPreview.tsx`, `ImageEditorModal.tsx`, `PhotoSectionsManager.tsx`.
- **Listagem/feed:** `src/lib/feed-service.ts`, `feed-cache.ts`, `feed-persist.ts`, `FeedCardSkeleton`, `FeedEmptyState`, `FeedErrorState`, `FeedDetailsModal`, `CarouselFallback`.
- **Descoberta:** `UniversalSearchPanel.tsx` + RPC `search_profiles_public`, `src/lib/branch-search.ts`, `ad-filter-search.ts`, `RadiusFilter`, `haversine-helper.ts`.
- **Reputação:** `ReviewModal.tsx`, `ReviewsModal.tsx`, tabela `reviews` (+ trigger de karma).
- **Financeiro:** `src/lib/coins.ts` (`consume_coins_safe` / `credit_coins_safe`, idempotência), `CoinsExtractModal`, `CoinPacksStoreModal`, `PixManagerModal`, `EscrowBadge`, `src/hooks/use-provider-stats.ts`.
- **Monetização/Admin:** `src/lib/monetization.ts` (fonte: `system_settings` key `monetization`, audit em `monetization_audit`), rotas `_authenticated.admin*`, `src/lib/admin-guard.ts`.
- **Notificações:** `src/lib/notification-service.ts`, `notification-prefs.ts`, `NotificationsCenter.tsx`, `push-client.ts`, `push_subscriptions`.
- **Chat:** `src/components/chat`, `src/lib/chat-send.ts`, `contact-guard.ts` (Anti-Bypass), `user_blocks`.
- **Categorias:** `src/lib/activity-branches.ts` (matriz mestre), `product_types`, `offerings`, `job_roles`, `activity_branches`.

---

## 3. Inventário — Banco externo (mapeado via código)

Tabelas em uso hoje:

`profiles`, `profiles_public` (view), `user_roles`, `provider_profiles`, `store_profiles`, `supplier_profiles`, `user_profiles` (legado), `service_orders`, `proposals`, `service_applications`, `appointments`, `appointment_events`, `appointment_disputes`, `disputes`, `reviews`, `store_reviews` (legado), `feed_posts`, `feed_post_saves`, `posts`/`ads` (legado), `favorite_posts`, `favorite_users`, `user_favorites`, `media`, `messages`, `chat_conversation_state`, `user_blocks`, `user_reports`, `contact_attempts`, `notifications`, `notification_preferences`, `push_subscriptions`, `user_coins`, `coin_transactions`, `system_settings`, `system_audit`, `system_logs`, `activity_branches`, `job_roles`, `offerings`, `product_types`, `brand_flags`, `user_availability`, `availability_log`, `affiliate_profiles`, `affiliate_referrals`, `affiliate_commissions`.

RPCs existentes:

`search_profiles_public`, `consume_coins_safe`, `credit_coins_safe`, `accept_proposal`, `transition_os_status`, `safe_check_in`, `safe_check_out`, `release_escrow_for_appointment`, `complete_and_release_escrow`, `cancel_appointment_and_refund_escrow`, `admin_resolve_dispute`, `get_my_pix_key`, `set_my_pix_key`.

Migrations versionadas: `20260810000001` … `20260811000005` (consolidação de O.S., reviews, perfis, notificações, workflow engine, monitoring).

Storage: `media` (público — avatares, banners, portfólio) e `disputes-private` (privado, signed URL).

Edge Functions: **nenhuma** (`supabase/functions/` inexistente) — política do projeto é usar server routes do TanStack.

Gateway de pagamento: **ASAAS não está integrado** hoje. Não há SDK, secret, webhook nem tabela de cobrança. Isso é uma **lacuna** a resolver no prompt de pagamento (PENDENTE).

---

## 4. Arquitetura-alvo do módulo (sem implementar agora)

```text
PRESTADOR (creator)
  └─ info_products (1)
       ├─ info_product_files      (ebook/vídeo no Storage privado)
       ├─ info_product_modules    (só VIDEO_COURSE)
       │     └─ info_product_lessons
       ├─ info_product_previews   (amostra pública)
       └─ info_product_offers     (preço BRL, cupom, status)

COMPRADOR
  └─ info_purchases  ──(webhook idempotente)──▶ info_entitlements
                                                   ├─ info_progress
                                                   └─ leitura via Signed URL
```

Princípios:

1. **Entitlement é backend-only.** O frontend nunca libera conteúdo pago; ele apenas consulta se existe entitlement válido. Criação de entitlement acontece exclusivamente no webhook/RPC idempotente após confirmação financeira.
2. **Arquivo pago nunca é público.** Bucket privado novo + Signed URL de curta duração emitida por server function que valida entitlement.
3. **Creator polimórfico desde o início.** `creator_id` + `creator_role` (`prestador` em V1) para não travar V3, com checagem por `user_roles`/`has_role` — sem `if role === 'prestador'` espalhado na UI.
4. **Reuso obrigatório:** identidade via `IdentityService`; upload via `use-media-upload`; avaliações via `reviews`; notificações via `notification-service`; descoberta via padrões do feed; preços/comissões via `monetization` (`system_settings`).
5. **Performance (alvo Realme C55):** listas paginadas (keyset), colunas explícitas e mínimas, rotas do criador em `lazy`/code-split, player carregado sob demanda, thumbnails comprimidos, Realtime somente para status de compra, sem polling, sem N+1 (join único ou RPC agregada).

---

## 5. Segurança preservada

- RLS por `auth.uid()` em toda tabela nova; `GRANT` explícito no mesmo migration; sem `USING (true)` para dados privados.
- Produto publicado tem policy pública de leitura **apenas** de colunas de vitrine; rascunhos e arquivos ficam owner-only, com policy owner-side de SELECT para o criador ver o próprio rascunho.
- Anti-Bypass do chat continua válido para negociação fora da plataforma.
- Admin Master: configuração do módulo entra em `system_settings` com label, descrição, tooltip, validação, confirmação destrutiva e audit log em `monetization_audit`/`system_audit`.

---

## 6. IA (quando aplicável em prompts futuros)

Provedor primário OpenAI, secundário configurável pelo Admin Master (Perplexity, Google Gemini). Chaves somente em secret storage do backend, chamadas via server function com timeout, tratamento de erro, fallback e cache. Nenhuma chave no frontend, nenhuma chamada desnecessária.
