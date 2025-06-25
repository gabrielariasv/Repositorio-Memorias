import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Charger } from '../models/Charger';

const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface ChargerMapProps {
  chargers: Charger[];
}

export default function ChargerMap({ chargers }: ChargerMapProps) {
  if (!chargers.length) return null;
  // Centrar el mapa en el primer cargador
  const center = [chargers[0].location.lat, chargers[0].location.lng];
  return (
    <div style={{ height: 400, width: '100%' }}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {chargers.map((charger) => (
          <Marker
            key={charger._id || charger.name}
            position={[charger.location.lat, charger.location.lng]}
            icon={customIcon}
          >
            <Popup>
              <strong>{charger.name}</strong><br />
              {charger.type} - {charger.power} kW
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
