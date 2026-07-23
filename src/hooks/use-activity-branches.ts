import { useState, useEffect } from 'react';
import { supabaseExternal } from '@/lib/supabaseExternal';

export function useActivityBranches() {
  const [branches, setBranches] = useState<string[]>(["Móveis Planejados", "Marcenaria"]);
  const [loading, setLoading] = useState(true);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabaseExternal
        .from('activity_branches')
        .select('name')
        .order('name');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const names = data.map((b: any) => b.name);
        const allBranches = Array.from(new Set(["Móveis Planejados", "Marcenaria", ...names]));
        setBranches(allBranches);
      }
    } catch (err) {
      console.error('Erro ao carregar ramos de atividade:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();

    const channel = supabaseExternal
      .channel('activity-branches-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_branches' }, () => {
        fetchBranches();
      })
      .subscribe();

    return () => {
      supabaseExternal.removeChannel(channel);
    };
  }, []);

  const addBranch = async (name: string) => {
    try {
      if (branches.includes(name)) return;
      
      const { error } = await supabaseExternal
        .from('activity_branches')
        .insert([{ name }]);
      
      if (error) throw error;
      
      // O fetchBranches no useEffect/Realtime cuidará da atualização do estado local
    } catch (err) {
      console.error('Erro ao adicionar ramo de atividade:', err);
    }
  };

  return { branches, loading, addBranch };
}
