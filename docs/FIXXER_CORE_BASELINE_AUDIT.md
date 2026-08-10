# RELATÓRIO TÉCNICO: FIXXER CORE BASELINE AUDIT (v1.0.0)
Data: 10 de Agosto de 2026
Responsável: Arquiteto de Software Sênior / Engenheiro de Segurança

## 1. INVENTÁRIO DO SISTEMA (FRONTEND)
### Rotas e Páginas
- **Públicas**: `/`, `/auth`, `/cadastro`, `/lojista/$id`, `/prestador/$id`, `/r/$code` (afiliados).
- **Autenticadas**: `/_authenticated/dashboard`, `/_authenticated/profile`, `/_authenticated/chat`, `/_authenticated/feed`.
- **Administrativas**: `/_authenticated/admin`, `/_authenticated/admin/usuarios`, `/_authenticated/admin/monetizacao`.

### Componentes Críticos
- **Autenticação**: `src/lib/current-user.ts` (Usa exclusively `supabaseExternal`).
- **Busca**: `src/components/UniversalSearchPanel.tsx` (Usa RPC `search_profiles_public`).
- **Monetização**: `src/lib/monetization.ts` e `src/hooks/use-monetization.ts`.
- **Geolocalização**: `src/lib/haversine-helper.ts`, `src/lib/geocoding.functions.ts`.

### Hooks e Contextos
- `useCurrentUser`: Centraliza o estado do usuário logado via `onAuthStateChange`.
- `useProviderStats`: Dashboard de métricas em tempo real.
- `useUserBranchContext`: Contexto de ramo de atividade para recomendações.

---

## 2. INVENTÁRIO DO BANCO REAL (MAPEADO VIA SQL E CÓDIGO)
### Tabelas Principais
- `profiles`: Tabela mestre de usuários.
- `user_roles`: Gerenciamento de permissões (RBAC).
- `orders_of_service`: Gestão de O.S.
- `reviews`: Avaliações com trigger para Karma Score.
- `user_coins`: Saldo de moedas/carteira.
- `coin_transactions`: Histórico financeiro.
- `feed_posts`: Conteúdo do feed social.
- `notifications`: Sistema de alertas Realtime.

### Views e RPCs
- **View** `profiles_public`: Exposição segura de dados (Geolocalização, Categorias).
- **RPC** `search_profiles_public`: Busca otimizada.
- **RPC** `consume_coins` / `credit_coins`: Operações financeiras atômicas.

---

## 3. MATRIZ DE DEPENDÊNCIAS
- **Auth**: `auth.users` -> `profiles` -> `user_roles`.
- **Monetização**: `user_coins` -> `coin_transactions` -> `system_settings`.
- **Feed**: `feed_posts` -> `profiles` -> `media`.

---

## 4. DIVERGÊNCIAS E DUPLICAÇÕES IDENTIFICADAS (CRÍTICO)
1. **Ordens de Serviço**: Conflito entre `service_orders` e `orders_of_service`. O código usa ambos.
2. **Avaliações**: Conflito entre `reviews` e `store_reviews`. `reviews` possui trigger de Karma, `store_reviews` parece legada.
3. **Perfis**: Referências a `provider_profiles`, `store_profiles` e `user_profiles`. O sistema está migrando para um modelo único em `profiles` com `role`, mas o código morto ainda referencia tabelas satélites.
4. **Notificações**: Múltiplos modelos de inserção (alguns via RPC, outros diretos via `.from('notifications')`).

---

## 5. RISCOS DE SEGURANÇA E CONFORMIDADE
1. **Credenciais Hardcoded**: E-mail `jorgericardosalgado@gmail.com` e hash de senha encontrados em migrations (`complete_schema.sql`). **Risco: Alto**.
2. **RLS**: Algumas tabelas como `reviews` possuem `SELECT USING (true)`. Embora intencional para visualização pública, deve ser monitorado.
3. **Bypass de Admin**: O arquivo `admin-guard.ts` faz bypass baseado em `user_roles`, o que é seguro, mas o seeder de admin está exposto em arquivos SQL versionados.

---

## 6. ESTRUTURAS ÓRFÃS / LEGADAS
- `appointments` vs `service_orders`: Lógica de agendamento duplicada.
- `escrow`: Mencionada em funções (`release_escrow`), mas sem tabela clara de ledger consolidado além de `user_coins`.

---

## 7. PLANO DE CONSOLIDAÇÃO (FUTURO)
1. **Unificar O.S.**: Migrar tudo para `orders_of_service`.
2. **Sanitizar Migrations**: Remover credenciais literais dos arquivos SQL.
3. **Limpeza de Código**: Remover referências a `store_profiles` e `provider_profiles`.

