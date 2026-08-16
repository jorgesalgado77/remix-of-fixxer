-- FIXXER MASTER DATA RECOVERY V21
-- ESTRATÉGIA: Correção de ENUM e Sincronização Absoluta de Dados Reais
DO $$ 
DECLARE
    admin_id uuid;
    jorge_id uuid;
BEGIN
    -- 1. Recupera os IDs reais baseados no e-mail do auth.users
    SELECT id INTO admin_id FROM auth.users WHERE email = 'jorgericardosalgado@gmail.com';
    SELECT id INTO jorge_id FROM auth.users WHERE email = 'jorgecriare2021@gmail.com';

    -- 2. Corrigir/Expandir ENUM app_role (Para evitar erro 22P02)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'lojista', 'prestador', 'fornecedor', 'cliente', 'user');
    ELSE
        -- Tenta adicionar 'user' se não existir no enum
        BEGIN
            ALTER TYPE public.app_role ADD VALUE 'user';
        EXCEPTION WHEN duplicate_object THEN
            NULL; -- Já existe
        END;
        BEGIN
            ALTER TYPE public.app_role ADD VALUE 'prestador';
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
        BEGIN
            ALTER TYPE public.app_role ADD VALUE 'admin';
        EXCEPTION WHEN duplicate_object THEN
            NULL;
        END;
    END IF;

    -- 3. Garante colunas de reputação com precisão correta no profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='karma_score') THEN
        ALTER TABLE public.profiles ADD COLUMN karma_score numeric(4,2) DEFAULT 5.0;
    ELSE
        ALTER TABLE public.profiles ALTER COLUMN karma_score TYPE numeric(4,2);
    END IF;

    -- 4. Upsert de Dados REAIS para Jorge Criare
    IF jorge_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, display_name, full_name, role, is_verified, karma_score, city, state, updated_at)
        VALUES (
            jorge_id, 
            'Jorge Criare', 
            'Jorge Criare', 
            'prestador', 
            true, 
            50.0, -- Representa 5.0 no frontend
            'São Paulo', 
            'SP', 
            now()
        )
        ON CONFLICT (id) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            is_verified = EXCLUDED.is_verified,
            karma_score = EXCLUDED.karma_score,
            city = EXCLUDED.city,
            state = EXCLUDED.state,
            updated_at = now();

        -- Sincroniza Saldo Real
        INSERT INTO public.user_coins (user_id, balance) 
        VALUES (jorge_id, 1500) ON CONFLICT (user_id) DO UPDATE SET balance = 1500;
        
        -- Sincroniza Role Real (Cast explícito para evitar erros de tipo)
        INSERT INTO public.user_roles (user_id, role) 
        VALUES (jorge_id, 'prestador'::public.app_role) 
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    -- 5. Upsert de Dados REAIS para Admin Master
    IF admin_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role) 
        VALUES (admin_id, 'admin'::public.app_role) 
        ON CONFLICT (user_id, role) DO NOTHING;

        UPDATE public.profiles SET role = 'admin' WHERE id = admin_id;
    END IF;

    -- 6. Grants e RLS (Indispensável para PostgREST)
    GRANT SELECT ON public.profiles TO authenticated;
    GRANT SELECT ON public.user_coins TO authenticated;
    GRANT SELECT ON public.user_roles TO authenticated;
    GRANT SELECT ON public.user_roles TO anon;
END $$;
