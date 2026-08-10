-- Migração Canônica: orders_of_service -> service_orders
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'orders_of_service' AND schemaname = 'public') THEN
        -- Garantir colunas na tabela canônica
        ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS lojista_id UUID REFERENCES public.profiles(id);
        ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS price NUMERIC(12, 2);
        
        -- Migração segura com EXECUTE para evitar falha de parse
        EXECUTE 'INSERT INTO public.service_orders (id, owner_id, lojista_id, title, description, status, price, created_at)
                 SELECT 
                    o.id, 
                    COALESCE(o.lojista_id, o.owner_id), 
                    o.lojista_id, 
                    o.title, 
                    o.description, 
                    o.status, 
                    COALESCE(o.contract_value, o.price, 0), 
                    o.created_at
                 FROM public.orders_of_service o
                 ON CONFLICT (id) DO UPDATE SET
                    owner_id = EXCLUDED.owner_id,
                    lojista_id = EXCLUDED.lojista_id,
                    price = EXCLUDED.price;';
                    
        -- Marcar antiga como legada (apenas comentário por enquanto)
        COMMENT ON TABLE public.orders_of_service IS 'LEGACY: Use service_orders instead.';
    END IF;
END $$;
