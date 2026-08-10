# FIXXER CANONICAL SCHEMA (v1.0.0)

## ERD Textual e Fluxo de Dados
**USUÁRIO** (`auth.users`) -> **ROLE** (`user_roles`) -> **PERFIL ÚNICO** (`profiles`)
**LOJISTA** -> **PUBLICA** (`service_orders`) -> **PRESTADOR** -> **PROPOSTA** (`proposals`) -> **ACEITE** -> **EXECUÇÃO** -> **CONCLUSÃO** -> **AVALIAÇÃO** (`reviews`)

---

## 1. Tabelas Oficiais

### 1.1 Identidade e Autorização
- **`user_roles`**: Fonte de verdade para RBAC (admin, lojista, prestador, fornecedor, cliente).
- **`profiles`**: Perfil unificado. Contém dados básicos (nome, avatar) e específicos via colunas opcionais (especialidade, cnpj).
  - *Migração*: Substitui `store_profiles`, `provider_profiles`, `profiles_lojista`.
- **`admin_config`**: Lista de e-mails administrativos autorizados.

### 1.2 Negócio (Operacional)
- **`service_orders`**: Tabela canônica para demandas, anúncios e ordens de serviço.
  - *Migração*: Consolida `orders_of_service` e `service_orders`.
- **`proposals`**: Propostas enviadas para `service_orders`.
- **`feed_posts`**: Postagens sociais e anúncios destacados no feed.

### 1.3 Monetização e Financeiro
- **`user_coins`**: Saldo consolidado de moedas (escrow/ledger).
- **`coin_transactions`**: Histórico de débitos, créditos e estornos.
- **`system_settings`**: Configurações globais (taxas, preços, features).

### 1.4 Engajamento e Avaliação
- **`reviews`**: Avaliações unificadas (Rating + Karma).
  - *Migração*: Substitui `store_reviews`.
- **`notifications`**: Sistema único de alertas (Realtime).
- **`favorites`**: Relacionamento N:N entre usuários e perfis favoritos.

---

## 2. Relacionamentos e Constraints
- `profiles.id` -> `auth.users.id` (1:1, CASCADE).
- `user_roles.user_id` -> `auth.users.id` (N:1).
- `service_orders.owner_id` -> `profiles.id`.
- `proposals.os_id` -> `service_orders.id` (CASCADE).
- `reviews.target_id` -> `profiles.id`.

---

## 3. Segurança (RLS)
- **`profiles`**: Dono atualiza; Todos leem (limitado via View `profiles_public`).
- **`user_coins`**: Apenas leitura pelo dono. Escrita apenas via RPC (Admin).
- **`service_orders`**: Público lê ativos; Dono gerencia.

---

## 4. RPCs Críticas
- `consume_coins(user_id, amount, reason)`: Débito atômico.
- `release_escrow(os_id)`: Liberação de pagamento pós-serviço.
- `search_profiles_public(...)`: Busca otimizada case-insensitive.

---

## 5. Storage
- `documents-private`: Documentos sensíveis (Signed URLs).
- `media-public`: Avatares, banners e imagens de portfólio.
