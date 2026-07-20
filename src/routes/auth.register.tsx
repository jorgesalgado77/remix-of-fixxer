import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Store, Hammer, Truck, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/register")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: (search.email as string) || "",
  }),
  component: RegisterComponent,
});

type Step = "role" | "details";
type Role = "lojista" | "prestador" | "fornecedor";

function RegisterComponent() {
  const { email: initialEmail } = Route.useSearch();
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState(initialEmail || "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRoleSelect = (selectedRole: Role) => {
    setRole(selectedRole);
    setStep("details");
  };

  const handleRegister = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!email || !password || !fullName || !role) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      console.log("Tentando cadastrar:", email, "Role:", role);
      
      // 1. Auth SignUp
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (authError) {
        console.error("Erro no auth.signUp:", authError);
        throw authError;
      }

      console.log("Auth registrado com sucesso:", authData.user?.id);

      // 2. Garantir Perfil (Caso o Trigger falhe ou atrase no banco externo)
      if (authData.user) {
        try {
          console.log("Criando/Verificando perfil manualmente...");
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: authData.user.id,
              full_name: fullName,
              role: role,
            });
          
          if (profileError) {
            console.warn("Aviso ao criar perfil manual (pode ser RLS ou Trigger):", profileError);
          }
        } catch (pErr) {
          console.error("Erro silencioso no perfil manual:", pErr);
        }
      }

      if (authData.user && authData.session) {
        toast.success("Cadastro realizado com sucesso!");
        navigate({ to: "/dashboard" });
      } else {
        toast.success("Cadastro realizado! Verifique seu e-mail para confirmar.");
        navigate({ to: "/auth" });
      }
    } catch (error: any) {
      console.error("Erro fatal no processo de cadastro:", error);
      toast.error(error.message || "Erro ao realizar cadastro. Verifique os logs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col px-6 py-12 max-w-lg mx-auto w-full bg-background min-h-screen">
      <div className="mb-8">
        <button 
          onClick={() => step === "role" ? navigate({ to: "/auth" }) : setStep("role")}
          className="p-2 -ml-2 text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      {step === "role" ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Como você quer usar o FIXXER?</h1>
            <p className="text-muted-foreground mt-2">Escolha seu perfil para continuar</p>
          </div>

          <div className="grid gap-4">
            <RoleCard 
              icon={<Store className="w-6 h-6 text-primary" />}
              title="Lojista"
              description="Gerencie sua marcenaria e projetos"
              onClick={() => handleRoleSelect("lojista")}
            />
            <RoleCard 
              icon={<Hammer className="w-6 h-6 text-primary" />}
              title="Prestador"
              description="Receba ordens de serviço e execute montagens"
              onClick={() => handleRoleSelect("prestador")}
            />
            <RoleCard 
              icon={<Truck className="w-6 h-6 text-primary" />}
              title="Parceiro Fornecedor"
              description="Ofereça serviços de vidraçaria, marmoraria e mais"
              onClick={() => handleRoleSelect("fornecedor")}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">ERRO AINDA AO FINALIZAR CADASTRO, NADA ACONTECE CORRIJA</h1>
            <p className="text-muted-foreground mt-2">Corrigindo fluxo de submissão e diagnóstico de conexão...</p>
          </div>

          <form 
            onSubmit={handleRegister}
            className="bg-card backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl space-y-5"
          >
            <InputField 
              label="Nome Completo" 
              placeholder="Seu nome" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            
            {role === "lojista" && (
              <>
                <InputField label="CNPJ / Razão Social" placeholder="00.000.000/0001-00" />
                <InputField label="Nome Comercial" placeholder="Minha Marcenaria" />
              </>
            )}
            
            <InputField 
              label="E-mail" 
              placeholder="seu@email.com" 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <InputField 
              label="Senha" 
              placeholder="••••••••" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl shadow-[0_0_15px_rgba(0,255,135,0.2)] active:scale-[0.98] hover:opacity-90 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Finalizar Cadastro
            </button>
          </form>
        </div>
      )}

      {/* Seção Informativa para Erros de Banco (SQL) */}
      <div className="mt-12 p-6 bg-red-500/10 border border-red-500/20 rounded-2xl animate-in fade-in duration-700">
        <h2 className="text-red-400 font-bold mb-2 flex items-center gap-2">
          <ChevronRight className="w-4 h-4" />
          Erro de Banco Externo? (500)
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Se o cadastro falhar com erro 500, o seu Supabase externo não conseguiu rodar o gatilho de criação de perfil. Copie o código abaixo e rode no **SQL Editor** do seu Supabase.
        </p>
        <div className="relative group">
          <pre className="text-[10px] bg-black/40 p-4 rounded-xl overflow-x-auto text-primary/70 border border-white/5 max-h-40">
            <code>{SQL_COMPLETE}</code>
          </pre>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(SQL_COMPLETE);
              toast.success("SQL copiado para o clipboard!");
            }}
            className="absolute top-2 right-2 bg-primary/20 hover:bg-primary/40 text-primary text-[10px] px-2 py-1 rounded border border-primary/20 transition-all opacity-0 group-hover:opacity-100"
          >
            Copiar SQL
          </button>
        </div>
      </div>
    </div>
  );
}

