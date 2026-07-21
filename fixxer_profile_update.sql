-- Tabela para perfis de lojistas com campos detalhados
CREATE TABLE IF NOT EXISTS public.profiles_lojista (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome_fantasia TEXT,
    razao_social TEXT,
    cnpj TEXT,
    nome_responsavel TEXT,
    email_contato TEXT,
    whatsapp TEXT,
    cep TEXT,
    logradouro TEXT,
    bairro TEXT,
    cidade TEXT,
    estado TEXT,
    numero TEXT,
    complemento TEXT,
    logo_url TEXT,
    banner_url TEXT,
    galeria_urls TEXT[], -- Array de strings para URLs de imagens
    videos_urls TEXT[],  -- Array de strings para URLs de vídeos (máx 3)
    reputacao DECIMAL DEFAULT 5.0,
    plano_ativo TEXT DEFAULT 'Plano Gratuito',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.profiles_lojista ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Lojistas podem ver seu próprio perfil" ON public.profiles_lojista
    FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Lojistas podem atualizar seu próprio perfil" ON public.profiles_lojista
    FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Lojistas podem inserir seu próprio perfil" ON public.profiles_lojista
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.profiles_lojista TO authenticated;
GRANT ALL ON public.profiles_lojista TO service_role;

-- Adicionar colunas de redes sociais na tabela de lojista
ALTER TABLE public.profiles_lojista 
ADD COLUMN IF NOT EXISTS instagram TEXT,
ADD COLUMN IF NOT EXISTS facebook TEXT,
ADD COLUMN IF NOT EXISTS tiktok TEXT,
ADD COLUMN IF NOT EXISTS site_oficial TEXT;
