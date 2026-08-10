-- Migração Canônica: store_reviews -> reviews
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'store_reviews' AND schemaname = 'public') THEN
        INSERT INTO public.reviews (author_id, target_id, rating, comment, created_at)
        SELECT author_id, lojista_id, rating, comment, created_at
        FROM public.store_reviews
        ON CONFLICT DO NOTHING;
        
        COMMENT ON TABLE public.store_reviews IS 'LEGACY: Use reviews instead.';
    END IF;
END $$;
