import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Charger } from '../models/Charger';

interface MapCentererProps {
  center?: { lat: number, lng: number } | null;
}

// Componente auxiliar: centrar el mapa cuando cambie la prop center
function MapCenterer({ center }: MapCentererProps) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng]);
    }
  }, [center, map]);
  return null;
}

// Componente auxiliar: proporciona instancia del mapa a callbacks externos
function MapInstanceSetter({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();

  useEffect(() => {
    onReady(map);
  }, [map, onReady]);

  return null;
}

// Iconos de marcador para modo claro y oscuro
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
  onReserveCharger?: (chargerId: string) => void;
  onChargerClick?: (chargerId: string) => void;
  currentUser?: any; // Objeto usuario proveniente del contexto (contiene _id)
  onFavoritesChange?: (favoriteIds: string[]) => void;
}

// Extrae coordenadas lat/lng de la ubicación del cargador (soporta ambos formatos)
const resolveLatLng = (location: ChargerWithLatLng['location']) => {
  const lat = typeof location.lat === 'number' ? location.lat : location.coordinates?.[1];
  const lng = typeof location.lng === 'number' ? location.lng : location.coordinates?.[0];
  if (typeof lat === 'number' && typeof lng === 'number') {
    return { lat, lng };
  }
  return null;
};

const ChargerMap = forwardRef<ChargerMapHandle, ChargerMapProps>(({ chargers, userLocation, center, onReserveCharger, onChargerClick, currentUser, onFavoritesChange }, ref) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const getToken = () => localStorage.getItem('token');

  // Obtener favoritos del usuario (si existe)
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!currentUser || !currentUser._id) return;
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/favourites/${currentUser._id}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
          }
        });
        if (!res.ok) return;
        const data = await res.json();
        const favs = Array.isArray(data.favoriteStations) ? data.favoriteStations.map((s:any) => s._id) : [];
        setFavoriteIds(new Set(favs));
        // Notificar al componente padre (si se proporcionó)
        if (typeof onFavoritesChange === 'function') onFavoritesChange(favs);
      } catch (err) {
        console.error('No se pudieron obtener favoritos del usuario:', err);
      }
    };
    fetchFavorites();
  }, [currentUser, onFavoritesChange]);

  // Toggle favorito (agregar/quitar)
  const toggleFavorite = async (chargerId: string) => {
    if (!currentUser || !currentUser._id) {
      alert('Inicia sesión para gestionar favoritos');
      return;
    }
    const userId = currentUser._id;
    const token = getToken();
    // si ya es favorito -> eliminar
    if (favoriteIds.has(chargerId)) {
      // optimista
      setFavoriteIds(prev => {
        const copy = new Set(prev);
        copy.delete(chargerId);
        return copy;
      });
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/favourites/${userId}/${chargerId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        if (!res.ok) {
          throw new Error('No se pudo quitar favorito');
        }
        // notificar al padre
        if (typeof onFavoritesChange === 'function') onFavoritesChange(Array.from(favoriteIds).filter(id => id !== chargerId));
      } catch (err) {
        console.error('Error quitando favorito:', err);
        // revertir
        setFavoriteIds(prev => new Set(prev).add(chargerId));
        alert('No se pudo quitar la estación de favoritos.');
      }
    } else {
      // agregar
      setFavoriteIds(prev => new Set(prev).add(chargerId));
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/favourites/${userId}/${chargerId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        if (!res.ok) {
          throw new Error('No se pudo agregar favorito');
        }
        // notificar al padre (favoriteIds aún no incluye chargerId en el closure de state; reconstruir)
        if (typeof onFavoritesChange === 'function') onFavoritesChange(Array.from(new Set([...Array.from(favoriteIds), chargerId])));
      } catch (err) {
        console.error('Error agregando favorito:', err);
        // revertir
        setFavoriteIds(prev => {
          const copy = new Set(prev);
          copy.delete(chargerId);
          return copy;
        });
        alert('No se pudo agregar la estación a favoritos.');
      }
    }
  };

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
    <div className="h-80 flex items-center justify-center card">
      <div className="text-center text-muted">
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
        className={`rounded-lg leaflet-container-custom ${isDarkMode ? 'dark-popup' : 'light-popup'}`}
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
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/64/64113.png', // Icono azul
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          })}>
            <Popup className={isDarkMode ? 'dark-popup' : 'light-popup'}>
              <div>
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

          // Obtener y formatear costo por kWh si existe
          const rawUnitCost = (charger as any).energy_cost ?? (charger as any).unitCost ?? (charger as any).cost ?? undefined;
          const unitCostStr = rawUnitCost !== undefined && rawUnitCost !== null
            ? `CLP$ ${Math.ceil(Number(rawUnitCost)).toLocaleString()} / kWh`
            : 'N/A';

          return (
            <Marker
              key={charger._id || charger.name}
              position={[resolvedLocation.lat, resolvedLocation.lng]}
              icon={isDarkMode ? darkIcon : lightIcon}
              eventHandlers={{
                click: () => {
                  if (onChargerClick && charger._id) {
                    onChargerClick(charger._id);
                  }
                }
              }}
            >
              <Popup className={isDarkMode ? 'dark-popup' : 'light-popup'}>
                <div
                  onClick={() => {
                    if (onChargerClick && charger._id) {
                      onChargerClick(charger._id);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-2">
                    <strong>{charger.name}</strong>
                    {/* Estrella favorito (solo para usuario EV conectado) */}
                    {currentUser && currentUser._id && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(charger._id); }}
                        aria-label={favoriteIds.has(charger._id) ? 'Quitar favorito' : 'Agregar favorito'}
                        title={favoriteIds.has(charger._id) ? 'Quitar favorito' : 'Agregar favorito'}
                        className="ml-1"
                      >
                        {favoriteIds.has(charger._id) ? (
                          // estrella amarilla llena
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ) : (
                          // Estrella vacía
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.97a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.286 3.97c.3.92-.755 1.688-1.538 1.118l-3.385-2.46a1 1 0 00-1.176 0l-3.385 2.46c-.783.57-1.838-.197-1.538-1.118l1.286-3.97a1 1 0 00-.364-1.118L2.05 9.397c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.97z" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                  <br />
                  <div className="mt-1">
                    <span className="inline-block w-3 h-3 rounded-full mr-1 bg-green-500"></span>
                    {(charger.type ?? charger.chargerType) ?? 'Tipo desconocido'} - {(charger.power ?? charger.powerOutput) ?? 'N/D'} kW · <span className="text-primary-medium">{unitCostStr}</span>
                  </div>
                  <div className="mt-2 text-sm">
                    {resolvedLocation.lat.toFixed(4)}, {resolvedLocation.lng.toFixed(4)}
                  </div>
                  {onReserveCharger && charger._id && (
                    <div className="mt-3">
                      <button
                        onClick={() => onReserveCharger(charger._id)}
                        className="btn btn-primary btn-sm btn-block"
                      >
                        Reservar
                      </button>
                    </div>
                  )}
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