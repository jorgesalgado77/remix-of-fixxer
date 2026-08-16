-- FIXXER MASTER DATA RECOVERY V11
-- CONSOLIDAÇÃO FINAL DE IDENTIDADE E SALDO

-- 1. Garantir existência do usuário Master na tabela profiles com dados reais
INSERT INTO public.profiles (
    id, 
    display_name, 
    full_name, 
    avatar_url, 
    role, 
    user_type, 
    karma_score, 
    plan_id, 
    city, 
    state,
    is_verified,
    created_at
)
VALUES (
    '6ba65048-803f-44f6-88d2-24d04fee1a0f', 
    'Admin Master', 
    'Admin Master FIXXER', 
    NULL, -- Admin não costuma ter avatar específico mas pode ser setado
    'admin', 
    'admin', 
    5.0, 
    'pro', 
    'São Paulo', 
    'SP',
    true,
    now()
)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    role = 'admin',
    user_type = 'admin',
    karma_score = 5.0,
    plan_id = 'pro',
    city = 'São Paulo',
    state = 'SP',
    is_verified = true;

-- 2. Garantir existência do usuário Prestador Teste (Jorge Criare)
INSERT INTO public.profiles (
    id, 
    display_name, 
    full_name, 
    avatar_url, 
    role, 
    user_type, 
    karma_score, 
    plan_id, 
    city, 
    state,
    is_verified,
    created_at
)
VALUES (
    'b3378b88-5c46-4e50-9c2e-4b7264a4d6e9', 
    'Jorge Criare', 
    'Jorge Criare', 
    'https://id-preview--a2e86b01-ac4b-4241-8403-babc7f152d85.lovable.app/lovable-uploads/67107775-7286-4fba-a98b-70014b533d32.png', 
    'prestador', 
    'prestador', 
    4.8, 
    'pro', 
    'São Paulo', 
    'SP',
    true,
    now()
)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url,
    karma_score = 4.8,
    plan_id = 'pro',
    city = 'São Paulo',
    state = 'SP',
    is_verified = true;

-- 3. Sincronizar saldo de moedas (Jorge Criare precisa de 1500 moedas para testes)
-- Usando a RPC segura se disponível, ou direto na tabela
DO $$
BEGIN
    INSERT INTO public.user_coins (user_id, balance, updated_at)
    VALUES ('b3378b88-5c46-4e50-9c2e-4b7264a4d6e9', 1500, now())
    ON CONFLICT (user_id) DO UPDATE SET 
        balance = 1500,
        updated_at = now();
END $$;

-- 4. Garantir Roles Administrativas
INSERT INTO public.user_roles (user_id, role)
VALUES ('6ba65048-803f-44f6-88d2-24d04fee1a0f', 'admin')
ON CONFLICT DO NOTHING;

-- 5. Grants de Segurança (Garantir que profiles e user_coins sejam legíveis)
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_coins TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- HINT: Execute este script no SQL Editor do seu Supabase Externo (rnhgpxembtgupxnrohxo).
