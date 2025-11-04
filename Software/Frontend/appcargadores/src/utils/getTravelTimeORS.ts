interface TravelTimeParams {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  apiKey: string;
}

interface ORSFeature {
  properties?: {
    segments?: Array<{
      duration?: number;
    }>;
    summary?: {
      duration?: number;
    };
  };
}

interface ORSResponse {
  features?: ORSFeature[];
}

const ORS_ENDPOINT = 'https://api.openrouteservice.org/v2/directions/driving-car';

/**
 * Función utilitaria: secondsToHuman
 * 
 * Propósito: Convertir segundos a formato legible (ej: "1 h 25 min")
 * 
 * @param seconds - Duración en segundos
 * @returns String formateado (ej: "45 min", "2 h 15 min") o null si inválido
 */
const secondsToHuman = (seconds: number) => {
  if (!Number.isFinite(seconds)) {
    return null;
  }

  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes} min`;
  }

  return `${hours} h ${minutes.toString().padStart(2, '0')} min`;
};

/**
 * Función compleja: getTravelTimeORS
 * 
 * Propósito: Obtener tiempo de viaje real entre dos puntos usando la API
 * de OpenRouteService (ORS), considerando rutas de conducción reales.
 * 
 * Flujo:
 * 1. Construir payload con coordenadas [lng, lat] (formato ORS)
 * 2. Llamar API POST a /v2/directions/driving-car con Authorization header
 * 3. Extraer duración del primer segmento o summary
 * 4. Convertir segundos a formato legible con secondsToHuman
 * 
 * Diferencias vs distancia Haversine:
 * - Haversine: distancia "en línea recta" (simplificada)
 * - ORS: tiempo real considerando carreteras, velocidades, tráfico
 * 
 * Casos de uso:
 * - Mostrar "15 min" al cargador más cercano
 * - Algoritmo de ranking (preferir menor tiempo de llegada)
 * 
 * @param params - {origin, destination, apiKey}
 * @returns Promise<string | null> - "1 h 25 min" o null si falla
 */
export async function getTravelTimeORS({ origin, destination, apiKey }: TravelTimeParams): Promise<string | null> {
  try {
    const body = {
      coordinates: [
        [origin.lng, origin.lat],
        [destination.lng, destination.lat],
      ],
    };

    const response = await fetch(ORS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error('OpenRouteService response not ok:', await response.text());
      return null;
    }

    const data = (await response.json()) as ORSResponse;
    const feature = data.features?.[0];
    const durationSeconds = feature?.properties?.summary?.duration
      ?? feature?.properties?.segments?.[0]?.duration;

    return durationSeconds ? secondsToHuman(durationSeconds) : null;
  } catch (error) {
    console.error('Error requesting OpenRouteService travel time:', error);
    return null;
  }
}
