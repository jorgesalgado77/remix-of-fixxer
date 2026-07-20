import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { usePerformanceMode } from "@/hooks/use-performance-mode";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsersPage,
});

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'lojista' | 'prestador' | 'fornecedor';
}

function AdminUsersPage() {
  const { glassClass } = usePerformanceMode();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role');
      
      if (data) {
        // Obter emails da auth para completar a lista
        const { data: usersData } = await supabase.auth.admin.listUsers();
        const usersMap = new Map(usersData?.users.map(u => [u.id, u.email]));
        
        const mappedProfiles = data.map(p => ({
          ...p,
          email: usersMap.get(p.id) || 'N/A'
        })) as UserProfile[];
        
        setProfiles(mappedProfiles);
      }
      setLoading(false);
    }
    fetchUsers();
  }, []);

  const changeRole = async (userId: string, newRole: string) => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    setProfiles(profiles.map(p => p.id === userId ? { ...p, role: newRole as any } : p));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gestão de Usuários</h1>
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div className="bg-black/20 rounded-xl p-4 border border-white/5">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                <th className="p-3">Nome</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map(p => (
                <tr key={p.id} className="border-b border-white/5">
                  <td className="p-3">{p.full_name}</td>
                  <td className="p-3">{p.email}</td>
                  <td className="p-3">
                    <select 
                      value={p.role} 
                      onChange={(e) => changeRole(p.id, e.target.value)}
                      className="bg-black/20 rounded p-1"
                    >
                      <option value="admin">admin</option>
                      <option value="lojista">lojista</option>
                      <option value="prestador">prestador</option>
                      <option value="fornecedor">fornecedor</option>
                    </select>
                  </td>
                  <td className="p-3">
                    {/* Botão de excluir ou outras ações poderiam vir aqui */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
