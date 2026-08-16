-- MIGRATION: RECOVERY_MASTER_DATA_V7 (FIX FK AUTH)
-- OBJETIVO: Criar os usuários no schema AUTH do Supabase Externo antes de criar os perfis.
-- Isso resolve o erro 23503 (violação de FK auth.users).
-- Executar no Console SQL do Supabase Externo: https://rnhgpxembtgupxnrohxo.supabase.co

-- 1. Criar os usuários no schema auth (se não existirem)
-- Nota: Senha padrão para estes usuários master/teste no auth interno será a fornecida pelo usuário.
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, 
  email_confirmed_at, recovery_sent_at, last_sign_in_at, 
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
  confirmation_token, email_change, email_change_token_new, recovery_token
)
VALUES 
  (
    '00000000-0000-0000-0000-000000000000', 
    '6ba65048-803f-44f6-88d2-24d04fee1a0f', 
    'authenticated', 
    'authenticated', 
    'jorgericardosalgado@gmail.com', 
    crypt('!jR06097', gen_salt('bf')), 
    now(), 
    now(), 
    now(), 
    '{"provider": "email", "providers": ["email"]}', 
    '{"display_name": "Admin Master", "full_name": "Admin Master", "role": "admin"}', 
    now(), 
    now(), 
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000', 
    'b3378b88-5c46-4e50-9c2e-4b7264a4d6e9', 
    'authenticated', 
    'authenticated', 
    'jorgecriare2021@gmail.com', 
    crypt('!jR06097', gen_salt('bf')), 
    now(), 
    now(), 
    now(), 
    '{"provider": "email", "providers": ["email"]}', 
    '{"display_name": "Prestador Teste", "full_name": "Prestador Teste", "role": "prestador"}', 
    now(), 
    now(), 
    '', '', '', ''
  )
ON CONFLICT (id) DO NOTHING;

-- 2. Garantir identidades no schema auth
INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES
  (
    '6ba65048-803f-44f6-88d2-24d04fee1a0f', 
    '6ba65048-803f-44f6-88d2-24d04fee1a0f', 
    format('{"sub": "6ba65048-803f-44f6-88d2-24d04fee1a0f", "email": "%s"}', 'jorgericardosalgado@gmail.com')::jsonb, 
    'email', 
    now(), now(), now()
  ),
  (
    'b3378b88-5c46-4e50-9c2e-4b7264a4d6e9', 
    'b3378b88-5c46-4e50-9c2e-4b7264a4d6e9', 
    format('{"sub": "b3378b88-5c46-4e50-9c2e-4b7264a4d6e9", "email": "%s"}', 'jorgecriare2021@gmail.com')::jsonb, 
    'email', 
    now(), now(), now()
  )
ON CONFLICT (provider, identity_data) DO NOTHING;

-- 3. Agora criar os perfis no schema PUBLIC (FK agora vai passar)
INSERT INTO public.profiles (id, display_name, email, role, user_type, business_category, updated_at)
VALUES 
  ('6ba65048-803f-44f6-88d2-24d04fee1a0f', 'Admin Master', 'jorgericardosalgado@gmail.com', 'admin', 'admin', 'admin', now()),
  ('b3378b88-5c46-4e50-9c2e-4b7264a4d6e9', 'Prestador Teste', 'jorgecriare2021@gmail.com', 'prestador', 'prestador', 'prestador', now())
ON CONFLICT (id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role,
  updated_at = now();

-- 4. Moedas e Roles
INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('6ba65048-803f-44f6-88d2-24d04fee1a0f', 'admin'),
  ('b3378b88-5c46-4e50-9c2e-4b7264a4d6e9', 'user')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_coins (user_id, balance, updated_at)
VALUES 
  ('6ba65048-803f-44f6-88d2-24d04fee1a0f', 999999, now()),
  ('b3378b88-5c46-4e50-9c2e-4b7264a4d6e9', 1000, now())
ON CONFLICT (user_id) DO UPDATE SET 
  balance = COALESCE(public.user_coins.balance, EXCLUDED.balance),
  updated_at = now();
