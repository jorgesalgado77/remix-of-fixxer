-- SCHEMA COMPLETO E IDEMPOTENTE PARA O WEBAPP FIXXER
-- Este script pode ser executado múltiplas vezes sem causar erros

-- 1. ENUMS
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'lojista', 'prestador', 'fornecedor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABELAS
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category public.app_role NOT NULL,
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT subscription_plans_category_name_key UNIQUE (category, name)
);

CREATE TABLE IF NOT EXISTS public.plan_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
    feature_key TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT FALSE,
    CONSTRAINT plan_features_plan_id_feature_key_key UNIQUE (plan_id, feature_key)
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    role public.app_role NOT NULL DEFAULT 'lojista',
    plan_id UUID,
    company_name TEXT,
    cnpj_cpf TEXT,
    phone TEXT,
    whatsapp TEXT,
    -- Endereço
    cep TEXT,
    street TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    -- Atividade e Especialidade
    business_category TEXT, -- Para fornecedor
    specialty TEXT, -- Para prestador
    description TEXT,
    -- Lojista especifico
    brand_flag TEXT,
    -- Prestador especifico
    service_types JSONB DEFAULT '[]'::jsonb,
    commission_rate DECIMAL(5, 2),
    fixed_rates JSONB DEFAULT '[]'::jsonb,
    is_medidor_conferente BOOLEAN DEFAULT FALSE,
    -- Mídia e Reputação
    avatar_url TEXT,
    banner_url TEXT,
    karma_score DECIMAL(3, 2) DEFAULT 5.00,
    portfolio_media JSONB DEFAULT '[]'::jsonb,
    documents JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Bandeiras Dinâmicas
CREATE TABLE IF NOT EXISTS public.brand_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir bandeiras iniciais
INSERT INTO public.brand_flags (name) VALUES 
('Casa Brasileira'), ('Criare'), ('DalMobile'), ('Dellanno'), ('Fabrillis'), 
('Favorita'), ('Florense'), ('Incolar'), ('Italinea'), ('My Box'), 
('New'), ('Predilecta'), ('Romanzza'), ('Todeschini')
ON CONFLICT (name) DO NOTHING;

-- Garantir que a coluna plan_id existe caso a tabela já tenha sido criada antes
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='plan_id') THEN
        ALTER TABLE public.profiles ADD COLUMN plan_id UUID REFERENCES public.subscription_plans(id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.admin_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    email TEXT,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL,
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. FUNÇÕES AUXILIARES
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- 4. SEGURANÇA (RLS) - RESET E REAPLICAÇÃO
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('subscription_plans', 'plan_features', 'profiles', 'user_roles', 'admin_config', 'access_logs', 'brand_flags')) LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY';
    END LOOP;
END $$;

-- Limpeza de políticas antigas para garantir idempotência total
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.' || quote_ident(pol.tablename);
    END LOOP;
END $$;

-- Recriação das políticas
CREATE POLICY "Public Read Plans" ON public.subscription_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin Manage Plans" ON public.subscription_plans FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public Read Features" ON public.plan_features FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin Manage Features" ON public.plan_features FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users View Own Profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users Update Own Profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins View All Profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins Update All Profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users View Own Roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins Manage All Roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins Manage Config" ON public.admin_config FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Read Config" ON public.admin_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin Access Logs" ON public.access_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System Insert Logs" ON public.access_logs FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "Public Read Brands" ON public.brand_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users Add Brands" ON public.brand_flags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin Manage Brands" ON public.brand_flags FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. GRANTS
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON public.subscription_plans, public.plan_features TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT, INSERT ON public.brand_flags TO authenticated;
GRANT INSERT ON public.access_logs TO authenticated, anon;

-- 6. TRIGGER DE REGISTRO
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role public.app_role;
BEGIN
    IF new.email = 'jorgericardosalgado@gmail.com' OR EXISTS (SELECT 1 FROM public.admin_config WHERE email = new.email) THEN
        default_role := 'admin';
    ELSE
        default_role := COALESCE((new.raw_user_meta_data->>'role')::public.app_role, 'lojista');
    END IF;

    INSERT INTO public.profiles (id, full_name, role, plan_id)
    VALUES (
        new.id, 
        COALESCE(new.raw_user_meta_data->>'full_name', ''), 
        default_role,
        (SELECT id FROM public.subscription_plans WHERE category = default_role AND price = 0 LIMIT 1)
    ) ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, default_role) ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 7. DADOS INICIAIS
INSERT INTO public.admin_config (email) VALUES ('jorgericardosalgado@gmail.com') ON CONFLICT DO NOTHING;
INSERT INTO public.subscription_plans (category, name, price) VALUES 
('lojista', 'Teste Gratuito Lojista', 0.00),
('prestador', 'Teste Gratuito Prestador', 0.00),
('fornecedor', 'Teste Gratuito Fornecedor', 0.00)
ON CONFLICT DO NOTHING;

-- 8. CRIAÇÃO MANUAL DO ADMINISTRADOR MASTER
-- Execute este bloco para garantir que o usuário exista com as credenciais corretas
DO $$
DECLARE
  _user_id UUID;
BEGIN
  -- 1. Inserir na auth.users se não existir
  -- NOTA: Se o erro "no unique or exclusion constraint" ocorrer na tabela auth.users,
  -- use o script de fallback abaixo que não depende de ON CONFLICT.
  BEGIN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 
      'jorgericardosalgado@gmail.com', crypt('!jR17052', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{"full_name":"Admin Master","role":"admin"}',
      now(), now()
    )
    RETURNING id INTO _user_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT id INTO _user_id FROM auth.users WHERE email = 'jorgericardosalgado@gmail.com';
  END;

  -- 2. Garantir que a senha está atualizada (forçar a senha !jR17052)
  UPDATE auth.users 
  SET encrypted_password = crypt('!jR17052', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_user_meta_data = raw_user_meta_data || '{"role":"admin"}'
  WHERE id = _user_id;

  -- 3. Inserir em user_roles e profiles manual (caso o trigger não tenha rodado)
  INSERT INTO public.user_roles (user_id, role) 
  VALUES (_user_id, 'admin') 
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (_user_id, 'Admin Master', 'admin')
  ON CONFLICT (id) DO UPDATE SET role = 'admin';

END $$;

-- 9. SCRIPT DE DIAGNÓSTICO
SELECT u.email, u.id, p.role as profile_role, r.role as role_table
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_roles r ON u.id = r.user_id
WHERE u.email = 'jorgericardosalgado@gmail.com';

