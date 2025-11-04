import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L, { LeafletMouseEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css?inline';
import DropdownSearch, { LocationOption } from './DropdownSearch';

// Icono personalizado de Leaflet para el marcador
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

// Componente helper: actualiza la vista del mapa cuando cambia la posición
const UpdateMapView = ({ position }: { position: [number, number] }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(position, map.getZoom());
  }, [position, map]);

  return null;
};

// Componente helper: captura eventos de click en el mapa
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

// Componente principal: selector de ubicación con mapa interactivo y búsqueda
export default function LocationSelector({ 
  initialPosition, 
  onSelect, 
  onCancel 
}: LocationSelectorProps) {
  const [position, setPosition] = useState<[number, number]>(initialPosition);

  // Manejar selección desde el dropdown de búsqueda
  const handleDropdownSelect = (option: LocationOption) => {
    setPosition([option.lat, option.lon]);
  };

  // Manejar click manual en el mapa para actualizar posición
  const handleMapClick = (e: LeafletMouseEvent) => {
    setPosition([e.latlng.lat, e.latlng.lng]);
  };

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

      {/* Menú desplegable de búsqueda de ubicaciones */}
      <div className="p-4 border-b">
        <DropdownSearch onSelect={handleDropdownSelect} />
      </div>

      {/* Mapa */}
      <div className="flex-1 relative">
        <MapContainer 
          center={position} 
          zoom={15} 
          style={{ height: '100%', width: '100%' }}
          whenReady={() => {}}
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