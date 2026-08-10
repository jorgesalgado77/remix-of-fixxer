# FIXXER CANONICAL SCHEMA (v1.0.0)

## ERD Textual e Fluxo de Dados
**USUÁRIO** (`auth.users`) -> **ROLE** (`user_roles`) -> **PERFIL ÚNICO** (`profiles`)
**DEMANDA/ANÚNCIO** -> **PUBLICA** (`service_orders`) -> **PROFISSIONAL** -> **PROPOSTA** (`proposals`) -> **ACEITE** -> **EXECUÇÃO** -> **CONCLUSÃO** -> **AVALIAÇÃO** (`reviews`)

---

## 1. Tabelas Oficiais e Consolidadas

### 1.1 Identidade e Autorização
- **`profiles`** (Mestre): Perfil unificado. Contém geolocalização (`lat`, `lng`), disponibilidade e dados de negócio.
  - *Consolida*: `store_profiles`, `provider_profiles`, `profiles_lojista`.
- **`user_roles`**: Fonte de verdade para RBAC (`admin`, `lojista`, `prestador`, `fornecedor`).
- **`admin_config`**: Lista branca de e-mails administrativos.

### 1.2 Operacional e Negócio
- **`service_orders`**: Tabela canônica para Ordens de Serviço, Demandas e Anúncios.
  - *Consolida*: `orders_of_service`.
  - *Campos*: `owner_id`, `status` (ativo, em_execucao, concluido), `price`, `category`.
- **`proposals`**: Propostas financeiras e técnicas para `service_orders`.
- **`appointments`**: Agendamentos vinculados a serviços.

### 1.3 Monetização
- **`user_coins`**: Saldo em moedas do usuário.
- **`coin_transactions`**: Ledger de transações (auditável).
- **`wallets`**: Controle de saques e depósitos (Escrow).

### 1.4 Comunicação e Engajamento
- **`reviews`**: Avaliações de 1 a 5 estrelas com comentários.
  - *Consolida*: `store_reviews`.
- **`notifications`**: Alertas realtime unificados.
- **`messages`** / **`os_messages`**: Chat contextualizado.

---

## 2. Segurança e RLS
- **`profiles_public`** (View): Única forma de acesso a perfis de terceiros. Omete dados sensíveis (documentos, endereços completos).
- **RLS Policy "Participant Access"**: Garante que apenas o dono ou o profissional aceito veja detalhes financeiros de uma ordem.

---

## 3. Storage e Mídia
- **`documents-private`**: Buckets protegidos para CNH/CNPJ (Signed URLs).
- **`media-public`**: Portfólio, avatares e banners.

---

## 4. Auditoria de Migração (Baseline 2026-08-10)
- [x] `orders_of_service` -> `service_orders` (Migrado)
- [x] `store_reviews` -> `reviews` (Migrado)
- [x] Perfis consolidados em tabela única.
- [x] Notificações unificadas.
