-- ==========================================================
-- SQL DE CONSOLIDAÇÃO: ORDERS_OF_SERVICE E REVIEWS
-- Execute este script no SQL Editor do seu Supabase Externo
-- ==========================================================

-- 1. Criar tabela de Ordens de Serviço (se não existir)
CREATE TABLE IF NOT EXISTS public.orders_of_service (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    price DECIMAL(12,2) DEFAULT 0,
    owner_id UUID REFERENCES auth.users(id),
    provider_id UUID REFERENCES auth.users(id),
    invitee_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS e Permissões para orders_of_service
ALTER TABLE public.orders_of_service ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders_of_service TO authenticated;
GRANT ALL ON public.orders_of_service TO service_role;

CREATE POLICY "Users can view their own orders" ON public.orders_of_service
    FOR SELECT TO authenticated
    USING (auth.uid() = owner_id OR auth.uid() = provider_id OR auth.uid() = invitee_id);

-- 2. Criar tabela de Avaliações (Reviews)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES auth.users(id) NOT NULL,
    target_id UUID REFERENCES auth.users(id) NOT NULL,
    os_id UUID REFERENCES public.orders_of_service(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Coluna gerada para compatibilidade com códigos que buscam 'reviewed_user_id'
    reviewed_user_id UUID GENERATED ALWAYS AS (target_id) STORED
);

-- Habilitar RLS e Permissões para reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
GRANT SELECT ON public.reviews TO anon;

CREATE POLICY "Reviews are viewable by everyone" ON public.reviews
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reviews" ON public.reviews
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = author_id AND auth.uid() != target_id);

-- 3. Trigger para atualizar o Score (Karma) no perfil do usuário
CREATE OR REPLACE FUNCTION public.handle_review_update_score()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles
    SET karma_score = (
        SELECT COALESCE(AVG(rating), 0) * 10 
        FROM public.reviews 
        WHERE target_id = NEW.target_id
    )
    WHERE id = NEW.target_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_review_added ON public.reviews;
CREATE TRIGGER on_review_added
    AFTER INSERT OR UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.handle_review_update_score();
