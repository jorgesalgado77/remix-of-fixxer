-- 1. ADICIONA AS COLUNAS DE ENDEREÇO NA TABELA PROFILES (SE NÃO EXISTIREM)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cep TEXT;

-- 2. REMOVE A VIEW EXISTENTE E TODAS AS DEPENDÊNCIAS
DROP VIEW IF EXISTS public.profiles_public CASCADE;

-- 3. CRIA A VIEW NOVAMENTE COM A ESTRUTURA COMPLETA (INCLUINDO ENDEREÇO)
CREATE VIEW public.profiles_public AS
SELECT 
    id, 
    full_name, 
    display_name, 
    company_name, 
    avatar_url, 
    logo_url, 
    role, 
    business_category, 
    custom_branch, 
    preferred_service,
    city, 
    state, 
    street,
    neighborhood,
    number,
    cep,
    lat, 
    lng, 
    activity_branch,
    created_at
FROM public.profiles;

-- 4. REAPLICA AS PERMISSÕES DE ACESSO
GRANT SELECT ON public.profiles_public TO anon, authenticated;
GRANT ALL ON public.profiles_public TO service_role;
