-- RECOVERY_MASTER_DATA_V24.sql
-- Objetivo: Sincronizar categorias, nomes e dados reais conforme regras mestras.
-- Categorias Válidas (app_role): 'prestador', 'lojista', 'fornecedor', 'cliente'

DO $$
DECLARE
    jorge_id UUID;
    admin_id UUID;
BEGIN
    -- 1. Recuperação Dinâmica por Email (Garante que usamos os UUIDs corretos do auth.users)
    SELECT id INTO jorge_id FROM auth.users WHERE email = 'jorgecriare2021@gmail.com' LIMIT 1;
    SELECT id INTO admin_id FROM auth.users WHERE email = 'jorgericardosalgado@gmail.com' LIMIT 1;

    -- 2. Atualização JORGE SALGADO (PRESTADOR)
    IF jorge_id IS NOT NULL THEN
        -- Garantir Role correta
        DELETE FROM public.user_roles WHERE user_id = jorge_id;
        INSERT INTO public.user_roles (user_id, role) VALUES (jorge_id, 'prestador');
        
        -- Atualizar Perfil Principal
        INSERT INTO public.profiles (
            id, display_name, full_name, role, is_verified, karma_score, created_at, avatar_url
        ) VALUES (
            jorge_id, 
            'JORGE SALGADO', 
            'Jorge Salgado', 
            'prestador', 
            true, 
            4.8, 
            '2024-01-01', 
            'https://rnhgpxembtgupxnrohxo.supabase.co/storage/v1/object/public/media/avatars/jorge-profile.jpg'
        )
        ON CONFLICT (id) DO UPDATE SET 
            display_name = 'JORGE SALGADO', 
            full_name = 'Jorge Salgado',
            role = 'prestador', 
            is_verified = true, 
            avatar_url = 'https://rnhgpxembtgupxnrohxo.supabase.co/storage/v1/object/public/media/avatars/jorge-profile.jpg';
            
        -- Limpar qualquer flag de admin que possa ter sobrado no metadado (se existisse campo)
        -- O sistema agora valida admin apenas por email no front, mas mantemos o DB limpo.
    END IF;

    -- 3. Atualização ADMIN MASTER (ADMIN)
    IF admin_id IS NOT NULL THEN
        DELETE FROM public.user_roles WHERE user_id = admin_id;
        INSERT INTO public.user_roles (user_id, role) VALUES (admin_id, 'admin');
        
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
        )
        ON CONFLICT (id) DO UPDATE SET 
            display_name = 'Admin Master', 
            role = 'admin', 
            is_verified = true,
            avatar_url = 'https://rnhgpxembtgupxnrohxo.supabase.co/storage/v1/object/public/media/avatars/admin-master.png';
    END IF;

    -- 4. Normalização de Categorias para outros usuários (Exemplo de Lojista e Fornecedor se existirem)
    -- Esta parte é genérica para garantir que as roles no profiles batam com user_roles
    UPDATE public.profiles p
    SET role = (SELECT role::text FROM public.user_roles ur WHERE ur.user_id = p.id LIMIT 1)
    WHERE role IS NULL OR role = 'user';

END $$;
