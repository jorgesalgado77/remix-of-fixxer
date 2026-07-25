/**
 * FIXXER — Utilidades de distância geográfica para os Feeds.
 * ------------------------------------------------------------
 * - `useUserCoords()`: obtém e memoiza (localStorage) as coordenadas
 *   do usuário via navigator.geolocation.
 * - `cityCoords(city)`: lookup de coordenadas médias por cidade BR.
 * - `formatDistanceFromCity(city, user)`: retorna string do tipo
 *   "a 4.2 km de você" ou `null` quando não puder calcular.
 */
import { useEffect, useState } from "react";
import { haversineKm } from "@/lib/activity-branches";

type Coords = { lat: number; lng: number };

const LS_KEY = "fixxer_user_coords_v1";

const CITY_COORDS: Record<string, Coords> = {
  sorocaba: { lat: -23.5015, lng: -47.4526 },
  votorantim: { lat: -23.5464, lng: -47.4383 },
  "são paulo": { lat: -23.5505, lng: -46.6333 },
  "sao paulo": { lat: -23.5505, lng: -46.6333 },
  campinas: { lat: -22.9099, lng: -47.0626 },
  itu: { lat: -23.2637, lng: -47.2992 },
  "rio de janeiro": { lat: -22.9068, lng: -43.1729 },
  "belo horizonte": { lat: -19.9167, lng: -43.9345 },
  curitiba: { lat: -25.4284, lng: -49.2733 },
  "porto alegre": { lat: -30.0346, lng: -51.2177 },
  salvador: { lat: -12.9714, lng: -38.5014 },
  brasilia: { lat: -15.7942, lng: -47.8822 },
  "brasília": { lat: -15.7942, lng: -47.8822 },
  fortaleza: { lat: -3.7319, lng: -38.5267 },
  recife: { lat: -8.0476, lng: -34.8770 },
};

// Cache memoizado por chave de cidade normalizada (evita reprocessar strings a cada render).
const CITY_LOOKUP_CACHE = new Map<string, Coords | null>();

function normalizeCity(raw?: string | null): string | null {
  if (!raw) return null;
  const first = raw.split(/[\/,-]/)[0]?.trim().toLowerCase();
  return first || null;
}

export function cityCoords(city?: string | null): Coords | null {
  const k = normalizeCity(city);
  if (!k) return null;
  const cached = CITY_LOOKUP_CACHE.get(k);
  if (cached !== undefined) return cached;
  const resolved = CITY_COORDS[k] ?? null;
  CITY_LOOKUP_CACHE.set(k, resolved);
  return resolved;
}

export function useUserCoords(): Coords | null {
  const [coords, setCoords] = useState<Coords | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      return raw ? (JSON.parse(raw) as Coords) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        // Só atualiza estado se realmente mudou — evita re-renderizações desnecessárias
        // em componentes que dependem da identidade do objeto (ex.: sortedItems memoizado).
        setCoords((prev) => {
          if (prev && Math.abs(prev.lat - next.lat) < 1e-6 && Math.abs(prev.lng - next.lng) < 1e-6) {
            return prev;
          }
          try { window.localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
          return next;
        });
      },
      () => {
        /* Permissão negada / indisponível — fallback silencioso, mantém coords do cache. */
      },
      { timeout: 6000, maximumAge: 5 * 60_000 },
    );
    return () => { cancelled = true; };
  }, []);

  return coords;
}

/**
 * Formata "a X km de você" a partir de uma string de cidade e das coordenadas
 * do usuário. Retorna `null` quando qualquer dado necessário estiver ausente.
 */
export function formatDistanceFromCity(
  city: string | null | undefined,
  user: Coords | null,
): string | null {
  if (!user) return null;
  const c = cityCoords(city);
  if (!c) return null;
  const km = haversineKm(user, c);
  if (!Number.isFinite(km)) return null;
  const label = km < 10 ? km.toFixed(1) : Math.round(km).toString();
  return `a ${label} km de você`;
}
