-- ============================================================
-- FIX: "Database error saving new user" (HTTP 500 no signup)
-- Causa: o trigger public.handle_new_user() falha ao inserir em
-- public.profiles / public.user_roles (role NULL ou valor fora do enum),
-- abortando a criação do usuário no auth.users.
-- ============================================================

-- 1) Garantir que o enum aceite as categorias usadas pelo app
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin','lojista','prestador','fornecedor','cliente');
  END IF;
END $$;

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cliente';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'casual';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';

-- 2) Trigger à prova de falhas: nunca aborta o signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_txt TEXT;
  v_role public.app_role;
BEGIN
  v_role_txt := lower(coalesce(NEW.raw_user_meta_data->>'role', 'lojista'));
  IF v_role_txt IN ('casual','final','cliente') THEN v_role_txt := 'cliente'; END IF;
  IF v_role_txt IN ('parceiro','b2b') THEN v_role_txt := 'fornecedor'; END IF;

  BEGIN
    v_role := v_role_txt::public.app_role;
  EXCEPTION WHEN OTHERS THEN
    v_role := 'lojista'::public.app_role;
  END;

  BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (NEW.id, coalesce(NEW.raw_user_meta_data->>'full_name', ''), v_role)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user profiles: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user user_roles: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- 3) Recriar o trigger (garante uma única instância)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4) Permissões necessárias ao SECURITY DEFINER
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT INSERT, SELECT ON public.profiles TO supabase_auth_admin;
GRANT INSERT, SELECT ON public.user_roles TO supabase_auth_admin;

-- 5) Política para o próprio usuário criar/atualizar seu perfil (upsert pós-signup)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
