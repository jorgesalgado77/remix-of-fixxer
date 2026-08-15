-- ADMIN_RECOVERY_V4.sql
-- Objetivo: Correção total do schema para permitir login do administrador master.
-- Este script limpa possíveis triggers órfãos ou quebrados e garante o schema básico.

-- 1. Garante que a role 'admin' existe no enum se ele existir
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        -- Tenta adicionar 'admin' se não existir (ignora erro se já existir)
        BEGIN
            ALTER TYPE public.app_role ADD VALUE 'admin';
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;
END $$;

-- 2. Limpeza de Triggers Potencialmente Problemáticos
-- Erros 500 no Supabase Auth muitas vezes são causados por triggers em auth.users 
-- que tentam inserir em tabelas de public sem as permissões corretas ou com constraints violadas.

-- Remove temporariamente triggers de sincronização de perfil para depuração (se existirem)
-- Nota: Ajuste os nomes se forem diferentes no seu banco.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Garante a Tabela user_roles e Estrutura Admin
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role text NOT NULL, -- Usamos text para flexibilidade, ou mude para app_role se preferir
    unique (user_id, role)
);

-- Habilita RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Grants básicos
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- 4. Inserção do Admin Master com Segurança (Idempotente)
DO $$
DECLARE
    target_user_id uuid;
BEGIN
    -- Busca o ID do usuário pelo email
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'jorgericardosalgado@gmail.com';

    IF target_user_id IS NOT NULL THEN
        -- Garante entrada em user_roles
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;

        -- Garante entrada/atualização em profiles
        -- Usamos um bloco aninhado para ignorar erros de constraint em profiles
        BEGIN
            INSERT INTO public.profiles (id, full_name, status)
            VALUES (target_user_id, 'Admin Master', 'active')
            ON CONFLICT (id) DO UPDATE 
            SET status = 'active';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao atualizar profile, mas role admin foi garantida.';
        END;
    END IF;
END $$;

-- 5. Política de RLS para Admin poder ver tudo (Emergencial)
CREATE POLICY "Admins can do everything" ON public.user_roles
FOR ALL TO authenticated
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') IS NOT NULL
);

-- 6. Função helper para verificação de role (se não existir)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;
