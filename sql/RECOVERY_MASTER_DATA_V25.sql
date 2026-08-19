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

    -- 2. Corrigir Perfil de Jorge Salgado (Prestador - SEM ADMIN)
    UPDATE public.profiles 
    SET 
        role = 'prestador',
        user_type = 'prestador',
        display_name = 'Jorge Salgado',
        full_name = 'Jorge Salgado',
        is_verified = true
    WHERE id = jorge_id;

    -- 3. Remover qualquer permissão administrativa de Jorge Salgado
    DELETE FROM public.user_roles 
    WHERE user_id = jorge_id AND role = 'admin';

    -- 4. Garantir que apenas Jorge Salgado tenha o role de prestador se não tiver
    INSERT INTO public.user_roles (user_id, role)
    VALUES (jorge_id, 'prestador')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- 5. Garantir Perfil do Admin Master
    UPDATE public.profiles 
    SET 
        role = 'admin',
        user_type = 'admin',
        display_name = 'Admin Master'
    WHERE id = admin_id;

    -- 6. Garantir permissão administrativa EXCLUSIVA para o Admin Master
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- 7. Log de Auditoria Simples
    RAISE NOTICE 'Auditoria de Permissões Concluída: jorgecriare agora é estritamente PRESTADOR. jorgericardosalgado é ADMIN MASTER.';
END $$;
