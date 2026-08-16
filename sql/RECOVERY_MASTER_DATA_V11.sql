-- FIXXER MASTER DATA RECOVERY V14
-- FORÇAR CRIAÇÃO DE USUÁRIOS NO AUTH E PERFIS

-- 1. Garantir que a coluna is_verified exista
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_verified') THEN
    ALTER TABLE public.profiles ADD COLUMN is_verified BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 2. Inserir usuários na tabela auth.users se não existirem
-- Nota: Isso requer privilégios de superuser ou rodar como service_role no editor SQL do Supabase.
-- Se falhar aqui, o usuário precisa ser criado via Interface do Supabase primeiro.
DO $$
BEGIN
    -- Master Admin
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '6ba65048-803f-44f6-88d2-24d04fee1a0f') THEN
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, is_super_admin)
        VALUES ('6ba65048-803f-44f6-88d2-24d04fee1a0f', '00000000-0000-0000-0000-000000000000', 'jorgericardosalgado@gmail.com', crypt('!jR06097', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Admin Master","role":"admin"}', 'authenticated', 'authenticated', now(), now(), '', '', '', false);
        
        INSERT INTO auth.identities (id, user_id, identity_data, provider, last_login_at, created_at, updated_at)
        VALUES (gen_random_uuid(), '6ba65048-803f-44f6-88d2-24d04fee1a0f', format('{"sub":"%s","email":"%s"}', '6ba65048-803f-44f6-88d2-24d04fee1a0f', 'jorgericardosalgado@gmail.com')::jsonb, 'email', now(), now(), now());
    END IF;

    -- Jorge Criare (Prestador)
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = 'b3378b88-5c46-4e50-9c2e-4b7264a4d6e9') THEN
        INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, is_super_admin)
        VALUES ('b3378b88-5c46-4e50-9c2e-4b7264a4d6e9', '00000000-0000-0000-0000-000000000000', 'jorgecriare2021@gmail.com', crypt('!jR06097', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Jorge Criare","role":"prestador"}', 'authenticated', 'authenticated', now(), now(), '', '', '', false);
        
        INSERT INTO auth.identities (id, user_id, identity_data, provider, last_login_at, created_at, updated_at)
        VALUES (gen_random_uuid(), 'b3378b88-5c46-4e50-9c2e-4b7264a4d6e9', format('{"sub":"%s","email":"%s"}', 'b3378b88-5c46-4e50-9c2e-4b7264a4d6e9', 'jorgecriare2021@gmail.com')::jsonb, 'email', now(), now(), now());
    END IF;
END $$;

-- 3. Agora inserir/atualizar na tabela public.profiles
INSERT INTO public.profiles (
    id, display_name, full_name, role, user_type, karma_score, city, state, is_verified, created_at
)
VALUES 
('6ba65048-803f-44f6-88d2-24d04fee1a0f', 'Admin Master', 'Admin Master FIXXER', 'admin', 'admin', 5.0, 'São Paulo', 'SP', true, now()),
('b3378b88-5c46-4e50-9c2e-4b7264a4d6e9', 'Jorge Criare', 'Jorge Criare', 'prestador', 'prestador', 4.8, 'São Paulo', 'SP', true, now())
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role,
    user_type = EXCLUDED.user_type,
    is_verified = true;

-- 4. Moedas e Roles
INSERT INTO public.user_coins (user_id, balance, updated_at)
VALUES ('b3378b88-5c46-4e50-9c2e-4b7264a4d6e9', 1500, now())
ON CONFLICT (user_id) DO UPDATE SET balance = 1500;

INSERT INTO public.user_roles (user_id, role)
VALUES ('6ba65048-803f-44f6-88d2-24d04fee1a0f', 'admin')
ON CONFLICT DO NOTHING;

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_coins TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;



