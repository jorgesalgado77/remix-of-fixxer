-- SQL DE CONFIGURAÇÃO COMPLETA DO ECOSSISTEMA FIXXER
-- Versão: 2.0 (Schema, Categorias, Feed e Controle Master)

-- ==========================================================
-- 1. TIPOS E ENUMS
-- ==========================================================
DO $$ BEGIN
    CREATE TYPE public.user_role_type AS ENUM ('Admin', 'Lojista', 'Prestador', 'Parceiro', 'Cliente');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.price_type_enum AS ENUM ('Fixo', 'Comissao', 'A_Combinar');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.feed_post_status AS ENUM ('Ativo', 'Em_Execucao', 'Concluido', 'Cancelado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==========================================================
-- 2. TABELA DE CATEGORIAS DO SISTEMA
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.system_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_type TEXT NOT NULL, -- 'Moveis_Tecnico', 'Obra_Complementar', 'Fornecedores'
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(group_type, name)
);

GRANT SELECT ON public.system_categories TO anon, authenticated;
GRANT ALL ON public.system_categories TO service_role;

-- ==========================================================
-- 3. ATUALIZAÇÃO DA TABELA DE PERFIS (profiles)
-- ==========================================================
-- Adicionando campos à tabela existente ou criando se não existir
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    user_type TEXT DEFAULT 'Cliente',
    categories TEXT[] DEFAULT '{}',
    rating NUMERIC DEFAULT 5.0,
    total_reviews INT DEFAULT 0,
    city TEXT,
    state TEXT,
    portfolio_urls TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'Ativo',
    document_type TEXT,
    document_number TEXT,
    phone TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir que as colunas novas existam caso a tabela já existisse
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'Cliente';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 5.0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_reviews INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS portfolio_urls TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Ativo';

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ==========================================================
-- 4. TABELA DE FEED E PUBLICAÇÕES (feed_posts)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.feed_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    author_type TEXT NOT NULL, -- 'Lojista', 'Prestador', 'Parceiro', 'Cliente'
    feed_type TEXT NOT NULL, -- 'Demanda_OS', 'Vitrine_Prestador', 'Vitrine_Parceiro', 'Demanda_Cliente'
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    city TEXT,
    state TEXT,
    price_type TEXT DEFAULT 'A_Combinar',
    price_value NUMERIC,
    is_negotiable BOOLEAN DEFAULT true,
    deadline DATE,
    media_urls TEXT[] DEFAULT '{}',
    proposals_count INT DEFAULT 0,
    status TEXT DEFAULT 'Ativo',
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT ON public.feed_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.feed_posts TO authenticated;
GRANT ALL ON public.feed_posts TO service_role;

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

-- ==========================================================
-- 5. POLÍTICAS DE RLS - PRIVILÉGIO MASTER ADMIN
-- ==========================================================

-- Função auxiliar para verificar se é Admin Master
CREATE OR REPLACE FUNCTION public.is_admin_master()
RETURNS boolean AS $$
BEGIN
  RETURN (
    auth.jwt() ->> 'email' = 'jorgericardosalgado@gmail.com' OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND user_type = 'Admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas para Profiles
CREATE POLICY "Admin Master Full Access Profiles" ON public.profiles
    FOR ALL TO authenticated USING (public.is_admin_master());

CREATE POLICY "Users view all profiles" ON public.profiles
    FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Users update own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Políticas para Feed Posts
CREATE POLICY "Admin Master Full Access Feed" ON public.feed_posts
    FOR ALL TO authenticated USING (public.is_admin_master());

CREATE POLICY "Public view active feed posts" ON public.feed_posts
    FOR SELECT TO anon, authenticated USING (status = 'Ativo');

CREATE POLICY "Authors manage own posts" ON public.feed_posts
    FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Políticas para Categorias
CREATE POLICY "Admin manage categories" ON public.system_categories
    FOR ALL TO authenticated USING (public.is_admin_master());

-- ==========================================================
-- 6. DADOS INICIAIS (SEED)
-- ==========================================================
INSERT INTO public.system_categories (group_type, name) VALUES
('Moveis_Tecnico', 'Projetista Promob'),
('Moveis_Tecnico', 'Medidor/Conferente'),
('Moveis_Tecnico', 'Montador'),
('Obra_Complementar', 'Gesso & Drywall'),
('Obra_Complementar', 'Marmoraria'),
('Obra_Complementar', 'Eletricista'),
('Obra_Complementar', 'Pintura'),
('Obra_Complementar', 'Limpeza Pós-Obra')
ON CONFLICT DO NOTHING;

-- Garante que o Admin Master tenha o tipo correto no perfil se ele já existir
UPDATE public.profiles 
SET user_type = 'Admin' 
WHERE email = 'jorgericardosalgado@gmail.com';
