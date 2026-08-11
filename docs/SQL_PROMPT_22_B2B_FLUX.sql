-- MIGRATION PARA FLUXO B2B FORNECEDOR
-- Adiciona suporte a cotações reais e anúncios de fornecedor

-- 1. TABELA DE COTAÇÕES B2B
CREATE TABLE IF NOT EXISTS public.b2b_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    request_id UUID REFERENCES public.feed_posts(id) ON DELETE CASCADE NOT NULL,
    store_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    price TEXT NOT NULL,
    payment_terms TEXT NOT NULL,
    delivery_terms TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pendente', -- pendente, aceita, recusada
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (supplier_id, request_id)
);

-- 2. SEGURANÇA (RLS)
ALTER TABLE public.b2b_quotes ENABLE ROW LEVEL SECURITY;

-- Fornecedor vê suas próprias cotações
CREATE POLICY "Suppliers can view own quotes"
    ON public.b2b_quotes FOR SELECT
    TO authenticated
    USING (auth.uid() = supplier_id);

-- Lojista vê cotações recebidas para suas demandas
CREATE POLICY "Stores can view received quotes"
    ON public.b2b_quotes FOR SELECT
    TO authenticated
    USING (auth.uid() = store_id);

-- Fornecedor cria/atualiza cotações
CREATE POLICY "Suppliers can manage own quotes"
    ON public.b2b_quotes FOR ALL
    TO authenticated
    USING (auth.uid() = supplier_id)
    WITH CHECK (auth.uid() = supplier_id);

-- 3. GRANTS
GRANT ALL ON public.b2b_quotes TO authenticated;
GRANT ALL ON public.b2b_quotes TO service_role;

-- 4. ATUALIZAÇÃO DO FEED POST TYPES (DOCS ONLY - TYPE JÁ EXISTE NO CÓDIGO)
-- Feed post types: 'anuncio_fornecedor', 'solicitacao_b2b' são tratados via aplicação.
