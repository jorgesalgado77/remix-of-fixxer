import { useState, useEffect, useRef } from 'react';
import { supabaseExternal } from '@/lib/supabaseExternal';

const LOCAL_KEY = 'fixxer_offerings_cache_v1';

// Ofertas padrão sempre presentes (não removíveis)
export const DEFAULT_OFFERINGS = [
  'Veículo Próprio',
  'Ferramentas Completas',
  'Notebook Próprio',
];

function loadLocal(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLocal(list: string[]) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); } catch { /* noop */ }
}

/**
 * Hook para gerenciar a lista COMPARTILHADA de "oferecimentos" (offerings).
 * - Persiste no Supabase externo na tabela `offerings` (name).
 * - Cache local + realtime sync.
 * - Combina defaults + customizados.
 */
export function useOfferings() {
  const [offerings, setOfferings] = useState<string[]>(DEFAULT_OFFERINGS);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<any>(null);

  const merge = (custom: string[]): string[] => {
    const set = new Set<string>(DEFAULT_OFFERINGS);
    custom.forEach((c) => { if (c && c.trim()) set.add(c.trim()); });
    return Array.from(set);
  };

  const fetchOfferings = async () => {
    setLoading(true);
    const local = loadLocal();
    if (local.length) setOfferings(merge(local));
    try {
      const { data, error } = await supabaseExternal
        .from('offerings')
        .select('name')
        .order('name');
      if (error) throw error;
      if (data) {
        const names = Array.from(new Set(data.map((r: any) => r.name).filter(Boolean)));
        setOfferings(merge(names));
        saveLocal(names);
      }
    } catch (err) {
      console.warn('[useOfferings] fetch falhou, usando cache local:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfferings();
    const chName = `off-${Math.random().toString(36).slice(2)}`;
    const ch = supabaseExternal.channel(chName);
    ch.on(
      'postgres_changes' as any,
      { event: '*', schema: 'public', table: 'offerings' },
      () => { fetchOfferings(); }
    );
    ch.subscribe();
    channelRef.current = ch;
    return () => {
      try {
        if (channelRef.current) {
          supabaseExternal.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      } catch { /* noop */ }
    };
  }, []);

  const addOffering = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (DEFAULT_OFFERINGS.some((d) => d.toLowerCase() === trimmed.toLowerCase())) return;
    setOfferings((prev) => (prev.some((p) => p.toLowerCase() === trimmed.toLowerCase()) ? prev : merge([...prev.filter((p) => !DEFAULT_OFFERINGS.includes(p)), trimmed])));
    const local = loadLocal();
    if (!local.some((l) => l.toLowerCase() === trimmed.toLowerCase())) {
      const next = [...local, trimmed];
      saveLocal(next);
    }
    try {
      const { error } = await supabaseExternal
        .from('offerings')
        .insert([{ name: trimmed }]);
      if (error && (error as any).code !== '23505') throw error;
    } catch (err) {
      console.warn('[useOfferings] insert falhou (mantido no cache local):', err);
    }
  };

  return { offerings, loading, addOffering };
}
