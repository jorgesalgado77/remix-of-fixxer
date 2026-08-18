DO $$
DECLARE
    jorge_id UUID;
    admin_id UUID;
    jorge_email TEXT := 'jorgecriare2021@gmail.com';
    admin_email TEXT := 'jorgericardosalgado@gmail.com';
    jorge_actual_id UUID;
    admin_actual_id UUID;
BEGIN
    -- 1. Tentar localizar os usuários reais no auth.users
    SELECT id INTO jorge_actual_id FROM auth.users WHERE email = jorge_email LIMIT 1;
    SELECT id INTO admin_actual_id FROM auth.users WHERE email = admin_email LIMIT 1;

    -- Se não encontrar, usamos os IDs fixos do sistema como fallback (IDs de sistema conhecidos)
    jorge_id := COALESCE(jorge_actual_id, 'b3378b88-5c46-4e50-9c2e-4b7264a4d6e9');
    admin_id := COALESCE(admin_actual_id, '6ba65048-803f-44f6-88d2-24d04fee1a0f');

    RAISE NOTICE 'Sincronizando Jorge Criare (ID: %) e Admin Master (ID: %)', jorge_id, admin_id;

    -- 2. Garantir coluna is_verified e plan_id com tipos corretos
    -- (Nota: is_verified geralmente é boolean, plan_id é text ou uuid referenciando planos)
    
    -- 3. Upsert do Perfil de Jorge Salgado (ex-Jorge Criare)
    -- O usuário solicitou explicitamente mudar de "JORGE CRIARE" para "JORGE SALGADO"
    INSERT INTO public.profiles (
        id, 
        display_name, 
        full_name, 
        role, 
        is_verified, 
        karma_score, 
        created_at, 
        avatar_url,
        bio
    )
    VALUES (
        jorge_id, 
        'Jorge Salgado', 
        'Jorge Salgado', 
        'prestador', 
        true, 
        4.8, 
        '2024-01-01', 
        'https://rnhgpxembtgupxnrohxo.supabase.co/storage/v1/object/public/media/avatars/jorge-profile.jpg',
        'Prestador Especialista em Reformas e Manutenção Residencial.'
    )
    ON CONFLICT (id) DO UPDATE SET 
        display_name = EXCLUDED.display_name, 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role, 
        is_verified = EXCLUDED.is_verified, 
        karma_score = EXCLUDED.karma_score, 
        avatar_url = EXCLUDED.avatar_url;

    -- 4. Upsert do Perfil do Admin Master
    INSERT INTO public.profiles (
        id, 
        display_name, 
        full_name, 
        role, 
        is_verified, 
        karma_score, 
        created_at, 
        avatar_url
    )
    VALUES (
        admin_id, 
        'Admin Master', 
        'Admin Master', 
        'admin', 
        true, 
        5.0, 
        '2024-01-01', 
        'https://rnhgpxembtgupxnrohxo.supabase.co/storage/v1/object/public/media/avatars/admin-master.png'
    )
    ON CONFLICT (id) DO UPDATE SET 
        display_name = EXCLUDED.display_name, 
        role = EXCLUDED.role, 
        is_verified = EXCLUDED.is_verified, 
        karma_score = EXCLUDED.karma_score, 
        avatar_url = EXCLUDED.avatar_url;

    -- 5. Garantir Roles no user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (jorge_id, 'prestador')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

END $$;
