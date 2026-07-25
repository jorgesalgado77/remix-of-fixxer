import { useState, useEffect, useRef } from 'react';
import { supabaseExternal } from '@/lib/supabaseExternal';

const LOCAL_KEY = 'fixxer_job_roles_cache_v1';

function loadLocal(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveLocal(map: Record<string, string[]>) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(map)); } catch { /* noop */ }
}

/**
 * Hook para gerenciar a lista COMPARTILHADA de cargos por subcategoria (branch).
 * - Persiste no Supabase externo na tabela `job_roles` (branch, name).
 * - Cache local (localStorage) como fallback offline.
 * - Realtime sync entre usuários.
 */
export function useJobRoles(branch: string | null | undefined) {
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<any>(null);

  const key = (branch || '').trim();

  const fetchRoles = async () => {
    if (!key) { setRoles([]); return; }
    setLoading(true);
    // fallback local imediato
    const local = loadLocal();
    if (local[key]) setRoles(local[key]);
    try {
      const { data, error } = await supabaseExternal
        .from('job_roles')
        .select('name')
        .eq('branch', key)
        .order('name');
      if (error) throw error;
      if (data) {
        const names = Array.from(new Set(data.map((r: any) => r.name).filter(Boolean)));
        setRoles(names);
        const map = loadLocal();
        map[key] = names;
        saveLocal(map);
      }
    } catch (err) {
      // silencioso: mantém cache local
      console.warn('[useJobRoles] fetch falhou, usando cache local:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
    if (channelRef.current) {
      try { supabaseExternal.removeChannel(channelRef.current); } catch { /* noop */ }
      channelRef.current = null;
    }
    if (!key) return;
    const chName = `jr-${key.slice(0, 30)}-${Math.random().toString(36).slice(2)}`;
    const ch = supabaseExternal.channel(chName);
    ch.on(
      'postgres_changes' as any,
      { event: '*', schema: 'public', table: 'job_roles', filter: `branch=eq.${key}` },
      () => { fetchRoles(); }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const addRole = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || !key) return;
    setRoles((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed].sort((a, b) => a.localeCompare(b))));
    const map = loadLocal();
    map[key] = Array.from(new Set([...(map[key] || []), trimmed]));
    saveLocal(map);
    try {
      const { error } = await supabaseExternal
        .from('job_roles')
        .insert([{ branch: key, name: trimmed }]);
      if (error && (error as any).code !== '23505') throw error;
    } catch (err) {
      console.warn('[useJobRoles] insert falhou (mantido no cache local):', err);
    }
  };

  return { roles, loading, addRole };
}
