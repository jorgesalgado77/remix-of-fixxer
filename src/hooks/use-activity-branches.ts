import { useState, useEffect, useRef } from 'react';
import { supabaseExternal } from '@/lib/supabaseExternal';

export function useActivityBranches() {
  const [branches, setBranches] = useState<string[]>(["Móveis Planejados", "Marcenaria"]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<any>(null);

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

    // Evita re-inscrição no StrictMode / múltiplos mounts
    if (channelRef.current) {
      try { supabaseExternal.removeChannel(channelRef.current); } catch {}
      channelRef.current = null;
    }

    const channelName = `ab-sync-v2-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    const channel = supabaseExternal.channel(channelName);
    channel.on(
      'postgres_changes' as any,
      { event: '*', schema: 'public', table: 'activity_branches' },
      () => { fetchBranches(); }
    );
    channel.subscribe();
    channelRef.current = channel;

    return () => {
      try {
        if (channelRef.current) {
          supabaseExternal.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      } catch (e) {
        console.warn('Erro ao remover canal Realtime:', e);
      }
    };
  }, []);

  const addBranch = async (name: string) => {
    try {
      if (branches.includes(name)) return;

      const { error } = await supabaseExternal
        .from('activity_branches')
        .insert([{ name }]);

      if (error) throw error;
    } catch (err) {
      console.error('Erro ao adicionar ramo de atividade:', err);
    }
  };

  return { branches, loading, addBranch };
}
