import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Plus, Edit, Trash, Check, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/plans")({
  component: AdminPlansPage,
});

interface Plan {
  id: string;
  category: string;
  name: string;
  price: number;
  is_active: boolean;
}

function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    const { data } = await supabase.from('subscription_plans').select('*').order('created_at');
    if (data) setPlans(data);
    setLoading(false);
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('subscription_plans').update({ is_active: !current }).eq('id', id);
    fetchPlans();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Planos de Assinatura</h1>
        <button className="bg-primary px-4 py-2 rounded-lg font-bold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Plano
        </button>
      </div>

      <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/5">
            <tr>
              <th className="p-4">Categoria</th>
              <th className="p-4">Nome</th>
              <th className="p-4">Preço</th>
              <th className="p-4">Status</th>
              <th className="p-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {plans.map(plan => (
              <tr key={plan.id} className="border-t border-white/5">
                <td className="p-4 uppercase text-xs font-bold text-primary">{plan.category}</td>
                <td className="p-4 font-medium">{plan.name}</td>
                <td className="p-4">R$ {plan.price.toFixed(2)}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-black ${plan.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {plan.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="p-4 flex gap-2">
                  <button onClick={() => toggleActive(plan.id, plan.is_active)} className="p-2 hover:bg-white/5 rounded-lg">
                    {plan.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button className="p-2 hover:bg-white/5 rounded-lg"><Edit className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
