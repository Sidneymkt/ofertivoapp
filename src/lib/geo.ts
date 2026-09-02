/**
 * Funções utilitárias para cálculos geográficos
 * Centraliza a lógica de distância para evitar duplicação
 */

/**
 * Converte graus para radianos
 */
const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

/**
 * Calcula a distância entre duas coordenadas usando a fórmula de Haversine
 * @param lat1 - Latitude do ponto 1
 * @param lon1 - Longitude do ponto 1
 * @param lat2 - Latitude do ponto 2
 * @param lon2 - Longitude do ponto 2
 * @returns Distância em quilômetros
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Raio da Terra em km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
};

/**
 * Calcula a distância em metros (útil para validações de check-in)
 * @param lat1 - Latitude do ponto 1
 * @param lon1 - Longitude do ponto 1
 * @param lat2 - Latitude do ponto 2
 * @param lon2 - Longitude do ponto 2
 * @returns Distância em metros
 */
export const calculateDistanceInMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  return calculateDistance(lat1, lon1, lat2, lon2) * 1000;
};

/**
 * Formata a distância para exibição amigável
 * @param distanceKm - Distância em quilômetros
 * @returns String formatada (ex: "500m" ou "2.5 km")
 */
export const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)} km`;
};

/**
 * Verifica se uma coordenada está dentro de um raio especificado
 * @param centerLat - Latitude do centro
 * @param centerLon - Longitude do centro
 * @param targetLat - Latitude do alvo
 * @param targetLon - Longitude do alvo
 * @param radiusKm - Raio em quilômetros
 * @returns true se o alvo está dentro do raio
 */
export const isWithinRadius = (
  centerLat: number,
  centerLon: number,
  targetLat: number,
  targetLon: number,
  radiusKm: number
): boolean => {
  const distance = calculateDistance(centerLat, centerLon, targetLat, targetLon);
  return distance <= radiusKm;
};
