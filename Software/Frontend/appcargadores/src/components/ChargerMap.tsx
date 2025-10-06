import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Charger } from '../models/Charger';
import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';

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

interface ChargerMapProps {
  chargers: Charger[];
}

export interface ChargerMapHandle {
  flyTo: (opts: { lat: number; lng: number; zoom?: number }) => void;
}

const ChargerMap = forwardRef<ChargerMapHandle, ChargerMapProps>(({ chargers }, ref) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);

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

  useImperativeHandle(ref, () => ({
    flyTo: ({ lat, lng, zoom = 17 }) => {
      if (mapInstance) {
        mapInstance.flyTo([lat, lng], zoom);
      }
    }
  }), [mapInstance]);

  // Efecto para controlar el z-index del mapa
  useEffect(() => {
    if (mapInstance) {
      const container = mapInstance.getContainer();
      if (container) {
        // Asegurar que el mapa tenga un z-index menor que el navbar (z-50)
        container.style.zIndex = '10';
        
        // También controlar los elementos internos de Leaflet
        const leafletPanes = container.querySelectorAll('.leaflet-pane');
        leafletPanes.forEach((pane: HTMLElement) => {
          pane.style.zIndex = '10';
        });
      }
    }
  }, [mapInstance]);

  if (!chargers.length) return (
    <div className="h-80 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
      <div className="text-center text-gray-500 dark:text-gray-400">
        <i className="fas fa-map-marker-alt text-4xl mb-3"></i>
        <p>No hay cargadores para mostrar</p>
      </div>
    </div>
  );

  // Centrar el mapa en el primer cargador o en una ubicación por defecto
  const defaultCenter: [number, number] = [-33.4489, -70.6693]; // Santiago, Chile como fallback
  const center: [number, number] = chargers.length > 0 && 
                                  chargers[0].location && 
                                  Array.isArray(chargers[0].location.coordinates) ? 
    [chargers[0].location.coordinates[1], chargers[0].location.coordinates[0]] : 
    defaultCenter;

  return (
    <div className="h-80 w-full rounded-lg overflow-hidden relative z-10">
      <MapContainer 
        center={center} 
        zoom={13} 
        // @ts-expect-error MapContainer whenReady passes an object with target (the map instance), but types expect no args
        whenReady={({ target }) => setMapInstance(target)}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg leaflet-container-custom"
      >
        <TileLayer 
          url={isDarkMode 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"} 
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {chargers.map((charger) => {
          if (!charger.location || !Array.isArray(charger.location.coordinates) || charger.location.coordinates.length !== 2) {
            return null;
          }
          const [longitude, latitude] = charger.location.coordinates;
          return (
            <Marker
              key={charger._id}
              position={[latitude, longitude]}
              icon={isDarkMode ? darkIcon : lightIcon}
            >
              <Popup className={`${isDarkMode ? 'dark-popup' : 'light-popup'}`}>
                <div className={isDarkMode ? 'text-white' : 'text-gray-800'}>
                  <strong>{charger.name}</strong><br />
                  <div className="mt-1">
                    <span className={`inline-block w-3 h-3 rounded-full mr-1 ${
                      charger.status === 'available' ? 'bg-green-500' :
                      charger.status === 'occupied' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}></span>
                    {charger.chargerType} - {charger.powerOutput} kW
                  </div>
                  <div className="mt-2 text-sm">
                    {latitude.toFixed(4)}, {longitude.toFixed(4)}
                  </div>
                  <div className="mt-1 text-xs">
                    Estado: {charger.status === 'available' ? 'Disponible' :
                            charger.status === 'occupied' ? 'Ocupado' : 'Mantenimiento'}
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

export default ChargerMap;