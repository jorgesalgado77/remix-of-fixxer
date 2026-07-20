-- SCHEMA COMPLETO PARA O WEBAPP FIXXER (SUPABASE EXTERNO)
-- COPIE E COLE NO EDITOR SQL DO SEU PROJETO SUPABASE

-- 1. LIMPEZA (OPCIONAL - CUIDADO: APAGA DADOS EXISTENTES)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS public.handle_new_user();
-- DROP TABLE IF EXISTS public.user_roles;
-- DROP TABLE IF EXISTS public.profiles;
-- DROP TYPE IF EXISTS public.app_role;

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'lojista', 'prestador', 'fornecedor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABELA DE PERFIS
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    role public.app_role NOT NULL DEFAULT 'lojista',
    company_name TEXT,
    cnpj_cpf TEXT,
    specialty TEXT,
    portfolio_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABELA DE ROLES (PARA CONTROLE DE ACESSO)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- 5. FUNÇÃO PARA VERIFICAR ROLE (SECURITY DEFINER PARA BYPASS RLS)
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
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 7. PERMISSÕES (GRANTS)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- 8. POLÍTICAS DE ACESSO
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

-- 9. TRIGGER DE AUTOMAÇÃO (CRIA PERFIL AO REGISTRAR)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role public.app_role;
BEGIN
    -- Captura a role dos metadados (enviada no cadastro) ou assume 'lojista'
    default_role := COALESCE((new.raw_user_meta_data->>'role')::public.app_role, 'lojista');

    -- Se o email for o master definido, força admin
    IF new.email = 'jorgericardosalgado@gmail.com' THEN
        default_role := 'admin';
    END IF;

    INSERT INTO public.profiles (id, full_name, role)
    VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', ''), default_role);
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, default_role);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RE-CRIA O TRIGGER
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 10. NOTA IMPORTANTE:
-- APÓS RODAR ESTE SCRIPT, CASO O USUÁRIO MASTER JÁ ESTEJA CADASTRADO NO AUTH,
-- VOCÊ PODE FORÇAR A ROLE DELE MANUALMENTE RODANDO:
-- UPDATE public.profiles SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'jorgericardosalgado@gmail.com');
-- INSERT INTO public.user_roles (user_id, role) VALUES ((SELECT id FROM auth.users WHERE email = 'jorgericardosalgado@gmail.com'), 'admin') ON CONFLICT DO NOTHING;
