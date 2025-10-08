import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Charger } from '../models/Charger';

interface MapCentererProps {
  center?: { lat: number; lng: number } | null;
}

// Componente auxiliar para centrar el mapa cuando cambie la prop center
function MapCenterer({ center }: MapCentererProps) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng]);
    }
  }, [center, map]);
  return null;
}

function MapInstanceSetter({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();

  useEffect(() => {
    onReady(map);
  }, [map, onReady]);

  return null;
}

// Crea íconos para modo claro y oscuro
const lightIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const darkIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png",
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

type ChargerWithLatLng = Charger & {
  location: Charger['location'] & Partial<{ lat: number; lng: number }>;
  power?: number;
  type?: string;
};

export interface FlyToOptions {
  lat: number;
  lng: number;
  zoom?: number;
}

export interface ChargerMapHandle {
  flyTo: (options: FlyToOptions) => void;
}

interface ChargerMapProps {
  chargers: ChargerWithLatLng[];
  userLocation?: { lat: number, lng: number } | null;
  center?: { lat: number, lng: number } | null;
}

const resolveLatLng = (location: ChargerWithLatLng['location']) => {
  const lat = typeof location.lat === 'number' ? location.lat : location.coordinates?.[1];
  const lng = typeof location.lng === 'number' ? location.lng : location.coordinates?.[0];
  if (typeof lat === 'number' && typeof lng === 'number') {
    return { lat, lng };
  }
  return null;
};

const ChargerMap = forwardRef<ChargerMapHandle, ChargerMapProps>(({ chargers, userLocation, center }, ref) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  useImperativeHandle(ref, () => ({
    flyTo: ({ lat, lng, zoom = 15 }: FlyToOptions) => {
      if (mapInstance) {
        mapInstance.flyTo([lat, lng], zoom);
      }
    },
  }), [mapInstance]);

  // Detectar modo oscuro
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  if (!chargers.length && !userLocation) return (
    <div className="h-80 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
      <div className="text-center text-gray-500 dark:text-gray-400">
        <i className="fas fa-map-marker-alt text-4xl mb-3"></i>
        <p>No hay cargadores para mostrar</p>
      </div>
    </div>
  );

  // Centrar el mapa en la ubicación del usuario si existe, si no en el primer cargador
  const fallbackChargerLocation = chargers.length > 0 ? resolveLatLng(chargers[0].location) : null;

  const mapCenter: [number, number] = center
    ? [center.lat, center.lng]
    : userLocation
      ? [userLocation.lat, userLocation.lng]
      : fallbackChargerLocation
        ? [fallbackChargerLocation.lat, fallbackChargerLocation.lng]
        : [0, 0];

  return (
    <div className="h-80 w-full rounded-lg overflow-hidden relative z-10">
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg leaflet-container-custom"
      >
        <MapInstanceSetter onReady={setMapInstance} />
        <MapCenterer center={center} />
        <TileLayer
          url={isDarkMode
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {/* Marcador de usuario */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/64/64113.png', // icono azul
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          })}>
            <Popup>
              <div
                style={{
                  background: isDarkMode ? '#222' : '#fff',
                  color: isDarkMode ? '#fff' : '#222',
                  borderRadius: 8,
                  padding: 8,
                  minWidth: 120,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
              >
                <strong>Tu ubicación</strong>
                <div className="mt-2 text-sm">
                  {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}
        {/* Marcadores de cargadores */}
        {chargers.map((charger) => {
          const resolvedLocation = resolveLatLng(charger.location);
          if (!resolvedLocation) {
            return null;
          }

          return (
            <Marker
              key={charger._id || charger.name}
              position={[resolvedLocation.lat, resolvedLocation.lng]}
              icon={isDarkMode ? darkIcon : lightIcon}
            >
              <Popup>
                <div
                  style={{
                    background: isDarkMode ? '#222' : '#fff',
                    color: isDarkMode ? '#fff' : '#222',
                    borderRadius: 8,
                    padding: 8,
                    minWidth: 120,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}
                >
                  <strong>{charger.name}</strong>
                  <br />
                  <div className="mt-1">
                    <span className="inline-block w-3 h-3 rounded-full mr-1 bg-green-500"></span>
                    {(charger.type ?? charger.chargerType) ?? 'Tipo desconocido'} - {(charger.power ?? charger.powerOutput) ?? 'N/D'} kW
                  </div>
                  <div className="mt-2 text-sm">
                    {resolvedLocation.lat.toFixed(4)}, {resolvedLocation.lng.toFixed(4)}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
});

ChargerMap.displayName = 'ChargerMap';

export default ChargerMap;