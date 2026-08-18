-- RECOVERY_MASTER_DATA_V22.sql
-- Objetivo: Sincronizar dados reais de Jorge Criare e Admin Master para exibição consistente
-- Garante que fotos, nomes e selos venham do banco externo

DO $$
DECLARE
    jorge_id UUID := 'b3378b88-5c46-4e50-9c2e-4b7264a4d6e9';
    admin_id UUID := '6ba65048-803f-44f6-88d2-24d04fee1a0f';
    jorge_actual_id UUID;
    admin_actual_id UUID;
BEGIN
    -- 1. Recuperar IDs reais por e-mail (evita falha se o UUID no sandbox for diferente do banco real)
    SELECT id INTO jorge_actual_id FROM auth.users WHERE email = 'jorgecriare2021@gmail.com' LIMIT 1;
    SELECT id INTO admin_actual_id FROM auth.users WHERE email = 'jorgericardosalgado@gmail.com' LIMIT 1;

    -- Se não encontrar, usa os IDs padrão do sandbox (fallback)
    jorge_id := COALESCE(jorge_actual_id, jorge_id);
    admin_id := COALESCE(admin_actual_id, admin_id);

    -- 2. Garantir coluna is_verified e karma_score (ajuste de tipo)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_verified') THEN
        ALTER TABLE public.profiles ADD COLUMN is_verified BOOLEAN DEFAULT false;
    END IF;

    -- Ajustar karma_score para evitar overflow (precision 5, scale 2 permite até 999.99)
    ALTER TABLE public.profiles ALTER COLUMN karma_score TYPE numeric(5,2);

    -- 3. Upsert Jorge Criare (Prestador)
    INSERT INTO public.profiles (
        id, display_name, full_name, role, is_verified, karma_score, created_at, avatar_url
    ) VALUES (
        jorge_id, 
        'Jorge Criare', 
        'Jorge Criare', 
        'prestador', 
        true, 
        4.8, 
        '2024-01-01', 
        'https://rnhgpxembtgupxnrohxo.supabase.co/storage/v1/object/public/media/avatars/jorge-profile.jpg'
    ) ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        role = EXCLUDED.role,
        is_verified = EXCLUDED.is_verified,
        karma_score = EXCLUDED.karma_score,
        avatar_url = EXCLUDED.avatar_url;

    -- 4. Upsert Admin Master
    INSERT INTO public.profiles (
        id, display_name, full_name, role, is_verified, karma_score, created_at, avatar_url
    ) VALUES (
        admin_id, 
        'Admin Master', 
        'Admin Master', 
        'admin', 
        true, 
        5.0, 
        '2024-01-01', 
        'https://rnhgpxembtgupxnrohxo.supabase.co/storage/v1/object/public/media/avatars/admin-master.png'
    ) ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        role = EXCLUDED.role,
        is_verified = EXCLUDED.is_verified,
        karma_score = EXCLUDED.karma_score,
        avatar_url = EXCLUDED.avatar_url;

    -- 5. Vincular roles reais na user_roles
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (jorge_id, 'prestador') 
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role) 
    VALUES (admin_id, 'admin') 
    ON CONFLICT (user_id, role) DO NOTHING;

END $$;

-- Garantir acesso
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.user_roles TO authenticated;
