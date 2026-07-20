import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Store, Hammer, Truck, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/auth/register")({
  component: RegisterComponent,
});

type Step = "role" | "details";
type Role = "lojista" | "prestador" | "fornecedor";

function RegisterComponent() {
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<Role | null>(null);
  const navigate = useNavigate();

  const handleRoleSelect = (selectedRole: Role) => {
    setRole(selectedRole);
    setStep("details");
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
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Quase lá!</h1>
            <p className="text-muted-foreground mt-2">Preencha os dados do seu perfil de {role}</p>
          </div>

          <div className="bg-card backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl space-y-5">
            {role === "lojista" && (
              <>
                <InputField label="CNPJ / Razão Social" placeholder="00.000.000/0001-00" />
                <InputField label="Nome Comercial" placeholder="Minha Marcenaria" />
              </>
            )}
            {role === "prestador" && (
              <>
                <InputField label="CPF / CNPJ" placeholder="000.000.000-00" />
                <InputField label="Especialidade Principal" placeholder="Montador de Móveis" />
                <InputField label="Comissão Desejada (%)" placeholder="15" type="number" />
              </>
            )}
            {role === "fornecedor" && (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-muted-foreground">Tipo de Serviço</label>
                  <select className="w-full px-4 py-3 rounded-xl bg-background border border-white/10 focus:outline-none focus:ring-1 focus:ring-primary text-white">
                    <option className="bg-slate-900">Marmoraria</option>
                    <option className="bg-slate-900">Vidraçaria</option>
                    <option className="bg-slate-900">Eletricista</option>
                    <option className="bg-slate-900">Pintor</option>
                  </select>
                </div>
                <InputField label="Portfólio (Link)" placeholder="instagram.com/seu-trabalho" />
              </>
            )}
            
            <InputField label="E-mail" placeholder="seu@email.com" type="email" />
            <InputField label="Senha" placeholder="••••••••" type="password" />

            <button className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-xl shadow-[0_0_15px_rgba(0,255,135,0.2)] active:scale-[0.98] hover:opacity-90 transition-all flex items-center justify-center gap-2 mt-4">
              Finalizar Cadastro
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
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

function InputField({ label, placeholder, type = "text" }: { label: string, placeholder: string, type?: string }) {
  return (
    <div>
      <label className="block text-sm font-bold text-muted-foreground mb-2">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl bg-background border border-white/10 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground/30 text-white"
      />
    </div>
  );
}
