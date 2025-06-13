import { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";

// Solución definitiva para iconos
const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapPickerProps {
  initialPosition: [number, number];
  onLocationSelect: (location: [number, number]) => void;
}

// Componente para actualizar la vista del mapa
const UpdateMapView = ({ position }: { position: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(position, map.getZoom());
  }, [position, map]);
  return null;
};

// Componente para manejar clics en el mapa
const LocationMarker = ({ position, onPositionChange }: { 
  position: [number, number]; 
  onPositionChange: (pos: [number, number]) => void 
}) => {
  useMapEvents({
    click(e) {
      onPositionChange([e.latlng.lat, e.latlng.lng]);
    }
  });
  return position ? <Marker position={position} icon={customIcon} /> : null;
};

// Tipos para resultados de búsqueda
interface SearchResult {
  lat: string;
  lon: string;
  display_name: string;
}

export default function MapPicker({ initialPosition, onLocationSelect }: MapPickerProps) {
  const [position, setPosition] = useState<[number, number]>(initialPosition);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    onLocationSelect(position);
  }, [position, onLocationSelect]);

  // Buscar ubicaciones usando Nominatim
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setShowResults(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const results: SearchResult[] = await response.json();
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Seleccionar resultado de búsqueda
  const handleResultClick = (result: SearchResult) => {
    const newPos: [number, number] = [parseFloat(result.lat), parseFloat(result.lon)];
    setPosition(newPos);
    setShowResults(false);
    setSearchQuery(result.display_name);
  };

  return (
    <div className="w-full" style={{ maxWidth: '600px', margin: '0 auto' }}>
      {/* Buscador por encima del mapa */}
      <div className="relative mb-2">
        <div className="flex">
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowResults(false); }}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Buscar dirección..."
            className="w-full p-2 border rounded"
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching}
            className="ml-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isSearching ? '...' : 'Buscar'}
          </button>
        </div>
        {/* Popup de resultados */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-10 left-0 right-0 bg-white border rounded shadow max-h-48 overflow-y-auto mt-1">
            {searchResults.map((result, idx) => (
              <div
                key={idx}
                className="p-2 cursor-pointer hover:bg-gray-100 text-sm"
                onClick={() => handleResultClick(result)}
              >
                <div className="font-medium">{result.display_name.split(',')[0]}</div>
                <div className="text-gray-500">{result.display_name.split(',').slice(1).join(',')}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Mapa */}
      <div style={{ height: '300px', width: '100%', position: 'relative', zIndex: 0, borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #e5e7eb', maxWidth: '100%' }}>
        <MapContainer
          center={position}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          className="leaflet-map"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker
            position={position}
            onPositionChange={setPosition}
          />
          <UpdateMapView position={position} />
        </MapContainer>
      </div>
      {/* Coordenadas actuales */}
      <div className="text-xs text-center text-gray-600 mt-1">
        Lat: {position[0].toFixed(6)}, Lng: {position[1].toFixed(6)}
      </div>
    </div>
  );
}