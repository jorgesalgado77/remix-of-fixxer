-- =====================================================================
-- FIXXER — Correção definitiva da tabela public.store_profiles
-- Objetivo: permitir salvar/atualizar o perfil do lojista mesmo quando o
-- login é feito via bypass local (sem sessão auth.users). Execute inteiro
-- no SQL Editor do Supabase Externo.
-- =====================================================================

-- 1) Cria a tabela caso não exista, com o shape que o front envia
CREATE TABLE IF NOT EXISTS public.store_profiles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid UNIQUE NOT NULL,
  user_email          text UNIQUE,
  company_name        text,
  social_name         text,
  cnpj                text,
  responsible_name    text,
  email_contact       text,
  whatsapp            text,
  phone               text,
  zipcode             text,
  address             text,
  neighborhood        text,
  city                text,
  state               text,
  address_number      text,
  address_complement  text,
  activity_branch     text,
  instagram           text,
  facebook            text,
  tiktok              text,
  site_url            text,
  logo_url            text,
  banner_url          text,
  gallery_urls        jsonb DEFAULT '[]'::jsonb,
  video_urls          jsonb DEFAULT '[]'::jsonb,
  documents           jsonb DEFAULT '[]'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- 2) Se a tabela já existia, garante colunas / uniqueness ausentes
ALTER TABLE public.store_profiles
  ADD COLUMN IF NOT EXISTS user_email          text,
  ADD COLUMN IF NOT EXISTS company_name        text,
  ADD COLUMN IF NOT EXISTS social_name         text,
  ADD COLUMN IF NOT EXISTS cnpj                text,
  ADD COLUMN IF NOT EXISTS responsible_name    text,
  ADD COLUMN IF NOT EXISTS email_contact       text,
  ADD COLUMN IF NOT EXISTS whatsapp            text,
  ADD COLUMN IF NOT EXISTS phone               text,
  ADD COLUMN IF NOT EXISTS zipcode             text,
  ADD COLUMN IF NOT EXISTS address             text,
  ADD COLUMN IF NOT EXISTS neighborhood        text,
  ADD COLUMN IF NOT EXISTS city                text,
  ADD COLUMN IF NOT EXISTS state               text,
  ADD COLUMN IF NOT EXISTS address_number      text,
  ADD COLUMN IF NOT EXISTS address_complement  text,
  ADD COLUMN IF NOT EXISTS activity_branch     text,
  ADD COLUMN IF NOT EXISTS instagram           text,
  ADD COLUMN IF NOT EXISTS facebook            text,
  ADD COLUMN IF NOT EXISTS tiktok              text,
  ADD COLUMN IF NOT EXISTS site_url            text,
  ADD COLUMN IF NOT EXISTS logo_url            text,
  ADD COLUMN IF NOT EXISTS banner_url          text,
  ADD COLUMN IF NOT EXISTS gallery_urls        jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS video_urls          jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS documents           jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at          timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at          timestamptz NOT NULL DEFAULT now();

-- Remove FK antiga para auth.users em user_id (se existir), pois o login
-- por bypass usa UUID determinístico gerado no cliente.
DO $$
DECLARE fk_name text;
BEGIN
  SELECT constraint_name INTO fk_name
    FROM information_schema.table_constraints
   WHERE table_schema = 'public'
     AND table_name   = 'store_profiles'
     AND constraint_type = 'FOREIGN KEY'
     AND constraint_name LIKE '%user_id%';
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.store_profiles DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

-- Garante uniqueness em user_id e user_email (necessário para upsert onConflict)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'store_profiles_user_id_key'
  ) THEN
    ALTER TABLE public.store_profiles ADD CONSTRAINT store_profiles_user_id_key UNIQUE (user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'store_profiles_user_email_key'
  ) THEN
    ALTER TABLE public.store_profiles ADD CONSTRAINT store_profiles_user_email_key UNIQUE (user_email);
  END IF;
END $$;

-- 3) GRANTs obrigatórios para o Data API (PostgREST)
GRANT SELECT ON public.store_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_profiles TO authenticated;
GRANT ALL ON public.store_profiles TO service_role;

-- Sequences/uuid: usam gen_random_uuid(), não precisam de grants extras.

-- 4) Habilita RLS
ALTER TABLE public.store_profiles ENABLE ROW LEVEL SECURITY;

-- 5) Policies — modo construção (permissivas, controlado pelo app)
DROP POLICY IF EXISTS "Público lê perfis"            ON public.store_profiles;
DROP POLICY IF EXISTS "Qualquer um insere perfil"    ON public.store_profiles;
DROP POLICY IF EXISTS "Qualquer um atualiza perfil"  ON public.store_profiles;
DROP POLICY IF EXISTS "Dono deleta perfil"           ON public.store_profiles;

CREATE POLICY "Público lê perfis"
  ON public.store_profiles FOR SELECT
  USING (true);

CREATE POLICY "Qualquer um insere perfil"
  ON public.store_profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Qualquer um atualiza perfil"
  ON public.store_profiles FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Dono deleta perfil"
  ON public.store_profiles FOR DELETE
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- 6) Trigger para manter updated_at
CREATE OR REPLACE FUNCTION public.store_profiles_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_store_profiles_updated_at ON public.store_profiles;
CREATE TRIGGER trg_store_profiles_updated_at
BEFORE UPDATE ON public.store_profiles
FOR EACH ROW EXECUTE FUNCTION public.store_profiles_touch_updated_at();

-- =====================================================================
-- Pronto. Após rodar, tente novamente "SALVAR TODAS AS ALTERAÇÕES".
-- Se ainda falhar, abra o console do navegador e envie o texto da linha
-- que começa com "[store_profiles.upsert] erro:".
-- =====================================================================
