-- ==============================================================================
-- ADMIN_FINAL_REMEDY.sql - RECUPERAÇÃO DEFINITIVA DO ADMINISTRADOR MASTER
-- ==============================================================================
-- Este script resolve falhas 500 no login e garante acesso total ao Master.
-- ==============================================================================

DO $$ 
DECLARE
    target_user_id UUID;
    target_email TEXT := 'jorgericardosalgado@gmail.com';
BEGIN
    -- 1. Obter o UUID do usuário pelo e-mail
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'Usuário % não encontrado em auth.users. Crie o usuário no dashboard do Supabase primeiro.', target_email;
    ELSE
        -- 2. Garantir o Tipo de Role
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
            CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
        END IF;

        -- 3. Criar a Tabela user_roles se não existir
        CREATE TABLE IF NOT EXISTS public.user_roles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            role public.app_role NOT NULL,
            UNIQUE(user_id, role)
        );

        -- 4. Garantir Acesso do PostgREST (Data API)
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
        GRANT ALL ON public.user_roles TO service_role;

        -- 5. Atribuir Role de Admin ao Master
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;

        -- 6. Atualizar Perfil (profiles)
        -- Evita falhas de constraint sendo conservador nas colunas
        UPDATE public.profiles 
        SET role = 'admin', 
            status = 'active', 
            updated_at = NOW() 
        WHERE id = target_user_id;

        IF NOT FOUND THEN
            INSERT INTO public.profiles (id, full_name, role, status, updated_at)
            VALUES (target_user_id, 'Admin Master', 'admin', 'active', NOW());
        END IF;

        -- 7. Limpeza de Triggers do Schema Auth (Causa comum de erro 500)
        -- Remove triggers que tentam inserir dados no login/cadastro e falham
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        -- Nota: Se você tinha um trigger de sincronização, recrie-o de forma resiliente se necessário.

        RAISE NOTICE 'Acesso administrativo configurado com sucesso para %', target_email;
    END IF;
END $$;

-- 8. Função de Segurança has_role (Security Definer para ignorar RLS circular)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  ) OR (
    -- Bypass definitivo para o e-mail master
    SELECT email = 'jorgericardosalgado@gmail.com'
    FROM auth.users
    WHERE id = _user_id
  );
$$;

-- 9. Política de RLS para Admin (Exemplo)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 10. Grant Adicional para Auditoria
GRANT ALL ON TABLE public.info_admin_audit_logs TO authenticated;
GRANT ALL ON TABLE public.info_admin_audit_logs TO service_role;
