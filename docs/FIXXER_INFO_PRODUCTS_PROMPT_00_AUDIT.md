# AUDITORIA — INFO PRODUTOS — PROMPT 00

Data: 13/08/2026
Tipo: Discovery / documentação. **Nenhum arquivo de código, migration, tabela, RPC ou componente foi criado ou alterado.**

---

## 1. Checklist obrigatório

| Item | Resultado | Evidência |
|---|---|---|
| Nenhum banco novo | OK | Nenhuma migration criada; único cliente segue `src/lib/supabaseExternal.ts` |
| Nenhuma arquitetura paralela | OK | Somente arquivos `.md` em `docs/` adicionados |
| Nenhum mock | OK | Nenhum código adicionado |
| Nenhuma duplicação | OK | Contrato define reuso de `IdentityService`, `reviews`, `coin_transactions`, `affiliate_*`, `use-media-upload`, `notification-service`, `monetization` |
| Nenhuma funcionalidade existente quebrada | OK | Nenhum arquivo de `src/` tocado |
| Contrato V1/V1.5/V2/V3 documentado | OK | `docs/FIXXER_INFO_PRODUCTS_CANONICAL_CONTRACT.md` |
| Lovable Cloud / Lovable AI / banco interno | Não utilizados | — |

## 2. Inventário confirmado

- Frontend: TanStack Start v1, rotas file-based, layout protegido `_authenticated`, shadcn/ui, Tailwind v4.
- Banco externo: 40+ tabelas mapeadas, 13 RPCs, view `profiles_public`, migrations `20260810*`/`20260811*`.
- Storage: `media` (público) e `disputes-private` (privado com Signed URL).
- Edge Functions: nenhuma — padrão do projeto é server route TanStack.
- RBAC: `user_roles` + `has_role` + `src/lib/admin-guard.ts`.
- Identidade: `src/lib/identity/identity-service.ts` (canônico, com cache/TTL).
- Financeiro: `src/lib/coins.ts` com `consume_coins_safe`/`credit_coins_safe` idempotentes, escrow em appointments, PIX via `get_my_pix_key`/`set_my_pix_key`.
- Notificações, chat com Anti-Bypass, feed, categorias e upload: todos mapeados como reutilizáveis.

## 3. Lacunas identificadas (PENDENTE)

1. **Gateway de pagamento ausente.** Não há ASAAS (ou qualquer PSP) integrado: nenhum SDK, secret, webhook ou tabela de cobrança no repositório. Bloqueia o Prompt 05 (Pagamento/Entitlement) até a definição de credenciais e ambiente.
2. **Bucket privado de conteúdo pago inexistente.** Será criado no Prompt 01.
3. **Fragmentação de perfis** (`profiles` + `store_profiles`/`provider_profiles`/`supplier_profiles`) persiste; o módulo usará `profiles` + `user_roles` e não amplia a fragmentação.

## 4. Verificações de qualidade

| Etapa | Resultado |
|---|---|
| Build / typecheck / lint | Não aplicável a esta etapa (nenhuma mudança em `src/`); nenhuma regressão possível |
| Testes unitários / integração / E2E | Não aplicável (sem código novo) |
| Mobile, RLS, console, rede | Sem alteração de comportamento |
| Mocks, duplicação, imports órfãos, N+1 | Nenhum introduzido |

## 5. Veredito

**PROMPT 00 APROVADO** como discovery e contrato.
Ressalva registrada: integração de pagamento marcada **PENDENTE** e obrigatória antes do Prompt 05.
Próxima etapa autorizada: **Prompt 01 — Schema V1 (migration + RLS)**.
