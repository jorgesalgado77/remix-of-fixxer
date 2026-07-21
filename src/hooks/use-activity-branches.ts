import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useActivityBranches() {
  const [branches, setBranches] = useState<string[]>(["Móveis Planejados", "Marcenaria"]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBranches() {
      try {
        const { data, error } = await supabase
          .from('activity_branches')
          .select('name')
          .order('name');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const names = data.map(b => b.name);
          // Garantir que os iniciais estejam lá e únicos
          const allBranches = Array.from(new Set(["Móveis Planejados", "Marcenaria", ...names]));
          setBranches(allBranches);
        }
      } catch (err) {
        console.error('Erro ao carregar ramos de atividade:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBranches();
  }, []);

  const addBranch = async (name: string) => {
    try {
      if (branches.includes(name)) return;
      
      const { error } = await supabase
        .from('activity_branches')
        .insert([{ name }]);
      
      if (error) throw error;
      
      setBranches(prev => [...prev, name]);
    } catch (err) {
      console.error('Erro ao adicionar ramo de atividade:', err);
    }
  };

  return { branches, loading, addBranch };
}
