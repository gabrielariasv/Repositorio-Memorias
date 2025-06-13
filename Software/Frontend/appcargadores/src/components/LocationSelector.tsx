import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L, { LeafletMouseEvent, Map } from 'leaflet';
import 'leaflet/dist/leaflet.css?inline';

type SearchResult = {
  lat: string;
  lon: string;
  display_name: string;
};

const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface LocationSelectorProps {
  initialPosition: [number, number];
  onSelect: (location: [number, number]) => void;
  onCancel: () => void;
}

const UpdateMapView = ({ position }: { position: [number, number] }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(position, map.getZoom());
  }, [position, map]);

  return null;
};

const MapClickHandler = ({ onClick }: { onClick: (e: LeafletMouseEvent) => void }) => {
  const map = useMap();
  
  useEffect(() => {
    const handler = (e: LeafletMouseEvent) => onClick(e);
    map.on('click', handler);
    
    return () => {
      map.off('click', handler);
    };
  }, [map, onClick]);
  
  return null;
};

export default function LocationSelector({ 
  initialPosition, 
  onSelect, 
  onCancel 
}: LocationSelectorProps) {
  const [position, setPosition] = useState<[number, number]>(initialPosition);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const mapRef = useRef<Map | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Buscar ubicaciones con debounce (búsqueda automática)
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
      );
      const results: SearchResult[] = await response.json();
      setSearchResults(results);
      setShowResults(true);
    } catch (error) {
      console.error("Error en búsqueda:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Efecto para búsqueda automática con debounce
  useEffect(() => {
    // Cancelar cualquier timeout previo
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Solo buscar si hay texto (más de 2 caracteres)
    if (searchQuery.trim().length > 2) {
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch(searchQuery);
      }, 300); // 300ms de debounce
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
    
    // Limpieza al desmontar
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, handleSearch]);

  // Manejador de clics en el mapa
  const handleMapClick = useCallback((e: LeafletMouseEvent) => {
    setPosition([e.latlng.lat, e.latlng.lng]);
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  }, []);

  // Función para obtener la instancia del mapa
  const handleMapReady = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.setView(position, mapRef.current.getZoom());
    }
  }, [position]);

  // Manejar selección de ubicación desde los resultados
  const handleSelectLocation = (result: SearchResult) => {
    const newPos: [number, number] = [parseFloat(result.lat), parseFloat(result.lon)];
    setPosition(newPos);
    setSearchQuery(result.display_name);
    setSearchResults([]);
    setShowResults(false);
  };

  // Cerrar resultados al hacer clic fuera del buscador
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Encabezado */}
      <div className="p-4 bg-gray-100 border-b flex justify-between items-center">
        <h2 className="text-xl font-bold">Seleccionar ubicación</h2>
        <div className="flex gap-2">
          <button 
            onClick={onCancel}
            className="px-4 py-2 border rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onSelect(position)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Aceptar
          </button>
        </div>
      </div>

      {/* Buscador con contenedor de referencia */}
      <div ref={searchContainerRef} className="p-4 border-b relative">
        <div className="flex gap-2 items-center">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              placeholder="Buscar dirección..."
              className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
            />
            
            {/* Indicador de búsqueda */}
            {isSearching && (
              <div className="absolute right-3 top-3">
                <div className="w-5 h-5 border-t-2 border-blue-500 border-solid rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>
        
        {/* Resultados de búsqueda en dropdown */}
        {(showResults && searchResults.length > 0) && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
            {searchResults.map((result, index) => (
              <div 
                key={index}
                onClick={() => handleSelectLocation(result)}
                className="p-3 border-b last:border-b-0 cursor-pointer hover:bg-blue-50 transition-colors"
              >
                <div className="font-medium truncate">{result.display_name.split(',')[0]}</div>
                <div className="text-sm text-gray-600 truncate">
                  {result.display_name.split(',').slice(1).join(',').trim()}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Mensaje si no hay resultados */}
        {(showResults && !isSearching && searchResults.length === 0 && searchQuery.length > 2) && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 p-4 text-center text-gray-500">
            No se encontraron ubicaciones
          </div>
        )}
      </div>

      {/* Mapa */}
      <div className="flex-1 relative">
        <MapContainer 
          center={position} 
          zoom={15} 
          style={{ height: '100%', width: '100%' }}
          whenReady={handleMapReady}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <Marker position={position} icon={customIcon} />
          <UpdateMapView position={position} />
          <MapClickHandler onClick={handleMapClick} />
        </MapContainer>
        
        {/* Indicador de posición actual */}
        <div className="absolute top-4 left-4 bg-white px-3 py-2 rounded-md shadow-md z-10 text-sm">
          <div className="font-medium">Posición actual:</div>
          <div>Lat: {position[0].toFixed(6)}, Lng: {position[1].toFixed(6)}</div>
        </div>
      </div>
    </div>
  );
}