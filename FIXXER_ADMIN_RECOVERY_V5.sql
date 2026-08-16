-- FIXXER_ADMIN_RECOVERY_V5.sql
-- Força a ativação dos perfis dos usuários master/teste no Supabase Externo

-- 1. Garante que os perfis existam
INSERT INTO public.profiles (id, display_name, email, role, user_type, status)
VALUES 
  ('6ba65048-803f-44f6-88d2-24d04fee1a0f', 'Admin Master', 'jorgericardosalgado@gmail.com', 'admin', 'admin', 'active'),
  ('b3378b88-5c46-4e50-9c2e-4b7264a4d6e9', 'Prestador Teste', 'jorgecriare2021@gmail.com', 'prestador', 'prestador', 'active')
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role,
  user_type = EXCLUDED.user_type,
  status = 'active';

-- 2. Garante a role de admin no sistema de roles
INSERT INTO public.user_roles (user_id, role)
VALUES ('6ba65048-803f-44f6-88d2-24d04fee1a0f', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Garante acesso via RLS (Scripts master costumam precisar disso)
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- 4. Audit Log
INSERT INTO public.system_logs (type, message, payload)
VALUES ('admin_recovery', 'Recuperação V5 executada para jorgericardosalgado@gmail.com', '{"version": 5}');
