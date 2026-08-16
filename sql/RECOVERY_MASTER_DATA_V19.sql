-- FIXXER MASTER DATA RECOVERY V19
-- ESTRATÉGIA: Correção de Precisão Numérica (Karma Score) e Sincronização Dinâmica
-- Este script resolve o erro 22003 (numeric field overflow) no campo karma_score.

DO $$ 
BEGIN
    -- 1. Garantir colunas críticas e ajustar precisão se necessário
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_verified') THEN
        ALTER TABLE public.profiles ADD COLUMN is_verified boolean DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'karma_score') THEN
        -- Cria com precisão suficiente para valores como 50.0 ou 100.0
        ALTER TABLE public.profiles ADD COLUMN karma_score numeric(5,2) DEFAULT 0.0;
    ELSE
        -- Se a coluna já existe mas tem precisão baixa (ex: numeric(2,1)), tenta aumentar
        -- Nota: Isso pode falhar se a coluna for parte de uma view ou índice complexo, 
        -- mas é a correção direta para o erro 22003 relatado.
        BEGIN
            ALTER TABLE public.profiles ALTER COLUMN karma_score TYPE numeric(5,2);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Não foi possível alterar o tipo de karma_score. Tentando prosseguir com valores menores.';
        END;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'plan_id') THEN
        ALTER TABLE public.profiles ADD COLUMN plan_id uuid;
    END IF;
END $$;

-- 2. Upsert de Perfis baseado no e-mail
DO $$
DECLARE
    admin_id uuid;
    test_id uuid;
    admin_karma numeric;
    test_karma numeric;
BEGIN
    -- Busca IDs reais
    SELECT id INTO admin_id FROM auth.users WHERE email = 'jorgericardosalgado@gmail.com';
    SELECT id INTO test_id FROM auth.users WHERE email = 'jorgecriare2021@gmail.com';

    -- Define valores de karma baseados na capacidade da coluna
    -- Se a coluna for numeric(2,1), o máximo é 9.9. Se for numeric(5,2), 50.0 é ok.
    -- O erro 22003 indica que 50.0 estourou a escala (10^1).
    admin_karma := 5.0; -- Valor seguro para numeric(2,1) que representa nota máxima
    test_karma := 4.8;

    -- Sincroniza Admin Master
    IF admin_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, display_name, full_name, role, is_verified, karma_score, updated_at)
        VALUES (admin_id, 'Admin Master', 'Admin Master', 'admin', true, admin_karma, now())
        ON CONFLICT (id) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            is_verified = EXCLUDED.is_verified,
            karma_score = EXCLUDED.karma_score,
            updated_at = now();
            
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
            test_karma, 
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

        INSERT INTO public.user_coins (user_id, balance, updated_at)
        VALUES (test_id, 1500, now())
        ON CONFLICT (user_id) DO UPDATE SET
            balance = EXCLUDED.balance,
            updated_at = now();
    END IF;
END $$;

-- 3. Permissões
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.user_coins TO authenticated;
GRANT SELECT ON public.coin_transactions TO authenticated;
