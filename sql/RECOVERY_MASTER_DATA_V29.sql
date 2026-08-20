
-- ==============================================================================
-- RECOVERY_MASTER_DATA_V29.sql
-- OBJETIVO: Sincronização Final de Identidade Real no Supabase Externo.
-- Ação: Forçar dados reais para Jorge Salgado e Admin Master, garantindo 
-- consistência entre perfis base e especializados.
-- ==============================================================================

DO $$ 
DECLARE
    admin_id uuid;
    jorge_id uuid;
BEGIN
    -- 1. Recuperar IDs reais baseados no e-mail (fonte autoritativa auth.users)
    SELECT id INTO admin_id FROM auth.users WHERE email = 'jorgericardosalgado@gmail.com';
    SELECT id INTO jorge_id FROM auth.users WHERE email = 'jorgecriare2021@gmail.com';

    -- 2. Garantir coluna is_verified e email em profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_verified') THEN
        ALTER TABLE public.profiles ADD COLUMN is_verified boolean DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE public.profiles ADD COLUMN email text;
    END IF;

    -- 3. UPSERT JORGE SALGADO (PRESTADOR)
    IF jorge_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, display_name, full_name, role, is_verified, karma_score, created_at, email, avatar_url)
        VALUES (
            jorge_id, 
            'Jorge Salgado', 
            'Jorge Ricardo Salgado', 
            'prestador', 
            true, 
            48.5, 
            now(), 
            'jorgecriare2021@gmail.com',
            'https://rnhgpxembtgupxnrohxo.supabase.co/storage/v1/object/public/avatars/jorge_salgado.jpg'
        )
        ON CONFLICT (id) DO UPDATE SET 
            display_name = EXCLUDED.display_name,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            is_verified = EXCLUDED.is_verified,
            karma_score = EXCLUDED.karma_score,
            email = EXCLUDED.email,
            avatar_url = EXCLUDED.avatar_url;

        -- Especialização de Prestador
        INSERT INTO public.provider_profiles (user_id, display_name, is_verified, avatar_url)
        VALUES (jorge_id, 'Jorge Salgado', true, 'https://rnhgpxembtgupxnrohxo.supabase.co/storage/v1/object/public/avatars/jorge_salgado.jpg')
        ON CONFLICT (user_id) DO UPDATE SET 
            display_name = EXCLUDED.display_name,
            is_verified = EXCLUDED.is_verified,
            avatar_url = EXCLUDED.avatar_url;

        -- Saldo de Moedas (Prompt 26/27)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coin_balances') THEN
            INSERT INTO public.coin_balances (user_id, balance)
            VALUES (jorge_id, 3600.00)
            ON CONFLICT (user_id) DO UPDATE SET balance = EXCLUDED.balance;
        END IF;

        -- Role de Prestador
        INSERT INTO public.user_roles (user_id, role)
        VALUES (jorge_id, 'user')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    -- 4. UPSERT ADMIN MASTER
    IF admin_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, display_name, full_name, role, is_verified, karma_score, created_at, email, avatar_url)
        VALUES (
            admin_id, 
            'Admin Master', 
            'Jorge Ricardo Salgado (Master)', 
            'admin', 
            true, 
            50.0, 
            now(), 
            'jorgericardosalgado@gmail.com',
            'https://rnhgpxembtgupxnrohxo.supabase.co/storage/v1/object/public/avatars/admin_master.jpg'
        )
        ON CONFLICT (id) DO UPDATE SET 
            display_name = EXCLUDED.display_name,
            role = EXCLUDED.role,
            is_verified = EXCLUDED.is_verified,
            email = EXCLUDED.email;

        -- Role de Admin
        INSERT INTO public.user_roles (user_id, role)
        VALUES (admin_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

END $$;

-- Garantir privilégios
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.provider_profiles TO authenticated;
GRANT SELECT ON public.coin_balances TO authenticated;
