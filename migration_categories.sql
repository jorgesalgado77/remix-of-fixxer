-- Consolidação da Estrutura de Categorias e Ramos (v1.0.0)

-- 1. Garante que a tabela profiles tenha as colunas canônicas
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_subcategories text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS branch_filter_enabled boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_roles text; -- CSV formatado com ||

-- 2. Atualiza a view pública para expor as novas colunas necessárias para matching
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
    p.id, p.full_name, p.display_name, p.company_name, p.avatar_url, 
    p.logo_url, p.banner_url, p.role, p.user_type, p.business_category, 
    p.custom_branch, p.activity_branch, p.preferred_service, p.job_roles, p.city, p.state, 
    p.lat, p.lng, p.created_at, p.rating, p.is_online, p.neighborhood,
    p.preferred_subcategories
FROM public.profiles p
WHERE p.full_name IS NOT NULL;

GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;
GRANT ALL ON public.profiles_public TO service_role;

-- 3. Comentários para auditoria de schema
COMMENT ON COLUMN public.profiles.business_category IS 'ID ou Label da Macro Categoria (v1.0.0)';
COMMENT ON COLUMN public.profiles.activity_branch IS 'Ramo principal para exibição e badges (v1.0.0)';
COMMENT ON COLUMN public.profiles.custom_branch IS 'Ramo digitado livremente (prefixado com Outro:)';
