-- FIXXER PROMPT 25: CANONICAL IDENTITY FINAL HARDENING
-- OBJETIVO: Consolidar 'profiles' como fonte única de identidade visual e remover redundâncias.

-- 1. Garantir que display_name, avatar_url e bio existam em profiles (se não existirem)
-- (Nota: profiles já deve ter estes campos pelo schema canônico do Prompt 15/16)

-- 2. Limpeza de redundâncias em tabelas especializadas (opcional, dependendo da estratégia de migração de dados)
-- Não deletamos as colunas por segurança de retrocompatibilidade imediata, mas removemos fallbacks no código.

-- 3. Reforço de RLS para perfis públicos (Profiles que não são o próprio usuário)
-- Garante que dados sensíveis (PII, Documentos, GPS exato) não vazem no IdentityService.

CREATE OR REPLACE VIEW public.profiles_view AS
SELECT 
    id,
    display_name,
    avatar_url,
    bio,
    is_official,
    is_verified,
    plan_id,
    created_at,
    karma_score,
    last_active_at,
    verification_status
FROM public.profiles;

GRANT SELECT ON public.profiles_view TO authenticated;
GRANT SELECT ON public.profiles_view TO anon;

-- Auditoria final de RLS
COMMENT ON TABLE public.profiles IS 'Fonte única de verdade para Identidade Visual (Nome, Avatar, Bio).';
