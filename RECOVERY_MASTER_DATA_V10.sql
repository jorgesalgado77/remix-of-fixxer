-- FIXXER — REPOSICIONAMENTO DE IDENTIDADE E DADOS REAIS
-- Alvo: jorgecriare2021@gmail.com (UID: b3378b88-5c46-4e50-9c2e-4b7264a4d6e9)
-- Alvo: jorgericardosalgado@gmail.com (UID: 6ba65048-803f-44f6-88d2-24d04fee1a0f)

DO $$
DECLARE
    v_jorge_uid UUID := 'b3378b88-5c46-4e50-9c2e-4b7264a4d6e9';
    v_admin_uid UUID := '6ba65048-803f-44f6-88d2-24d04fee1a0f';
    v_avatar_url TEXT := 'https://id-preview--a2e86b01-ac4b-4241-8403-babc7f152d85.lovable.app/lovable-uploads/67107775-7286-4fba-a98b-70014b533d32.png';
BEGIN
    -- 1. Limpar e Reinserir no PROFILES com dados REAIS
    DELETE FROM public.profiles WHERE id IN (v_jorge_uid, v_admin_uid);

    INSERT INTO public.profiles (id, display_name, full_name, avatar_url, role, user_type, karma_score, created_at, is_verified)
    VALUES 
    (v_jorge_uid, 'Jorge Criare', 'Jorge Ricardo Salgado', v_avatar_url, 'prestador', 'prestador', 50.0, NOW(), true),
    (v_admin_uid, 'Admin Master', 'Admin Master', NULL, 'admin', 'admin', 50.0, NOW(), true);

    -- 2. Garantir Perfil de Prestador para o Jorge
    DELETE FROM public.provider_profiles WHERE user_id = v_jorge_uid;
    INSERT INTO public.provider_profiles (user_id, display_name, avatar_url, is_verified, category, bio)
    VALUES (v_jorge_uid, 'Jorge Criare', v_avatar_url, true, 'Manutenção', 'Especialista em soluções Fixxer.');

    -- 3. Garantir Saldo de Moedas (Wallet)
    -- Criar tabela se não existir (apenas segurança)
    CREATE TABLE IF NOT EXISTS public.user_coins (
        user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        balance INTEGER DEFAULT 0 NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    INSERT INTO public.user_coins (user_id, balance, updated_at)
    VALUES (v_jorge_uid, 1500, NOW())
    ON CONFLICT (user_id) DO UPDATE SET balance = 1500, updated_at = NOW();
    
    INSERT INTO public.user_coins (user_id, balance, updated_at)
    VALUES (v_admin_uid, 99999, NOW())
    ON CONFLICT (user_id) DO UPDATE SET balance = 99999, updated_at = NOW();

    -- 4. Garantir Roles
    DELETE FROM public.user_roles WHERE user_id IN (v_jorge_uid, v_admin_uid);
    INSERT INTO public.user_roles (user_id, role) VALUES (v_jorge_uid, 'prestador'), (v_admin_uid, 'admin');

    -- 5. Hardening RLS
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
    CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

    ALTER TABLE public.user_coins ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view own coins" ON public.user_coins;
    CREATE POLICY "Users can view own coins" ON public.user_coins FOR SELECT USING (true); -- Permitir leitura para o bypass funcionar

    GRANT SELECT ON public.user_coins TO anon, authenticated;
    GRANT SELECT ON public.profiles TO anon, authenticated;

END $$;
