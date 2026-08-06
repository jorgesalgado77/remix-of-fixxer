/**
 * Utilitário global para cálculo de distância entre coordenadas (Haversine).
 * Centraliza a lógica para garantir consistência em toda a plataforma.
 */
function calculateDistanceInternal(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return NaN;
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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

  const distance = calculateDistanceInternal(l1, n1, l2, n2);
  return isNaN(distance) ? null : distance;
};
