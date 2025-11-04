/**
 * Calcular distancia entre dos puntos geográficos usando la fórmula de Haversine
 * La fórmula de Haversine calcula la distancia entre dos puntos en una esfera
 * teniendo en cuenta la curvatura de la Tierra
 * 
 * @param {number} lat1 - Latitud del punto 1 (en grados)
 * @param {number} lon1 - Longitud del punto 1 (en grados)
 * @param {number} lat2 - Latitud del punto 2 (en grados)
 * @param {number} lon2 - Longitud del punto 2 (en grados)
 * @returns {number} Distancia en kilómetros
 * 
 * @example
 * // Calcular distancia entre Valparaíso y Santiago
 * const distancia = calcularDistancia(-33.0472, -71.6127, -33.4489, -70.6693);
 * console.log(`Distancia: ${distancia.toFixed(2)} km`); // ~102 km
 */
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio medio de la Tierra en kilómetros
  
  // Convertir diferencias de latitud y longitud a radianes
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  // Aplicar fórmula de Haversine
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  // Retornar distancia en kilómetros
  return R * c;
}

module.exports = calcularDistancia;