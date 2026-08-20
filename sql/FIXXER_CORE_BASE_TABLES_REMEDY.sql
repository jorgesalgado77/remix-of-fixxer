-- FIXXER CORE BASE TABLES REMEDY - V2
-- Criação das tabelas de especialização e sincronização final de dados do Master e Prestador

-- 1. Tabela Store Profiles
CREATE TABLE IF NOT EXISTS public.store_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    company_name text,
    social_name text,
    logo_url text,
    city text,
    state text,
    is_verified boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.store_profiles TO authenticated;
GRANT ALL ON public.store_profiles TO service_role;
ALTER TABLE public.store_profiles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_profiles' AND policyname = 'Users can manage their own store profile') THEN
        CREATE POLICY "Users can manage their own store profile" ON public.store_profiles
            FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_profiles' AND policyname = 'Public profiles are viewable by all authenticated') THEN
        CREATE POLICY "Public profiles are viewable by all authenticated" ON public.store_profiles
            FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- 2. Tabela Provider Profiles
CREATE TABLE IF NOT EXISTS public.provider_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    display_name text,
    avatar_url text,
    city text,
    state text,
    is_verified boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.provider_profiles TO authenticated;
GRANT ALL ON public.provider_profiles TO service_role;
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'provider_profiles' AND policyname = 'Users can manage their own provider profile') THEN
        CREATE POLICY "Users can manage their own provider profile" ON public.provider_profiles
            FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'provider_profiles' AND policyname = 'Public provider profiles are viewable') THEN
        CREATE POLICY "Public provider profiles are viewable" ON public.provider_profiles
            FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- 3. Tabela Supplier Profiles
CREATE TABLE IF NOT EXISTS public.supplier_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    company_name text,
    logo_url text,
    city text,
    state text,
    is_verified boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.supplier_profiles TO authenticated;
GRANT ALL ON public.supplier_profiles TO service_role;
ALTER TABLE public.supplier_profiles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplier_profiles' AND policyname = 'Users can manage their own supplier profile') THEN
        CREATE POLICY "Users can manage their own supplier profile" ON public.supplier_profiles
            FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplier_profiles' AND policyname = 'Public supplier profiles are viewable') THEN
        CREATE POLICY "Public supplier profiles are viewable" ON public.supplier_profiles
            FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- 4. SINCRONIZAÇÃO DE DADOS MESTRE
-- Jorge Salgado (Prestador)
INSERT INTO public.profiles (id, display_name, role, user_type, avatar_url, karma_score)
VALUES ('b3378b88-5c46-4e50-9c2e-4b7264a4d6e9', 'Jorge Salgado', 'prestador', 'prestador', 'https://fixxerhub.lovable.app/jorge-avatar.png', 4.9)
ON CONFLICT (id) DO UPDATE SET 
    display_name = EXCLUDED.display_name,
    role = 'prestador',
    user_type = 'prestador',
    karma_score = 4.9;

INSERT INTO public.provider_profiles (user_id, display_name, avatar_url, is_verified)
VALUES ('b3378b88-5c46-4e50-9c2e-4b7264a4d6e9', 'Jorge Salgado', 'https://fixxerhub.lovable.app/jorge-avatar.png', true)
ON CONFLICT (user_id) DO UPDATE SET 
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url,
    is_verified = true;

-- Admin Master
INSERT INTO public.profiles (id, display_name, role, user_type, is_official)
VALUES ('6ba65048-803f-44f6-88d2-24d04fee1a0f', 'Admin Master', 'admin', 'admin', true)
ON CONFLICT (id) DO UPDATE SET 
    display_name = EXCLUDED.display_name,
    role = 'admin',
    user_type = 'admin',
    is_official = true;

-- Garantir saldo de 3600 moedas para o Prestador Jorge
INSERT INTO public.coin_balances (user_id, balance)
VALUES ('b3378b88-5c46-4e50-9c2e-4b7264a4d6e9', 3600)
ON CONFLICT (user_id) DO UPDATE SET balance = 3600;

