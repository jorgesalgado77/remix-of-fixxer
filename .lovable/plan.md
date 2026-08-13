# Plano - INFO PRODUTOS PROMPT 06 - Direito de Acesso e Minha Biblioteca

Implementação do controle de direitos de acesso (Entitlements) e da visualização centralizada de produtos adquiridos.

## 1. Banco de Dados (Supabase Externo)
Criar a tabela `info_product_entitlements` para gerir o acesso aos conteúdos.

```sql
CREATE TABLE public.info_product_entitlements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    product_id uuid REFERENCES public.info_products(id) ON DELETE CASCADE NOT NULL,
    purchase_id uuid REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'active', -- active, revoked, expired
    granted_at timestamptz DEFAULT now() NOT NULL,
    revoked_at timestamptz,
    expiration timestamptz,
    metadata jsonb DEFAULT '{}'::jsonb,
    UNIQUE(user_id, product_id)
);

GRANT SELECT ON public.info_product_entitlements TO authenticated;
GRANT ALL ON public.info_product_entitlements TO service_role;

ALTER TABLE public.info_product_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own entitlements"
ON public.info_product_entitlements
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

## 2. Lógica de Negócio e Serviços
- **Serviço de Entitlement (`src/lib/info-products/entitlement-service.ts`)**:
  - Função para verificar se um usuário possui acesso a um produto (`checkUserEntitlement`).
  - Função para buscar todos os produtos com acesso válido para o usuário logado (`getMyLibrary`).
- **Webhooks (`src/routes/api/public/asaas.ts`)**:
  - Garantir que a liberação do entitlement ocorra apenas no evento `PAYMENT_CONFIRMED` ou `PAYMENT_RECEIVED`.
  - Implementar idempotência usando `upsert` na tabela de entitlements.

## 3. Interface do Usuário (Frontend)
- **Minha Biblioteca (`src/routes/_authenticated.biblioteca.tsx`)**:
  - Nova rota autenticada para listar produtos adquiridos.
  - Exibição de cards com: capa, título, criador, progresso e botão de ação dinâmico.
  - Lógica do botão de ação:
    - Ebook: "Abrir".
    - Vídeo/Curso: "Continuar" (da última aula/posição).
- **Proteção de Conteúdo**:
  - A página de detalhes do produto (`src/routes/info.$id.tsx`) e o player (`InfoSecurePlayer`) devem verificar o entitlement antes de solicitar URLs assinadas.

## 4. Segurança e Auditoria
- **Revogação**: Preparar sistema para lidar com `status = 'revoked'` (estornos/fraude).
- **Downloads**: Verificação dupla (Entitlement + Permissão de download no arquivo).
- **Documentação**: Gerar `docs/FIXXER_INFO_PRODUCTS_PROMPT_06_AUDIT.md`.

## Detalhes Técnicos
- Utilizar `tanstack-query` para cache da biblioteca.
- Reutilizar `IdentityService` para exibir dados dos criadores nos cards da biblioteca.
- Garantir que o `InfoSecurePlayer` não carregue o arquivo se não houver um entitlement ativo retornado pelo backend.
