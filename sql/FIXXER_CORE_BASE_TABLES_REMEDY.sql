
-- ==============================================================================
-- FIXXER_CORE_BASE_TABLES_REMEDY.sql
-- OBJETIVO: Criar as tabelas base de especialização que estão faltando no 
-- Supabase Externo para evitar erros de FK e "relation does not exist".
-- ==============================================================================

-- 1. Tabela de Lojistas
CREATE TABLE IF NOT EXISTS public.store_profiles (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name text,
    social_name text,
    logo_url text,
    city text,
    state text,
    is_verified boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Tabela de Prestadores
CREATE TABLE IF NOT EXISTS public.provider_profiles (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name text,
    avatar_url text,
    city text,
    state text,
    is_verified boolean DEFAULT false,
    bio text,
    skills text[],
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. Tabela de Fornecedores/Parceiros
CREATE TABLE IF NOT EXISTS public.supplier_profiles (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name text,
    logo_url text,
    city text,
    state text,
    is_verified boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 4. Habilitar RLS e Permissões
ALTER TABLE public.store_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.store_profiles TO authenticated;
GRANT SELECT ON public.provider_profiles TO authenticated;
GRANT SELECT ON public.supplier_profiles TO authenticated;

-- Políticas Básicas (Leitura para autenticados)
CREATE POLICY "Public profiles are viewable by everyone" ON public.store_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public profiles are viewable by everyone" ON public.provider_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public profiles are viewable by everyone" ON public.supplier_profiles FOR SELECT TO authenticated USING (true);

-- 5. RE-EXECUTAR RECOVERY_MASTER_DATA_V29 (Agora com as tabelas criadas)
DO $$ 
DECLARE
    admin_id uuid;
    jorge_id uuid;
BEGIN
    SELECT id INTO admin_id FROM auth.users WHERE email = 'jorgericardosalgado@gmail.com';
    SELECT id INTO jorge_id FROM auth.users WHERE email = 'jorgecriare2021@gmail.com';

    IF jorge_id IS NOT NULL THEN
        -- Perfil Base
        INSERT INTO public.profiles (id, display_name, role, is_verified, email, avatar_url)
        VALUES (jorge_id, 'Jorge Salgado', 'prestador', true, 'jorgecriare2021@gmail.com', 'https://rnhgpxembtgupxnrohxo.supabase.co/storage/v1/object/public/avatars/jorge_salgado.jpg')
        ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, role = EXCLUDED.role, is_verified = EXCLUDED.is_verified;

        -- Especialização (ERRO ANTERIOR CORRIGIDO AQUI)
        INSERT INTO public.provider_profiles (user_id, display_name, is_verified, avatar_url)
        VALUES (jorge_id, 'Jorge Salgado', true, 'https://rnhgpxembtgupxnrohxo.supabase.co/storage/v1/object/public/avatars/jorge_salgado.jpg')
        ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name, is_verified = EXCLUDED.is_verified, avatar_url = EXCLUDED.avatar_url;
    END IF;

    IF admin_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, display_name, role, is_verified, email)
        VALUES (admin_id, 'Admin Master', 'admin', true, 'jorgericardosalgado@gmail.com')
        ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, role = EXCLUDED.role;
    END IF;
END $$;
