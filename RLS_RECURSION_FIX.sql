-- FIXXER EMERGENCY INFRASTRUCTURE REPAIR (V8)
-- Objetivo: Resolver a recursão infinita no RLS da tabela user_roles

-- 1. Remover políticas recursivas existentes
DROP POLICY IF EXISTS "Admins can select all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.user_roles;

-- 2. Criar função de segurança definer para evitar recursão
-- Esta função ignora as políticas de RLS ao ser executada.
CREATE OR REPLACE FUNCTION public.has_role_v2(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    from public.user_roles
    where user_id = _user_id
      AND role = _role
  )
$$;

-- 3. Habilitar RLS e aplicar novas políticas NÃO recursivas
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Política simples: Usuários autenticados podem ver seus próprios papéis
-- SEM chamar funções que consultam a própria tabela.
CREATE POLICY "user_roles_self_select"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Política para Admins: Admins podem ver tudo (usando a função security definer)
CREATE POLICY "user_roles_admin_select"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role_v2(auth.uid(), 'admin'));

-- Política para Service Role (Bypass total)
CREATE POLICY "service_role_all"
ON public.user_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Garantir privilégios
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- 5. Auditoria de integridade para o Admin Master
INSERT INTO public.profiles (id, email, display_name, role, status)
VALUES ('6ba65048-803f-44f6-88d2-24d04fee1a0f', 'jorgericardosalgado@gmail.com', 'Admin Master', 'admin', 'active')
ON CONFLICT (id) DO UPDATE SET role = 'admin', status = 'active';

INSERT INTO public.user_roles (user_id, role)
VALUES ('6ba65048-803f-44f6-88d2-24d04fee1a0f', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Log de reparo
INSERT INTO public.info_admin_audit_logs (admin_id, action, details)
VALUES ('6ba65048-803f-44f6-88d2-24d04fee1a0f', 'RLS_REPAIR', '{"status": "success", "message": "Infinite recursion in user_roles policy resolved"}');
