-- SCHEMA COMPLETO PARA O WEBAPP FIXXER (SUPABASE EXTERNO)
-- COPIE E COLE NO EDITOR SQL DO SEU PROJETO SUPABASE

-- 1. ENUMS
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'lojista', 'prestador', 'fornecedor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABELA DE PLANOS DE ASSINATURA
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category public.app_role NOT NULL, -- lojista, prestador, fornecedor
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.1 RECURSOS DOS PLANOS (FEATURES)
CREATE TABLE IF NOT EXISTS public.plan_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
    feature_key TEXT NOT NULL, -- 'allow_chat', 'allow_contracts', 'priority_listing', 'unlimited_os'
    is_enabled BOOLEAN DEFAULT FALSE,
    UNIQUE(plan_id, feature_key)
);

-- 2.2 TABELA DE PERFIS (ATUALIZADA)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    role public.app_role NOT NULL DEFAULT 'lojista',
    plan_id UUID REFERENCES public.subscription_plans(id), -- Rastreia o plano ativo
    company_name TEXT,
    cnpj_cpf TEXT,
    specialty TEXT,
    portfolio_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir Planos Padrão (Freemium)
INSERT INTO public.subscription_plans (category, name, price) VALUES 
('lojista', 'Teste Gratuito Lojista', 0.00),
('prestador', 'Teste Gratuito Prestador', 0.00),
('fornecedor', 'Teste Gratuito Fornecedor', 0.00)
ON CONFLICT DO NOTHING;

-- 3. TABELA DE ROLES (PARA CONTROLE DE ACESSO)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- 4. TABELA DE CONFIGURAÇÃO (EMAILS AUTORIZADOS)
CREATE TABLE IF NOT EXISTS public.admin_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABELA DE AUDITORIA DE ACESSO
CREATE TABLE IF NOT EXISTS public.access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    email TEXT,
    event_type TEXT NOT NULL, -- 'login_attempt', 'redirect_block', 'role_check'
    status TEXT NOT NULL, -- 'success', 'failure', 'blocked'
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS e permissões para auditoria
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.access_logs TO authenticated, anon;
GRANT SELECT ON public.access_logs TO authenticated; -- RLS filtrará por admin

DO $$ BEGIN
    CREATE POLICY "Admins can view all logs" ON public.access_logs
        FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 6. FUNÇÃO PARA VERIFICAR ROLE (SECURITY DEFINER PARA BYPASS RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
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
  )
$$;

-- 6. CONFIGURAÇÃO DE SEGURANÇA (RLS)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;

-- 7. PERMISSÕES (GRANTS)
GRANT SELECT ON public.subscription_plans TO authenticated;
GRANT ALL ON public.subscription_plans TO service_role;
GRANT SELECT ON public.plan_features TO authenticated;
GRANT ALL ON public.plan_features TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
GRANT SELECT ON public.admin_config TO authenticated;
GRANT ALL ON public.admin_config TO service_role;

-- 8. POLÍTICAS DE ACESSO (RLS)

-- POLÍTICAS PARA PROFILES
DO $$ BEGIN
    CREATE POLICY "Users can view their own profile" ON public.profiles
        FOR SELECT TO authenticated USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update their own profile" ON public.profiles
        FOR UPDATE TO authenticated USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Admins can view all profiles" ON public.profiles
        FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Admins can update all profiles" ON public.profiles
        FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- POLÍTICAS PARA USER_ROLES
DO $$ BEGIN
    CREATE POLICY "Users can view their own roles" ON public.user_roles
        FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Admins can manage all roles" ON public.user_roles
        FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- POLÍTICAS PARA ADMIN_CONFIG
DO $$ BEGIN
    CREATE POLICY "Admins can manage admin_config" ON public.admin_config
        FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Authenticated users can read admin_config" ON public.admin_config
        FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 9. TRIGGER DE AUTOMAÇÃO (CRIA PERFIL AO REGISTRAR)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role public.app_role;
    is_admin BOOLEAN;
