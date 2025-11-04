// src/utils/geocode.ts
import axios from 'axios';

const CACHE_KEY = 'geocode_cache_v1';
const ROUND_DECIMALS = 4;
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';

// Lee caché de geocodificación desde localStorage
function readCache(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Escribe caché de geocodificación a localStorage
function writeCache(cache: Record<string, string>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

// Genera clave de caché redondeando coordenadas a 4 decimales
function coordKey(lat: number, lon: number) {
  return `${lat.toFixed(ROUND_DECIMALS)},${lon.toFixed(ROUND_DECIMALS)}`;
}

/**
 * reverseGeocode: intenta obtener una etiqueta amigable (en español) para lat/lon.
 * - Devuelve string con una aproximación (p. ej. "Providencia, Santiago" o "Av. Apoquindo 1234, Las Condes")
 * - Devuelve null si no hay resultado o si ocurre un error.
 */
export async function reverseGeocode(lat: number, lon: number, forceRefresh = false): Promise<string | null> {
  if (typeof lat !== 'number' || typeof lon !== 'number' || Number.isNaN(lat) || Number.isNaN(lon)) return null;

  const key = coordKey(lat, lon);
  const cache = readCache();

  if (!forceRefresh && cache[key]) {
    return cache[key];
  }

  try {
    const params = {
      format: 'jsonv2',
      lat: lat.toString(),
      lon: lon.toString(),
      addressdetails: '1',
      'accept-language': 'es' // Pedir resultados en español si están disponibles
    };

    const headers: Record<string, string> = {
      // Nominatim requiere identificar la aplicación: pon tu app o dominio si puedes.
      'User-Agent': (typeof window !== 'undefined' && window.location ? `${window.location.hostname} appcargadores/1.0` : 'appcargadores/1.0'),
      Referer: (typeof window !== 'undefined' && window.location ? window.location.origin : '')
    };

    const resp = await axios.get(NOMINATIM_URL, { params, headers, timeout: 8000 });

    const data = resp.data;
    if (!data) return null;

    // Intentamos construir una etiqueta amigable con las partes relevantes:
    const addr = data.address || {};
    // Prioridad de etiquetas: road + suburb + city/town + county + state + country
    const pieces: string[] = [];

    if (addr.road) pieces.push(addr.road);
    else if (addr.pedestrian) pieces.push(addr.pedestrian);
    else if (addr.cycleway) pieces.push(addr.cycleway);

    if (addr.house_number && pieces.length > 0) {
      // road + number => "Av. X 123"
      pieces[0] = `${pieces[0]} ${addr.house_number}`;
    }

    // agregar barrio / suburb si existe
    if (addr.suburb && !pieces.includes(addr.suburb)) pieces.push(addr.suburb);

    // ciudad / town / village
    if (addr.city) pieces.push(addr.city);
    else if (addr.town) pieces.push(addr.town);
    else if (addr.village) pieces.push(addr.village);
    else if (addr.county) pieces.push(addr.county);

    // state / country fallback
    if (pieces.length === 0 && addr.state) pieces.push(addr.state);
    if (pieces.length === 0 && addr.country) pieces.push(addr.country);

    const label = pieces.length > 0 ? pieces.join(', ') : (data.display_name ? String(data.display_name).split(',').slice(0,3).join(', ') : null);

    if (label) {
      cache[key] = label;
      writeCache(cache);
      return label;
    }

    return null;
  } catch {
    // console.warn('reverseGeocode error', err);
    return null;
  }
}

/**
 * batchReverseGeocode
 * - recibe array de {id, lat, lon} y devuelve un map id->label (o null).
 * - hace todas las llamadas en paralelo pero limpia la lista usando cache.
 */
export async function batchReverseGeocode(items: { id: string; lat: number; lon: number }[]): Promise<Record<string, string | null>> {
  const cache = readCache();
  const results: Record<string, string | null> = {};
  const toFetch: { id: string; lat: number; lon: number }[] = [];

  items.forEach(it => {
    const key = coordKey(it.lat, it.lon);
    if (cache[key]) results[it.id] = cache[key];
    else toFetch.push(it);
  });

  if (toFetch.length === 0) return results;

  // limitar concurrencia si lo deseas; aquí hacemos Promise.all (útil si pocos items)
  const promises = toFetch.map(async it => {
    const label = await reverseGeocode(it.lat, it.lon);
    results[it.id] = label;
    return { id: it.id, lat: it.lat, lon: it.lon, label };
  });

  const fetched = await Promise.all(promises);
  // actualizar cache con los que vinieron
  const newCache = { ...cache };
  fetched.forEach(f => {
    if (f.label) newCache[coordKey(f.lat, f.lon)] = f.label;
  });
  writeCache(newCache);

  return results;
}
