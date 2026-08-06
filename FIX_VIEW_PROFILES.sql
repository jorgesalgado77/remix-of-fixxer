-- 1. REMOVE A VIEW EXISTENTE E TODAS AS DEPENDÊNCIAS (FORÇADO)
-- Execute estas linhas separadamente se o script completo falhar
DROP VIEW IF EXISTS public.profiles_public CASCADE;

-- 2. CRIA A VIEW NOVAMENTE COM A ESTRUTURA COMPLETA
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
    lat, 
    lng, 
    activity_branch,
    created_at
FROM public.profiles;

-- 3. REAPLICA AS PERMISSÕES DE ACESSO
GRANT SELECT ON public.profiles_public TO anon, authenticated;
GRANT ALL ON public.profiles_public TO service_role;