BEGIN
    -- Verifica se o email está na lista de admin_config ou é o master
    SELECT EXISTS (SELECT 1 FROM public.admin_config WHERE email = new.email) INTO is_admin;
    
    IF new.email = 'jorgericardosalgado@gmail.com' OR is_admin THEN
        default_role := 'admin';
    ELSE
        -- Captura a role dos metadados (enviada no cadastro) ou assume 'lojista'
        default_role := COALESCE((new.raw_user_meta_data->>'role')::public.app_role, 'lojista');
    END IF;

    INSERT INTO public.profiles (id, full_name, role, plan_id)
    VALUES (
        new.id, 
        COALESCE(new.raw_user_meta_data->>'full_name', ''), 
        default_role,
        (SELECT id FROM public.subscription_plans WHERE category = default_role AND price = 0 LIMIT 1)
    )
    ON CONFLICT (id) DO UPDATE SET 
        role = EXCLUDED.role,
        plan_id = COALESCE(profiles.plan_id, EXCLUDED.plan_id);
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, default_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 10. SINCRONIZAÇÃO INICIAL (PARA USUÁRIOS EXISTENTES)
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- Inserir email master na config se não existir
    INSERT INTO public.admin_config (email) VALUES ('jorgericardosalgado@gmail.com') ON CONFLICT DO NOTHING;

    FOR user_record IN SELECT id, email, raw_user_meta_data FROM auth.users LOOP
        -- O trigger handle_new_user pode não ter rodado para usuários antigos
        -- Vamos forçar a criação/atualização
        PERFORM public.handle_new_user_manual(user_record.id, user_record.email, user_record.raw_user_meta_data);
    END LOOP;
END $$;

-- FUNÇÃO AUXILIAR PARA SINCRONIZAÇÃO MANUAL
CREATE OR REPLACE FUNCTION public.handle_new_user_manual(_id UUID, _email TEXT, _meta JSONB)
RETURNS VOID AS $$
DECLARE
    default_role public.app_role;
    is_admin BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM public.admin_config WHERE email = _email) INTO is_admin;
    
    IF _email = 'jorgericardosalgado@gmail.com' OR is_admin THEN
        default_role := 'admin';
    ELSE
        default_role := COALESCE((_meta->>'role')::public.app_role, 'lojista');
    END IF;

    INSERT INTO public.profiles (id, full_name, role, plan_id)
    VALUES (
        _id, 
        COALESCE(_meta->>'full_name', ''), 
        default_role,
        (SELECT id FROM public.subscription_plans WHERE category = default_role AND price = 0 LIMIT 1)
    )
    ON CONFLICT (id) DO UPDATE SET 
        role = EXCLUDED.role,
        plan_id = COALESCE(profiles.plan_id, EXCLUDED.plan_id);
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_id, default_role)
    ON CONFLICT (user_id, role) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. SCRIPT PARA CRIAR USUÁRIO ADMINISTRADOR DIRETAMENTE (CASO NECESSÁRIO)
-- Copie e cole este bloco no SQL Editor para criar o Jorge como Admin Master
-- Nota: A senha '!jR17052' é apenas uma referência para o Auth.
-- Use as funções de hash do postgres ou prefira o método auth.signUp via código se quiser automatizar.
/*
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'jorgericardosalgado@gmail.com',
    crypt('!jR17052', gen_salt('bf')),
    now(),
    NULL,
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Jorge Ricardo Salgado","role":"admin"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
) ON CONFLICT (email) DO NOTHING;
*/

-- 12. SCRIPT DE DIAGNÓSTICO
-- RODE ISSO PARA VERIFICAR O STATUS
/*
SELECT 
    (SELECT count(*) FROM public.profiles) as total_profiles,
    (SELECT count(*) FROM public.user_roles) as total_roles,
    (SELECT count(*) FROM public.admin_config) as total_admins_config,
    (SELECT role FROM public.profiles WHERE id = (SELECT id FROM auth.users WHERE email = 'jorgericardosalgado@gmail.com')) as master_role_check;
*/
