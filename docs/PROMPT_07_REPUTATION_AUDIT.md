# PROMPT_07: Auditoria de Reputação e Engajamento

## 1. Diagnóstico do Sistema de Reputação
O sistema atual do FIXXER possui fragmentação entre `reviews`, `store_reviews` e colunas de cache em `profiles`. Esta auditoria define a consolidação definitiva.

### 1.1 Modelo Canônico (`public.reviews`)
| Coluna | Tipo | Regra |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key (gen_random_uuid()) |
| `reviewer_id` | UUID | References auth.users(id) - OBRIGATÓRIO |
| `target_id` | UUID | References profiles(id) - OBRIGATÓRIO |
| `order_id` | UUID | References service_orders(id) - Opcional |
| `rating` | SMALLINT | 1 a 5 |
| `comment` | TEXT | Máx 1000 caracteres |
| `metrics` | JSONB | { "quality": 5, "speed": 4... } |
| `status` | TEXT | 'published' (default), 'hidden', 'disputed' |

## 2. Regras Operacionais e Segurança

### 2.1 Prevenção de Abuso
1. **Unicidade Contextual**:
   - `UNIQUE(reviewer_id, target_id, order_id)` -> Impede múltiplas avaliações para o mesmo serviço.
   - Caso `order_id` seja NULL, permitir apenas UMA avaliação global entre as partes.
2. **Auto-avaliação**: Trigger SQL deve impedir `reviewer_id = target_id`.
3. **Validação de Participante**: Só pode avaliar um `order_id` quem for o `owner_id` ou o profissional alocado.

### 2.2 Sistema de Favoritos (`public.favorite_users`)
- Tabela dedicada para bookmarking.
- **Constraint**: `UNIQUE(user_id, favorited_user_id)`.
- **RLS**:
  - `SELECT`: `user_id = auth.uid()`
  - `INSERT`: `user_id = auth.uid()`
  - `DELETE`: `user_id = auth.uid()`

## 3. Implementação Técnica

### 3.1 Migração de Dados Legados
- Script para mover dados de `store_reviews` e `ratings` para `reviews`.
- Recálculo de `karma_score` e `avg_rating` na tabela `profiles`.

### 3.2 Componente `ReviewModal.tsx`
- Refatoração para garantir que não envie colunas inexistentes.
- Integração com o fluxo de O.S. (`orderId`).
- Validação de saldo de moedas antes do envio.

## 4. Auditoria de Casos de Uso
1. **Avaliar duas vezes**: O banco deve retornar erro de Unique Constraint.
2. **Avaliar sem serviço**: Permitido apenas se `order_id` for opcional no negócio, respeitando o limite de 1 por par de usuários.
3. **Avaliar a si mesmo**: O trigger deve retornar `RAISE EXCEPTION`.
4. **Duplicar favorito**: Operação `ON CONFLICT DO NOTHING`.

---
*Assinado: Lovable Agent - 2026-08-10*
