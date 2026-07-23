-- CORREÇÃO DEFINITIVA: MAPEAMENTO DE COLUNAS DA TABELA SERVICE_ORDERS E STORE_REVIEWS
-- O erro "column lojista_id does not exist" ocorre porque o código tentou ler 'store_id' ou vice-versa.
-- Padronizaremos para 'lojista_id' em conformidade com o schema principal.

-- 1. CORREÇÃO NA TABELA SERVICE_ORDERS
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_orders' AND column_name='store_id') THEN
        ALTER TABLE public.service_orders RENAME COLUMN store_id TO lojista_id;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_orders' AND column_name='lojista_id') THEN
        ALTER TABLE public.service_orders ADD COLUMN lojista_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. CORREÇÃO NA TABELA STORE_REVIEWS
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_reviews' AND column_name='store_id') THEN
        ALTER TABLE public.store_reviews RENAME COLUMN store_id TO lojista_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_reviews' AND column_name='lojista_id') THEN
        ALTER TABLE public.store_reviews ADD COLUMN lojista_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. REAPLICAR POLÍTICAS DE RLS COM O NOME CORRETO
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Público lê O.S." ON public.service_orders;
CREATE POLICY "Público lê O.S." ON public.service_orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lojistas gerenciam suas O.S." ON public.service_orders;
CREATE POLICY "Lojistas gerenciam suas O.S." ON public.service_orders FOR ALL TO authenticated USING (auth.uid() = lojista_id);

DROP POLICY IF EXISTS "Qualquer um lê avaliações" ON public.store_reviews;
CREATE POLICY "Qualquer um lê avaliações" ON public.store_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lojas podem responder avaliações" ON public.store_reviews;
CREATE POLICY "Lojas podem responder avaliações" ON public.store_reviews FOR UPDATE TO authenticated USING (auth.uid() = lojista_id);
