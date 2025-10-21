// src/components/ChargerMap.tsx
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import React, { useEffect, useRef } from 'react';
// Componente auxiliar para centrar el mapa cuando cambie la prop center
function MapCenterer({ center }: { center?: { lat: number, lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng]);
    }
  }, [center, map]);
  return null;
}
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

// Añade onChargerClick al tipo de props
interface ChargerMapProps {
  chargers: Charger[];
  userLocation?: { lat: number, lng: number } | null;
  center?: { lat: number, lng: number } | null;
  // nuevo prop - nivel de zoom a aplicar cuando se centra
  zoom?: number;
  onChargerClick?: (charger: Charger) => void; // <-- nuevo prop opcional
}

export default function ChargerMap({ chargers, userLocation, center, zoom = 12, onChargerClick }: ChargerMapProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  // guardamos la instancia de Leaflet aquí (se asigna via whenCreated)
  const mapRef = useRef<any>(null);

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

  // Cuando cambian `center` o `zoom`, actualizar la vista del mapa.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // invalidar tamaño para que Leaflet recalcule y pinte correctamente
    // se usa pequeño delay para esperar a que el DOM se haya reflowed
    setTimeout(() => {
      try { map.invalidateSize(); } catch (e) { /* no-op */ }
    }, 50);
    
    if (center && typeof center.lat === 'number' && typeof center.lng === 'number') {
      if (typeof map.setView === 'function') {
        try {
          map.setView([center.lat, center.lng], zoom, { animate: true });
        } catch (e) {
          if (typeof map.flyTo === 'function') map.flyTo([center.lat, center.lng], zoom, { animate: true });
        }
      } else if (typeof map.setCenter === 'function') {
        map.setCenter({ lat: center.lat, lng: center.lng });
        if (typeof map.setZoom === 'function') map.setZoom(zoom);
      }
    } else if (userLocation && typeof userLocation.lat === 'number') {
      if (typeof map.setView === 'function') {
        try { map.setView([userLocation.lat, userLocation.lng], zoom, { animate: true }); }
        catch (e) { if (typeof map.flyTo === 'function') map.flyTo([userLocation.lat, userLocation.lng], zoom, { animate: true }); }
      } else if (typeof map.setCenter === 'function') {
        map.setCenter({ lat: userLocation.lat, lng: userLocation.lng });
        if (typeof map.setZoom === 'function') map.setZoom(zoom);
      }
    }
  }, [center, zoom, userLocation]);

  if (!chargers.length && !userLocation) return (
    <div className="h-80 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
      <div className="text-center text-gray-500 dark:text-gray-400">
        <i className="fas fa-map-marker-alt text-4xl mb-3"></i>
        <p>No hay cargadores para mostrar</p>
      </div>
    </div>
  );

  // Centrar el mapa en la ubicación del usuario si existe, si no en el primer cargador
  const mapCenter: [number, number] = center
    ? [center.lat, center.lng]
    : userLocation
      ? [userLocation.lat, userLocation.lng]
      : chargers.length > 0
        ? [chargers[0].location.lat, chargers[0].location.lng]
        : [0, 0];

  return (
    <div className="h-80 w-full rounded-lg overflow-hidden relative z-10">
      <MapContainer 
        center={mapCenter} 
        zoom={13}
        // whenCreated nos da la instancia de Leaflet Map para invalidateSize y control
        whenCreated={(m) => { mapRef.current = m; /* invalidar tamaño al crearse */ setTimeout(() => { try { m.invalidateSize(); } catch (e) {} }, 50); }}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg leaflet-container-custom"
      >
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
        {chargers.map((charger) => (
          <Marker
            key={charger._id || charger.name}
            position={[charger.location.lat, charger.location.lng]}
            icon={isDarkMode ? darkIcon : lightIcon}
            eventHandlers={{
              click: () => {
                // comportamiento existente (p.ej. centrar/abrir popup)...
                // ahora además emitimos el callback si existe
                if (onChargerClick) onChargerClick(charger);
              },
            }}
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
                <strong>{charger.name}</strong><br />
                <div className="mt-1">
                  <span className="inline-block w-3 h-3 rounded-full mr-1 bg-green-500"></span>
                  {charger.type} - {charger.power} kW
                </div>
                <div className="mt-2 text-sm">
                  {charger.location.lat.toFixed(4)}, {charger.location.lng.toFixed(4)}
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