DO $$
DECLARE
    jorge_id UUID := 'b3378b88-5c46-4e50-9c2e-4b7264a4d6e9';
    admin_id UUID := '6ba65048-803f-44f6-88d2-24d04fee1a0f';
    jorge_actual_id UUID;
    admin_actual_id UUID;
BEGIN
    -- 1. Recuperar IDs reais por e-mail (Fonte Única de Verdade do Auth)
    SELECT id INTO jorge_actual_id FROM auth.users WHERE email = 'jorgecriare2021@gmail.com' LIMIT 1;
    SELECT id INTO admin_actual_id FROM auth.users WHERE email = 'jorgericardosalgado@gmail.com' LIMIT 1;
    
    jorge_id := COALESCE(jorge_actual_id, jorge_id);
    admin_id := COALESCE(admin_actual_id, admin_id);

    -- 2. Corrigir Perfil de Jorge Salgado (ex-Criare)
    INSERT INTO public.profiles (
        id, display_name, full_name, role, is_verified, karma_score, created_at, avatar_url, city, state
    )
    VALUES (
        jorge_id, 
        'Jorge Salgado', 
        'Jorge Salgado', 
        'prestador', 
        true, 
        4.9, 
        '2024-01-01', 
        'https://rnhgpxembtgupxnrohxo.supabase.co/storage/v1/object/public/media/avatars/jorge-profile.jpg',
        'São Paulo',
        'SP'
    )
    ON CONFLICT (id) DO UPDATE SET 
        display_name = EXCLUDED.display_name, 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role, 
        is_verified = EXCLUDED.is_verified, 
        karma_score = EXCLUDED.karma_score, 
        avatar_url = EXCLUDED.avatar_url,
        city = EXCLUDED.city,
        state = EXCLUDED.state;

    -- 3. Corrigir Perfil do Admin Master
    INSERT INTO public.profiles (
        id, display_name, full_name, role, is_verified, karma_score, created_at, avatar_url, city, state
    )
    VALUES (
        admin_id, 
        'Admin Master', 
        'Admin Master', 
        'admin', 
        true, 
        5.0, 
        '2024-01-01', 
        'https://rnhgpxembtgupxnrohxo.supabase.co/storage/v1/object/public/media/avatars/admin-master.png',
        'Brasília',
        'DF'
    )
    ON CONFLICT (id) DO UPDATE SET 
        display_name = EXCLUDED.display_name, 
        avatar_url = EXCLUDED.avatar_url,
        city = EXCLUDED.city,
        state = EXCLUDED.state;

    -- 4. Garantir moedas para Jorge Salgado
    INSERT INTO public.coin_balances (user_id, balance, updated_at)
    VALUES (jorge_id, 1500, now())
    ON CONFLICT (user_id) DO UPDATE SET balance = 1500, updated_at = now();

END $$;
