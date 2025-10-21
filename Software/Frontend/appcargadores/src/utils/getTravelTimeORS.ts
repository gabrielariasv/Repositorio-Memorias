// Utilidad para consultar OpenRouteService y obtener el tiempo estimado de viaje en auto
// Requiere una API key gratuita de https://openrouteservice.org/

export async function getTravelTimeORS({
  origin,
  destination,
  apiKey
}: {
  origin: { lat: number, lng: number },
  destination: { lat: number, lng: number },
  apiKey: string
}): Promise<string | null> {
  const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}` +
    `&start=${origin.lng},${origin.lat}&end=${destination.lng},${destination.lat}`;
  try {
    console.log('ORS request URL:', url);
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.features && data.features.length > 0) {
      const durationSec = data.features[0].properties.summary.duration;
      const durationMin = Math.round(durationSec / 60);
      return durationMin + ' min';
    }
    return null;
  } catch (e) {
    return null;
  }
}
