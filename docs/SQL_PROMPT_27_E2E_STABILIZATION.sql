-- FIXXER PROMPT 27 - E2E STABILIZATION
-- OBJETIVO: Corrigir inconsistências detectadas na auditoria E2E

-- 1. Garantir existência da tabela proposals (caso tenha falhado na migração anterior)
CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_order_id UUID REFERENCES public.service_orders(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    value NUMERIC(12, 2) NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pendente', -- pendente, aceito, recusado, cancelado
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Garantir permissões na user_roles para o cliente anon/authenticated (conforme regras do Supabase)
-- NOTA: O IdentityService usa user_roles para RBAC, então SELECT deve ser permitido.
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.user_roles TO anon;

-- 3. Corrigir user_coins (Auditoria detectou falha na coluna 'id')
-- Se a tabela usa user_id como PK, a auditoria deve refletir isso, mas vamos garantir uma estrutura canônica.
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_coins' AND schemaname = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_coins' AND column_name='id') THEN
            ALTER TABLE public.user_coins ADD COLUMN id UUID DEFAULT gen_random_uuid();
        END IF;
    END IF;
END $$;

-- 4. Reforçar RLS para propostas
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view proposals for their orders" ON public.proposals;
CREATE POLICY "Users can view proposals for their orders" ON public.proposals
    FOR SELECT TO authenticated
    USING (
        provider_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.service_orders 
            WHERE id = proposals.service_order_id AND owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Providers can create proposals" ON public.proposals;
CREATE POLICY "Providers can create proposals" ON public.proposals
    FOR INSERT TO authenticated
    WITH CHECK (provider_id = auth.uid());

-- 5. Grants finais
GRANT ALL ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO service_role;
