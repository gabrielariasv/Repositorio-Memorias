/**
 * Utils OSRM
 * Encapsula la comunicación con un servicio OSRM externo.
 *
 * Nota: NO se define un valor por defecto para la URL aquí. Debe configurarse
 * vía la variable de entorno OSRM_URL (por ejemplo en `.env`). Si no existe,
 * las funciones devolverán `null` para indicar que no hay datos de enrutamiento.
 */
const axios = require('axios');

const OSRM_URL = process.env.OSRM_URL; // intentionally no fallback to localhost

/**
 * Obtener información de viaje (duraciones en segundos y distancias en metros)
 * desde la ubicación del usuario hacia cada cargador usando OSRM /table.
 * Devuelve `null` si OSRM_URL no está configurada o si la petición falla.
 *
 * @param {number} userLat
 * @param {number} userLng
 * @param {Array} chargers - Array de documentos de cargador con `location.coordinates` [lng, lat]
 * @returns {Promise<null|{durations: (number|null)[], distances: (number|null)[]}>}
 */
async function getTravelInfo(userLat, userLng, chargers) {
  if (!OSRM_URL) return null;
  if (!chargers || !chargers.length) return [];

  try {
    const coords = [`${userLng},${userLat}`].concat(
      chargers.map(c => `${c.location.coordinates[0]},${c.location.coordinates[1]}`)
    ).join(';');

    // Pedimos tanto duraciones como distancias (annotations)
    const url = `${OSRM_URL.replace(/\/$/, '')}/table/v1/car/${coords}`;
    const resp = await axios.get(url, { params: { sources: 0, annotations: 'duration,distance' }, timeout: 5000 });

    if (resp && resp.data) {
      const durationsRow = Array.isArray(resp.data.durations) && resp.data.durations.length > 0
        ? resp.data.durations[0].slice(1).map(v => (v === null || v === undefined) ? null : Number(v))
        : null;
      const distancesRow = Array.isArray(resp.data.distances) && resp.data.distances.length > 0
        ? resp.data.distances[0].slice(1).map(v => (v === null || v === undefined) ? null : Number(v))
        : null;
      return { durations: durationsRow, distances: distancesRow };
    }
    return null;
  } catch (err) {
    console.warn('OSRM table request failed:', err && err.message ? err.message : err);
    return null;
  }
}

module.exports = { OSRM_URL, getTravelInfo };
