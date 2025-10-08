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
