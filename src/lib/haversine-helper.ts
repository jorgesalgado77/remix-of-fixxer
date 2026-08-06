import { calculateDistance } from "./RecentStoresCarousel";

/**
 * Utilitário global para cálculo de distância entre usuários.
 * Centraliza a lógica para garantir consistência em toda a plataforma.
 */
export const getHaversineDistance = (
  lat1: number | string | null | undefined,
  lng1: number | string | null | undefined,
  lat2: number | string | null | undefined,
  lng2: number | string | null | undefined
): number | null => {
  const l1 = typeof lat1 === 'string' ? parseFloat(lat1) : (lat1 as number);
  const n1 = typeof lng1 === 'string' ? parseFloat(lng1) : (lng1 as number);
  const l2 = typeof lat2 === 'string' ? parseFloat(lat2) : (lat2 as number);
  const n2 = typeof lng2 === 'string' ? parseFloat(lng2) : (lng2 as number);

  if (!l1 || !n1 || !l2 || !n2 || isNaN(l1) || isNaN(n1) || isNaN(l2) || isNaN(n2)) {
    return null;
  }

  // Ignora coordenadas (0,0) que costumam indicar erro de geocodificação
  if (Math.abs(l1) < 0.0001 || Math.abs(l2) < 0.0001) return null;

  const distance = calculateDistance(l1, n1, l2, n2);
  return isNaN(distance) ? null : distance;
};
