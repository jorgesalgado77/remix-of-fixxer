-- FIXXER MASTER DATA RECOVERY V18
-- ESTRATÉGIA: Sincronização Dinâmica e Hardening de RLS para Admin e Jorge Criare
-- Este script garante que os perfis existam com os dados corretos no banco externo.

DO $$ 
BEGIN
    -- 1. Garantir colunas críticas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_verified') THEN
        ALTER TABLE public.profiles ADD COLUMN is_verified boolean DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'karma_score') THEN
        ALTER TABLE public.profiles ADD COLUMN karma_score numeric DEFAULT 0.0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'plan_id') THEN
        ALTER TABLE public.profiles ADD COLUMN plan_id uuid;
    END IF;
END $$;

-- 2. Upsert de Perfis baseado no e-mail (resolvendo ID dinamicamente do auth.users)
DO $$
DECLARE
    admin_id uuid;
    test_id uuid;
BEGIN
    -- Busca IDs reais do auth.users
    SELECT id INTO admin_id FROM auth.users WHERE email = 'jorgericardosalgado@gmail.com';
    SELECT id INTO test_id FROM auth.users WHERE email = 'jorgecriare2021@gmail.com';

    -- Sincroniza Admin Master
    IF admin_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, display_name, full_name, role, is_verified, karma_score, updated_at)
        VALUES (admin_id, 'Admin Master', 'Admin Master', 'admin', true, 50.0, now())
        ON CONFLICT (id) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            is_verified = EXCLUDED.is_verified,
            karma_score = EXCLUDED.karma_score,
            updated_at = now();
            
        -- Garante Role de Admin
        INSERT INTO public.user_roles (user_id, role)
        VALUES (admin_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    -- Sincroniza Jorge Criare (Teste)
    IF test_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, display_name, full_name, role, avatar_url, is_verified, karma_score, updated_at)
        VALUES (
            test_id, 
            'Jorge Criare', 
            'Jorge Criare', 
            'prestador', 
            'https://id-preview--a2e86b01-ac4b-4241-8403-babc7f152d85.lovable.app/lovable-uploads/67107775-7286-4fba-a98b-70014b533d32.png',
            true, 
            48.0, 
            now()
        )
        ON CONFLICT (id) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            avatar_url = EXCLUDED.avatar_url,
            is_verified = EXCLUDED.is_verified,
            karma_score = EXCLUDED.karma_score,
            updated_at = now();

        -- Sincroniza Saldo de Moedas (1500)
        INSERT INTO public.user_coins (user_id, balance, updated_at)
        VALUES (test_id, 1500, now())
        ON CONFLICT (user_id) DO UPDATE SET
            balance = EXCLUDED.balance,
            updated_at = now();
    END IF;
END $$;

-- 3. Permissões Globais (Data API)
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.user_coins TO authenticated;
GRANT SELECT ON public.coin_transactions TO authenticated;

-- 4. RPCs de Moedas (Garantir que existam)
-- Nota: O corpo dessas RPCs já foi fornecido em turnos anteriores.
-- Aqui apenas garantimos permissão de execução.
GRANT EXECUTE ON FUNCTION public.credit_coins_safe TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_coins_safe TO authenticated;
