import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Store, Hammer, Truck, ArrowLeft, CheckCircle2, Loader2, Eye, EyeOff, ShieldCheck, Copy, User } from "lucide-react";
import { useState, useEffect } from "react";
import { supabaseExternal as supabase } from "@/lib/supabaseExternal";
import { supabaseExternal } from "@/lib/supabaseExternal";
import { toast } from "sonner";
import { attachReferralAfterSignup, getStoredReferralCode } from "@/lib/affiliates";


export const Route = createFileRoute("/cadastro")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: (search.email as string) || "",
  }),
  component: RegisterComponent,
});

type Step = "role" | "details";
type Role = "casual" | "lojista" | "prestador" | "fornecedor";

function RegisterComponent() {
  const { email: initialEmail } = Route.useSearch();
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState(initialEmail || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [cellphone, setCellphone] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const generateStrongPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
    let newPassword = "";
    // Garantir requisitos
    newPassword += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
    newPassword += "!@#$%^&*()_+"[Math.floor(Math.random() * 12)];
    for (let i = 0; i < 10; i++) {
      newPassword += chars[Math.floor(Math.random() * chars.length)];
    }
    setPassword(newPassword);
    setConfirmPassword(newPassword);
    toast.info("Senha forte gerada!");
  };

  const copyPassword = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    toast.success("Senha copiada!");
  };

  const validatePassword = (pass: string) => {
    const hasMinLength = pass.length >= 8;
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    const hasUpper = /[A-Z]/.test(pass);
    return { hasMinLength, hasSpecial, hasUpper };
  };

  const { hasMinLength, hasSpecial, hasUpper } = validatePassword(password);
  const isPasswordValid = hasMinLength && hasSpecial && hasUpper;
  const doPasswordsMatch = password === confirmPassword && password !== "";

  const handleRoleSelect = (selectedRole: Role) => {
    setRole(selectedRole);
    setStep("details");
  };

  const handleRegister = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    
    if (!email || !password || !fullName || !role) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!isPasswordValid) {
      toast.error("A senha não atende aos requisitos mínimos");
      return;
    }

    if (!doPasswordsMatch) {
      toast.error("As senhas não coincidem");
      return;
    }

    setLoading(true);
    try {
      console.log("handleRegister disparado com sucesso!");
      console.log("Iniciando processo de cadastro:", email, "Role:", role);
      
      // 1. Verificar conexão com Supabase (Pode ser o gargalo inicial)
      try {
        const { error: healthError } = await supabase.from('profiles').select('count', { count: 'exact', head: true }).limit(1);
        if (healthError && healthError.code !== 'PGRST116') {
           console.warn("Aviso de conexão Supabase:", healthError.message);
        }
      } catch (e) {
        console.error("Erro ao testar conexão:", e);
      }

      // 2. Auth SignUp - Aumentar tempo de resposta se necessário ou logs
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            full_name: fullName,
            role: role === "casual" ? "cliente" : role,
          },
        },
      });

      if (authError) {
        console.error("Erro no auth.signUp:", authError);
        const raw =
          (authError as any)?.message ||
          (authError as any)?.error_description ||
          (authError as any)?.msg ||
          "";
        const low = String(raw).toLowerCase();
        let friendly = raw || "Não foi possível concluir o cadastro. Tente novamente.";
        if (low.includes("already registered") || low.includes("user already"))
          friendly = "Este e-mail já está cadastrado. Faça login ou recupere sua senha.";
        else if (low.includes("database error"))
          friendly = "Falha ao criar o perfil no banco de dados. Avise o suporte (erro no gatilho de cadastro).";
        else if (low.includes("password"))
          friendly = "Senha inválida: use no mínimo 8 caracteres, 1 maiúscula e 1 especial.";
        else if (low.includes("invalid") && low.includes("email"))
          friendly = "E-mail inválido. Verifique e tente novamente.";
        else if (low.includes("rate limit") || low.includes("too many"))
          friendly = "Muitas tentativas. Aguarde alguns instantes e tente novamente.";
        toast.error(friendly);
        return;
      }


      console.log("Auth OK. ID:", authData.user?.id);

      // 3. Verificação de sessão
      if (authData.user) {
        // Persistir dados de contato coletados no cadastro (só é possível com sessão ativa)
        const contactPayload: any = {
          id: authData.user.id,
          full_name: fullName,
          role: role === "casual" ? "cliente" : role,
          cnpj_cpf: (role === "lojista" ? cnpj : cpf) || null,
          phone: phone || null,
          whatsapp: cellphone || null,
          contact_email: email || null,
        };
        if (authData.session) {
          try { await supabaseExternal.from('profiles').upsert(contactPayload, { onConflict: 'id' }); } catch (pe) { console.warn("upsert perfil:", pe); }
        }

        // Attach referral (se veio de link /r/:code)
        try {
          const refResult = await attachReferralAfterSignup(authData.user.id);
          if (refResult.attached) {
            toast.success("Indicação registrada! Bem-vindo(a) ao FIXXER.");
          }
        } catch (refErr) {
          console.warn("Erro ao anexar referral:", refErr);
        }

        try { window.dispatchEvent(new Event('fixxer:identity-change')); } catch {}

        if (!authData.session) {
          // Confirmação de e-mail ativada: usuário ainda não está logado.
          toast.success("Cadastro criado! Confirme seu e-mail para acessar sua conta.");
          setTimeout(() => { window.location.href = "/auth"; }, 1200);
          return;
        }

        toast.success("Cadastro realizado!");
        setTimeout(() => {
          // Cada categoria tem sua própria rota de painel (não existe /dashboard/:categoria)
          const dashboardByRole: Record<string, string> = {
            casual: "/cliente",
            cliente: "/cliente",
            lojista: "/lojista",
            prestador: "/prestador",
            fornecedor: "/parceiro",
          };
          window.location.href = dashboardByRole[role as string] ?? "/dashboard";
        }, 800);

      }


    } catch (error: any) {
      console.error("Erro inesperado no cadastro:", error);
      toast.error("Ocorreu um erro inesperado. Tente novamente.");
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
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Crie sua conta</h1>
            <p className="text-muted-foreground mt-2">Escolha seu perfil para continuar</p>
          </div>

          <div className="grid gap-4">
            <RoleCard 
              icon={<User className="w-6 h-6 text-primary" />}
              title="Casual (Cliente Final)"
              description="Pesquise por lojas e prestadores de serviços para suas necessidades"
              onClick={() => handleRoleSelect("casual")}
            />
            <RoleCard 
              icon={<Store className="w-6 h-6 text-primary" />}
              title="Lojista"
              description="Procure por prestadores de serviço e parceiros fornecedores"
              onClick={() => handleRoleSelect("lojista")}
            />
            <RoleCard 
              icon={<Hammer className="w-6 h-6 text-primary" />}
              title="Prestador"
              description="Veja todas as propostas enviadas por lojistas e clientes finais"
              onClick={() => handleRoleSelect("prestador")}
            />
            <RoleCard 
              icon={<Truck className="w-6 h-6 text-primary" />}
              title="Parceiro Fornecedor"
              description="Ofereça diretamente aos lojistas e clientes finais seus produtos e serviços"
              onClick={() => handleRoleSelect("fornecedor")}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Complete seu perfil</h1>
            <p className="text-muted-foreground mt-2">Informe seus dados para finalizar o cadastro</p>
          </div>

          <div 
            id="register-form-container"
            className="bg-card backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl space-y-5"
          >
            <InputField 
              label="Nome Completo" 
              placeholder="Seu nome" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            
            {role === "lojista" ? (
              <>
                <MaskedInputField 
                  mask="99.999.999/9999-99"
                  label="CNPJ / Razão Social" 
                  placeholder="00.000.000/0001-00" 
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                />
                <InputField label="Nome Comercial" placeholder="Minha Marcenaria" />
              </>
            ) : (
              <CpfCnpjField
                value={cpf}
                onChange={setCpf}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <MaskedInputField 
                mask="(99) 9999-9999"
                label="Telefone" 
                placeholder="(00) 0000-0000" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <MaskedInputField 
                mask="(99) 99999-9999"
                label="WhatsApp" 
                placeholder="(00) 00000-0000" 
                value={cellphone}
                onChange={(e) => setCellphone(e.target.value)}
              />

            </div>
            
            <InputField 
              label="E-mail" 
              placeholder="seu@email.com" 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="space-y-4">
              <div className="relative">
                <InputField 
                  label="Senha" 
                  placeholder="••••••••" 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="absolute right-3 top-[38px] flex gap-2">
                  <button
                    type="button"
                    onClick={copyPassword}
                    className="text-muted-foreground hover:text-white transition-colors"
                    title="Copiar senha"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={generateStrongPassword}
                  className="text-[10px] flex items-center gap-1 bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 rounded-md border border-primary/20 transition-all"
                >
                  <ShieldCheck className="w-3 h-3" />
                  Gerar Senha Forte
                </button>
              </div>

              <InputField 
                label="Confirmar Senha" 
                placeholder="••••••••" 
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <div className="grid grid-cols-3 gap-2 text-[10px] mt-2">
                <div className={`flex items-center gap-1 ${hasMinLength ? 'text-primary' : 'text-muted-foreground'}`}>
                  <div className={`w-1 h-1 rounded-full ${hasMinLength ? 'bg-primary' : 'bg-muted-foreground'}`} />
                  8+ chars
                </div>
                <div className={`flex items-center gap-1 ${hasUpper ? 'text-primary' : 'text-muted-foreground'}`}>
                  <div className={`w-1 h-1 rounded-full ${hasUpper ? 'bg-primary' : 'bg-muted-foreground'}`} />
                  1 Maiúscula
                </div>
                <div className={`flex items-center gap-1 ${hasSpecial ? 'text-primary' : 'text-muted-foreground'}`}>
                  <div className={`w-1 h-1 rounded-full ${hasSpecial ? 'bg-primary' : 'bg-muted-foreground'}`} />
                  1 Especial
                </div>
              </div>
            </div>

            <button 
              type="button"
              disabled={loading}
              onClick={async (e) => {
                console.log("Clique detectado no botão 'Finalizar Cadastro'");
                e.preventDefault();
                e.stopPropagation();
                await handleRegister(e as any);
              }}
              className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl shadow-[0_0_15px_rgba(0,255,135,0.2)] active:scale-[0.98] hover:opacity-90 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Finalizar Cadastro
            </button>
          </div>
        </div>
      )}

      {/* Footer Segurança */}
      <div className="text-center py-6 text-xs text-white/30 flex items-center justify-center gap-1.5 mt-auto">
        <ShieldCheck className="w-4 h-4 text-[#00FF87]"/>
        <span>Conexão e Cadastro Seguro FIXXER</span>
      </div>

      <div id="ts-visual-edit-probe-afadfb2c3e9f46ad" className="hidden">
        AJUSTE DE CATEGORIAS NA TELA DE CADASTRO
      </div>
      <div id="ts-visual-edit-probe-a5046340f86144b0" className="hidden">
        ALTERE OS SUBTITULOS
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

function MaskedInputField({ 
  label, 
  placeholder, 
  mask,
  value, 
  onChange, 
  required 
}: { 
  label: string, 
  placeholder: string, 
  mask: string,
  value?: string, 
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void, 
  required?: boolean 
}) {
  const applyMask = (val: string, maskStr: string) => {
    const clean = val.replace(/\D/g, "");
    let formatted = "";
    let maskIdx = 0;
    let cleanIdx = 0;

    while (maskIdx < maskStr.length && cleanIdx < clean.length) {
      if (maskStr[maskIdx] === '9') {
        formatted += clean[cleanIdx];
        cleanIdx++;
      } else {
        formatted += maskStr[maskIdx];
        // Se o caractere atual da máscara não for '9' e coincidir com o que o usuário digitou, 
        // apenas avançamos o índice da máscara se não estivermos adicionando duplicado
        if (val[formatted.length - 1] === maskStr[maskIdx]) {
          // Já adicionado
        }
      }
      maskIdx++;
    }
    return formatted;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      const originalValue = e.target.value;
      const formattedValue = applyMask(originalValue, mask);
      
      // Criamos um novo evento sintético ou modificamos o atual para refletir o valor mascarado
      // Para garantir que o cursor não pule, em implementações reais usaríamos refs, 
      // mas para este fix rápido de UI, garantir o valor correto no estado pai é prioridade.
      e.target.value = formattedValue;
      onChange(e);
    }
  };

  return (
    <div>
      <label className="block text-sm font-bold text-muted-foreground mb-2">{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        required={required}
        maxLength={mask.length}
        className="w-full px-4 py-3 rounded-xl bg-background border border-white/10 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground/30 text-white"
      />
    </div>
  );
}

function CpfCnpjField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const applyMask = (raw: string) => {
    let v = raw.replace(/\D/g, "");
    if (v.length > 14) v = v.slice(0, 14);
    if (v.length > 11) {
      // CNPJ 00.000.000/0000-00
      return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}${v.length > 12 ? "-" + v.slice(12) : ""}`;
    }
    // CPF 000.000.000-00
    if (v.length > 9) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
    if (v.length > 6) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
    if (v.length > 3) return `${v.slice(0, 3)}.${v.slice(3)}`;
    return v;
  };
  const digits = value.replace(/\D/g, "").length;
  const hint = digits === 0 ? "Digite CPF ou CNPJ" : digits <= 11 ? "CPF" : "CNPJ";
  return (
    <div>
      <label className="block text-sm font-bold text-muted-foreground mb-2">
        CPF / CNPJ
      </label>
      <input
        type="text"
        inputMode="numeric"
        placeholder="000.000.000-00 ou 00.000.000/0000-00"
        value={value}
        onChange={(e) => onChange(applyMask(e.target.value))}
        maxLength={18}
        className="w-full px-4 py-3 rounded-xl bg-background border border-white/10 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground/30 text-white"
      />
      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
        {hint}
      </p>
    </div>
  );
}

const SQL_COMPLETE = `
-- 0. HABILITAR EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT subscription_plans_category_name_key UNIQUE (category, name)
);

-- Inserir Planos Padrão
INSERT INTO public.subscription_plans (category, name, price) VALUES 
('lojista', 'Grátis Lojista', 0.00),
('prestador', 'Grátis Prestador', 0.00),
('fornecedor', 'Grátis Fornecedor', 0.00)
ON CONFLICT (category, name) DO NOTHING;

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
    target_plan_id UUID;
BEGIN
    -- Determinar a role com fallback seguro
    BEGIN
        default_role := (new.raw_user_meta_data->>'role')::public.app_role;
    EXCEPTION WHEN OTHERS THEN
        default_role := 'lojista';
    END;

    -- Buscar o plano padrão (gratuito) para a categoria
    SELECT id INTO target_plan_id 
    FROM public.subscription_plans 
    WHERE category = default_role 
    AND price = 0 
    LIMIT 1;

    -- Criação do perfil com tratamento de erro
    BEGIN
        INSERT INTO public.profiles (id, full_name, role, plan_id)
        VALUES (
            new.id, 
            COALESCE(new.raw_user_meta_data->>'full_name', ''), 
            default_role,
            target_plan_id
        )
        ON CONFLICT (id) DO UPDATE SET 
            role = EXCLUDED.role,
            plan_id = EXCLUDED.plan_id;
    EXCEPTION WHEN OTHERS THEN
        -- Log ou ignore para não quebrar o login
        NULL;
    END;
    
    -- Criação da role com tratamento de erro
    BEGIN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (new.id, default_role)
        ON CONFLICT (user_id, role) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
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
