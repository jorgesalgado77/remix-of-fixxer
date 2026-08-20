-- ==========================================================
-- RECOVERY V28: ADICIONAR COLUNA EMAIL E SINCRONIZAÇÃO
-- Alvo: Supabase Externo (rnhgpxembtgupxnrohxo)
-- ==========================================================

-- 1. Adicionar coluna email na tabela profiles se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;
END $$;

-- 2. Sincronizar emails existentes da auth.users para public.profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 3. Garantir que novos perfis herdem o email automaticamente via trigger
CREATE OR REPLACE FUNCTION public.handle_new_profile_email()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles
    SET email = NEW.email
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger no auth.users para novos cadastros (após o perfil ser criado)
DROP TRIGGER IF EXISTS on_auth_user_created_sync_email ON auth.users;
CREATE TRIGGER on_auth_user_created_sync_email
    AFTER INSERT OR UPDATE OF email ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_email();

-- 4. Sincronizar Jorge Salgado e Admin Master especificamente
DO $$
DECLARE
    jorge_id UUID;
    admin_id UUID;
BEGIN
    SELECT id INTO jorge_id FROM auth.users WHERE email = 'jorgecriare2021@gmail.com' LIMIT 1;
    SELECT id INTO admin_id FROM auth.users WHERE email = 'jorgericardosalgado@gmail.com' LIMIT 1;

    IF jorge_id IS NOT NULL THEN
        UPDATE public.profiles SET email = 'jorgecriare2021@gmail.com' WHERE id = jorge_id;
    END IF;

    IF admin_id IS NOT NULL THEN
        UPDATE public.profiles SET email = 'jorgericardosalgado@gmail.com' WHERE id = admin_id;
    END IF;
END $$;
