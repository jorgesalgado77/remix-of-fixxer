
-- CRIAÇÃO DA TABELA DE AVALIAÇÕES (REVIEWS)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reviewed_user_id UUID GENERATED ALWAYS AS (target_id) STORED, -- Alias para compatibilidade legada
    os_id UUID REFERENCES public.orders_of_service(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT no_self_review CHECK (author_id <> target_id)
);

-- GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

-- RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Reviews" ON public.reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users Create Own Reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors Update Own Reviews" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Authors Delete Own Reviews" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- Função para atualizar karma_score no profile automaticamente
CREATE OR REPLACE FUNCTION public.update_profile_karma()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles
    SET karma_score = (
        SELECT COALESCE(AVG(rating), 5.00)
        FROM public.reviews
        WHERE target_id = NEW.target_id
    )
    WHERE id = NEW.target_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_review_upsert
AFTER INSERT OR UPDATE ON public.reviews
FOR EACH ROW EXECUTE PROCEDURE public.update_profile_karma();
