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

  // Validação rigorosa de coordenadas (faixa real GPS)
  const isValid = (lat: number, lng: number) => {
    return !isNaN(lat) && !isNaN(lng) && 
           lat >= -90 && lat <= 90 && 
           lng >= -180 && lng <= 180 &&
           (lat !== 0 || lng !== 0); // Ignora (0,0) literal
  };

  if (!isValid(l1, n1) || !isValid(l2, n2)) {
    return null;
  }

  const distance = calculateDistanceInternal(l1, n1, l2, n2);
  
  // Se a distância for suspeita (ex: 0.0 exatamente), pode ser erro de input, mas Haversine aceita
  return isNaN(distance) ? null : distance;
};
