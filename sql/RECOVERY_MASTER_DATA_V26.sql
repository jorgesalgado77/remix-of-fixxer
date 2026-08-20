DO $$
DECLARE
    jorge_id UUID;
    admin_id UUID;
    jorge_email TEXT := 'jorgecriare2021@gmail.com';
    admin_email TEXT := 'jorgericardosalgado@gmail.com';
BEGIN
    -- 1. Recuperar IDs reais baseados no email (Auth.Users)
    SELECT id INTO jorge_id FROM auth.users WHERE email = jorge_email LIMIT 1;
    SELECT id INTO admin_id FROM auth.users WHERE email = admin_email LIMIT 1;

    -- 2. Se não existir o usuário Jorge, não podemos criar saldo, mas garantimos que o perfil dele esteja correto se ele existir
    IF jorge_id IS NOT NULL THEN
        -- Garantir saldo de 3600 moedas para Jorge Salgado
        INSERT INTO public.coin_balances (user_id, balance, updated_at)
        VALUES (jorge_id, 3600, now())
        ON CONFLICT (user_id) DO UPDATE SET balance = 3600, updated_at = now();

        -- Garantir que a tabela legado user_coins também esteja sincronizada
        INSERT INTO public.user_coins (user_id, balance, updated_at)
        VALUES (jorge_id, 3600, now())
        ON CONFLICT (user_id) DO UPDATE SET balance = 3600, updated_at = now();

        -- Auditoria de nome e perfil para Jorge Salgado
        UPDATE public.profiles 
        SET display_name = 'Jorge Salgado', 
            full_name = 'Jorge Salgado', 
            role = 'prestador',
            is_verified = true 
        WHERE id = jorge_id;
        
        RAISE NOTICE 'Saldo de Jorge Salgado (jorgecriare2021@gmail.com) atualizado para 3600.';
    END IF;

    -- 3. Garantir saldo para Admin Master se ele existir
    IF admin_id IS NOT NULL THEN
        INSERT INTO public.coin_balances (user_id, balance, updated_at)
        VALUES (admin_id, 5000, now())
        ON CONFLICT (user_id) DO UPDATE SET balance = 5000, updated_at = now();
        
        INSERT INTO public.user_coins (user_id, balance, updated_at)
        VALUES (admin_id, 5000, now())
        ON CONFLICT (user_id) DO UPDATE SET balance = 5000, updated_at = now();
    END IF;

END $$;
