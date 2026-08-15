-- SCRIPT DE RECUPERAÇÃO E SINCRONIZAÇÃO DO ADMINISTRADOR MASTER
-- Este script garante a existência do usuário admin e sincroniza as roles
-- Execute este script no SQL Editor do dashboard do Supabase.

-- 1. Obter o UUID do usuário pelo email
DO $$
DECLARE
    target_user_id uuid;
BEGIN
    -- Busca o ID na tabela auth.users (tabela interna do Supabase)
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'jorgericardosalgado@gmail.com';

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'Usuário jorgericardosalgado@gmail.com não encontrado em auth.users. Verifique se o cadastro foi concluído.';
    ELSE
        RAISE NOTICE 'Usuário encontrado. ID: %', target_user_id;

        -- 2. Garantir que o perfil existe na tabela public.profiles
        INSERT INTO public.profiles (id, full_name, role, status, updated_at)
        VALUES (target_user_id, 'Admin Master', 'admin', 'active', now())
        ON CONFLICT (id) DO UPDATE 
        SET role = 'admin', status = 'active', updated_at = now();

        -- 3. Garantir a role na tabela public.user_roles (Fonte Única de Verdade)
        -- Primeiro remove qualquer role conflitante para este usuário se necessário
        DELETE FROM public.user_roles WHERE user_id = target_user_id AND role != 'admin';
        
        -- Insere a role admin
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;

        RAISE NOTICE 'Roles e perfis sincronizados com sucesso para o administrador.';
    END IF;
END $$;

-- 4. Verificação final
SELECT p.id, p.role as profile_role, ur.role as user_role, p.status
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
WHERE p.id = (SELECT id FROM auth.users WHERE email = 'jorgericardosalgado@gmail.com');
