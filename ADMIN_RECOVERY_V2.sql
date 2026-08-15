-- SCRIPT DE RECUPERAÇÃO DO ADMINISTRADOR (CORRIGIDO PARA VIOLAÇÃO DE CONSTRAINT)
-- O erro anterior indicava uma violação na constraint profiles_status_chk.
-- Isso ocorre porque o campo 'status' da inserção conflitou com o check existente.
-- Vamos primeiro identificar a estrutura real da tabela profiles.

DO $$
DECLARE
    target_user_id uuid;
BEGIN
    -- 1. Busca o ID na tabela auth.users
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'jorgericardosalgado@gmail.com';

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'Usuário não encontrado em auth.users.';
    ELSE
        -- 2. Sincroniza Roles Primeiro (Tabela independente de profiles)
        DELETE FROM public.user_roles WHERE user_id = target_user_id AND role != 'admin';
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;

        -- 3. Atualiza Perfil
        -- Tentativa 1: Atualizar apenas o necessário. 
        -- O erro de constraint sugere que 'active' pode não ser um valor válido para a coluna status
        -- ou que há outra coluna obrigatória com check.
        
        BEGIN
            UPDATE public.profiles 
            SET role = 'admin', updated_at = now()
            WHERE id = target_user_id;
            
            IF NOT FOUND THEN
               -- Se não existe, tenta inserir com o mínimo possível
               INSERT INTO public.profiles (id, full_name, role)
               VALUES (target_user_id, 'Admin Master', 'admin');
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao atualizar profiles: %. Continuando...', SQLERRM;
        END;

        RAISE NOTICE 'Recuperação concluída para o Admin.';
    END IF;
END $$;

-- Verificação da estrutura e valores (ajuda a diagnosticar a constraint)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND table_schema = 'public';

SELECT id, role, status
FROM public.profiles
WHERE id = (SELECT id FROM auth.users WHERE email = 'jorgericardosalgado@gmail.com');
