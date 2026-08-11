# FIXXER — CANONICAL IDENTITY & PROFILE RESOLUTION (Prompt 15)

## Arquitetura Anterior
Fragmentada entre `profiles`, `store_profiles`, `provider_profiles` e `supplier_profiles`. Resolvers como `chat-peer-profile.ts` e `public-profile-category.ts` buscavam nomes e avatares de forma oportunista em cascata, gerando inconsistência visual e duplicação de lógica.

## Problemas Encontrados
- **Múltiplas Fontes de Verdade**: Nome e Avatar espalhados por 4 tabelas.
- **Inconsistência**: Chat e Perfil Público podiam exibir cores/temas diferentes para o mesmo usuário.
- **N+1 Queries**: Resolução manual disparava múltiplas consultas sequenciais ao Supabase.

## Arquitetura Nova
Implementada a camada de **Identidade Canônica** em `src/lib/identity/`.

- **profiles**: Fonte Única de Verdade (SSoT) para Identidade (Nome, Avatar, Bio, Geo).
- **user_roles**: Fonte Única de Verdade para Autorização (RBAC).
- **specialized_profiles**: Mantidos apenas para dados técnicos/específicos (ex: raio de KM, inventário).
- **IdentityService**: Único ponto de entrada para resolver `ResolvedProfile` (Identidade + Roles + Apresentação).

## Fonte de Verdade por Campo
| Campo | Tabela Canônica |
| :--- | :--- |
| `display_name` | `profiles` |
| `full_name` | `profiles` |
| `avatar_url` | `profiles` |
| `bio` | `profiles` |
| `role / category`| `user_roles` (via `resolvePublicProfileCategory`) |

## Implementação Técnica
1.  **Identity Types**: Definidos em `src/lib/identity/identity-types.ts`.
2.  **Identity Service**: Centralizado em `src/lib/identity/identity-service.ts` com cache inteligente.
3.  **Refatoração do Chat**: `src/lib/chat-peer-profile.ts` agora consome exclusivamente o serviço canônico.
4.  **Consistência**: Garantido que Chat, Feed e Perfil utilizem a mesma lógica de `presentation`.

## Migrações e Segurança
- **RLS**: Mantido intacto. O serviço resolve via `profiles` (privado) quando o dono está logado e `profiles_public` (view) para terceiros.
- **Backward Compatibility**: Nenhuma coluna ou tabela foi removida nesta fase de refatoração controlada.

## Veredito Final
🟢 **CONFORME** — Identidade unificada, apresentação consistente e especialização preservada.

---
**Status**: RESOLVED
