-- FIXXER RLS FINAL SYNC - PROMPT 25
-- Garante permissões de INSERT/UPDATE para perfis de todos os tipos e Admin Master

-- 1. Permissões em PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Permitir que qualquer usuário autenticado crie/atualize seu próprio perfil base
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can manage their own base profile') THEN
        CREATE POLICY "Users can manage their own base profile" ON public.profiles
            FOR ALL TO authenticated 
            USING (auth.uid() = id) 
            WITH CHECK (auth.uid() = id);
    END IF;

    -- Admin Master pode gerenciar todos (redundância de segurança)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admin Master manages all profiles') THEN
        CREATE POLICY "Admin Master manages all profiles" ON public.profiles
            FOR ALL TO authenticated
            USING (auth.jwt() ->> 'email' = 'jorgericardosalgado@gmail.com');
    END IF;
END $$;

-- 2. Permissões em PROVIDER_PROFILES
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Prestadores, Clientes, Lojistas etc podem criar seus perfis especializados
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'provider_profiles' AND policyname = 'Users can manage their specialized provider profile') THEN
        CREATE POLICY "Users can manage their specialized provider profile" ON public.provider_profiles
            FOR ALL TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- 3. Proteção de campos sensíveis (is_official, is_verified)
-- Nota: RLS não bloqueia colunas específicas em UPDATE, mas podemos usar triggers ou RPCs para auditoria.
-- A sincronização do App (Prompt 25) não deve tentar enviar esses campos.

GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.provider_profiles TO service_role;
GRANT ALL ON public.store_profiles TO service_role;
GRANT ALL ON public.supplier_profiles TO service_role;
