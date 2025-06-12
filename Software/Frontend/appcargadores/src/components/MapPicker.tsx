import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css?inline";
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

export default function MapPicker({ initialPosition, onLocationSelect }: MapPickerProps) {
  const [position, setPosition] = useState<[number, number]>(initialPosition);

  useEffect(() => {
    onLocationSelect(position);
  }, [position]);

  return (
    <MapContainer 
      center={position} 
      zoom={13} 
      style={{ height: '400px', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationMarker 
        position={position} 
        onPositionChange={setPosition} 
      />
    </MapContainer>
  );
}