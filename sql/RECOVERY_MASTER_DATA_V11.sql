-- FIXXER MASTER DATA RECOVERY V15
-- ESTRATÉGIA DE RECUPERAÇÃO DINÂMICA (PARA CONTORNO DE FK CONSTRAINT)

-- 1. Garantir que a coluna is_verified exista
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_verified') THEN
    ALTER TABLE public.profiles ADD COLUMN is_verified BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 2. RECUPERAÇÃO DINÂMICA DE UUIDs
-- O erro 23503 (FK Violation) ocorre porque os UUIDs fixos não existem na tabela auth.users do seu banco.
-- Este script detecta os IDs reais baseados no e-mail e sincroniza os perfis.

DO $$
DECLARE
    v_master_id uuid;
    v_test_id uuid;
BEGIN
    -- Busca os IDs reais dos usuários no auth.users
    SELECT id INTO v_master_id FROM auth.users WHERE email = 'jorgericardosalgado@gmail.com';
    SELECT id INTO v_test_id FROM auth.users WHERE email = 'jorgecriare2021@gmail.com';

    -- Se não encontrar, o script não tenta inserir no profiles para evitar o erro de FK.
    -- O usuário DEVE ser criado manualmente no painel 'Authentication' do Supabase se ainda não existir.

    IF v_master_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, display_name, full_name, role, user_type, karma_score, city, state, is_verified, created_at)
        VALUES (v_master_id, 'Admin Master', 'Admin Master FIXXER', 'admin', 'admin', 5.0, 'São Paulo', 'SP', true, now())
        ON CONFLICT (id) DO UPDATE SET
            display_name = 'Admin Master',
            role = 'admin',
            user_type = 'admin',
            is_verified = true;

        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_master_id, 'admin')
        ON CONFLICT DO NOTHING;
    END IF;

    IF v_test_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, display_name, full_name, avatar_url, role, user_type, karma_score, city, state, is_verified, created_at)
        VALUES (v_test_id, 'Jorge Criare', 'Jorge Criare', 'https://id-preview--a2e86b01-ac4b-4241-8403-babc7f152d85.lovable.app/lovable-uploads/67107775-7286-4fba-a98b-70014b533d32.png', 'prestador', 'prestador', 4.8, 'São Paulo', 'SP', true, now())
        ON CONFLICT (id) DO UPDATE SET
            display_name = 'Jorge Criare',
            avatar_url = 'https://id-preview--a2e86b01-ac4b-4241-8403-babc7f152d85.lovable.app/lovable-uploads/67107775-7286-4fba-a98b-70014b533d32.png',
            role = 'prestador',
            user_type = 'prestador',
            is_verified = true;

        INSERT INTO public.user_coins (user_id, balance, updated_at)
        VALUES (v_test_id, 1500, now())
        ON CONFLICT (user_id) DO UPDATE SET balance = 1500;
    END IF;

    IF v_master_id IS NULL OR v_test_id IS NULL THEN
        RAISE NOTICE 'AVISO: Um ou mais e-mails não foram encontrados na tabela auth.users. Crie-os manualmente no painel do Supabase.';
    END IF;
END $$;

-- 3. Garantir Permissões
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_coins TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

NOTIFY pgrst, 'reload schema';