function RoleCard({ icon, title, description, onClick }: { icon: React.ReactNode, title: string, description: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full bg-card backdrop-blur-sm p-6 rounded-3xl border border-white/5 shadow-lg hover:border-primary/50 hover:shadow-primary/10 transition-all flex items-center gap-5 text-left active:scale-[0.98]"
    >
      <div className="bg-white/5 w-14 h-14 rounded-2xl flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-white">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground/30" />
    </button>
  );
}

function InputField({ 
  label, 
  placeholder, 
  type = "text", 
  value, 
  onChange, 
  required 
}: { 
  label: string, 
  placeholder: string, 
  type?: string, 
  value?: string, 
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void, 
  required?: boolean 
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-muted-foreground mb-2">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-4 py-3 rounded-xl bg-background border border-white/10 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground/30 text-white"
      />
    </div>
  );
}

const SQL_COMPLETE = `
-- 1. ENUMS (Garanta que a role 'admin' existe)
DO \$\$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'lojista', 'prestador', 'fornecedor');
EXCEPTION
    WHEN duplicate_object THEN null;
END \$\$;

-- 2. TABELA DE PLANOS (Dependência de Profiles)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category public.app_role NOT NULL,
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir Planos Padrão
INSERT INTO public.subscription_plans (category, name, price) VALUES 
('lojista', 'Grátis Lojista', 0.00),
('prestador', 'Grátis Prestador', 0.00),
('fornecedor', 'Grátis Fornecedor', 0.00)
ON CONFLICT DO NOTHING;

-- 3. TABELA DE PERFIS
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    role public.app_role NOT NULL DEFAULT 'lojista',
    plan_id UUID REFERENCES public.subscription_plans(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABELA DE ROLES (Extra segurança)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- 5. TRIGGER DE REGISTRO (CRÍTICO)
-- Remova o trigger antigo se existir para evitar conflitos
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS \$\$
DECLARE
    default_role public.app_role;
BEGIN
    -- Define a role baseada no email master ou metadados
    IF new.email = 'jorgericardosalgado@gmail.com' THEN
        default_role := 'admin';
    ELSE
        default_role := COALESCE((new.raw_user_meta_data->>'role')::public.app_role, 'lojista');
    END IF;

    -- Cria o perfil
    INSERT INTO public.profiles (id, full_name, role, plan_id)
    VALUES (
        new.id, 
        COALESCE(new.raw_user_meta_data->>'full_name', ''), 
        default_role,
        (SELECT id FROM public.subscription_plans WHERE category = default_role AND price = 0 LIMIT 1)
    )
    ON CONFLICT (id) DO UPDATE SET 
        role = EXCLUDED.role;
    
    -- Cria a user_role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, default_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RETURN NEW;
END;
\$\$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. PERMISSÕES RLS BÁSICAS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.subscription_plans TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.subscription_plans TO service_role;

-- POLÍTICAS
CREATE POLICY "Permitir leitura própria" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Permitir update próprio" ON public.profiles FOR UPDATE USING (auth.uid() = id);
`;
