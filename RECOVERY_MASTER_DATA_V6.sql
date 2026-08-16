-- MIGRATION: RECOVERY_MASTER_DATA_V6
-- OBJETIVO: Garantir que os perfis Master/Test e suas tabelas financeiras existam no Supabase Externo.
-- Executar no Console SQL do Supabase (https://rnhgpxembtgupxnrohxo.supabase.co)

-- 1. Garantir que os UIDs Master existam em profiles
INSERT INTO public.profiles (id, display_name, email, role, user_type, business_category, updated_at)
VALUES 
  ('6ba65048-803f-44f6-88d2-24d04fee1a0f', 'Admin Master', 'jorgericardosalgado@gmail.com', 'admin', 'admin', 'admin', now()),
  ('b3378b88-5c46-4e50-9c2e-4b7264a4d6e9', 'Prestador Teste', 'jorgecriare2021@gmail.com', 'prestador', 'prestador', 'prestador', now())
ON CONFLICT (id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role,
  updated_at = now();

-- 2. Garantir que possuam a role admin/prestador na tabela user_roles
INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('6ba65048-803f-44f6-88d2-24d04fee1a0f', 'admin'),
  ('b3378b88-5c46-4e50-9c2e-4b7264a4d6e9', 'user')
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Garantir a existência de saldo inicial na user_coins
INSERT INTO public.user_coins (user_id, balance, updated_at)
VALUES 
  ('6ba65048-803f-44f6-88d2-24d04fee1a0f', 999999, now()),
  ('b3378b88-5c46-4e50-9c2e-4b7264a4d6e9', 1000, now())
ON CONFLICT (user_id) DO UPDATE SET 
  balance = COALESCE(public.user_coins.balance, EXCLUDED.balance),
  updated_at = now();

-- 4. Criar transação inicial de auditoria
INSERT INTO public.coin_transactions (user_id, type, source, amount, description, created_at)
VALUES 
  ('6ba65048-803f-44f6-88d2-24d04fee1a0f', 'credit', 'admin_adjust', 999999, 'Saldo Inicial Master', now()),
  ('b3378b88-5c46-4e50-9c2e-4b7264a4d6e9', 'credit', 'bonus', 1000, 'Saldo Inicial Teste', now());

-- 5. Conceder permissões caso não existam (necessário após cada criação de tabela em novos projetos)
GRANT SELECT, INSERT, UPDATE ON public.user_coins TO authenticated;
GRANT SELECT, INSERT ON public.coin_transactions TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
