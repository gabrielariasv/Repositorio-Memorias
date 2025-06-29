// src/components/ChargerDetail.tsx
import { Charger } from '../models/Charger';

interface ChargerDetailProps {
  charger: Charger;
  onClose: () => void;
}

export default function ChargerDetail({ charger, onClose }: ChargerDetailProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">{charger.name}</h2>
        
        <div className="mb-3">
          <strong>Tipo:</strong> {charger.type}
        </div>
        
        <div className="mb-3">
          <strong>Potencia:</strong> {charger.power} kW
        </div>
        
        <div className="mb-3">
          <strong>Ubicación:</strong> 
          <div>Lat: {charger.location.lat.toFixed(6)}</div>
          <div>Lng: {charger.location.lng.toFixed(6)}</div>
        </div>
        
        <div className="mb-3">
          <strong>Estado:</strong> 
          <span className={`ml-2 px-2 py-1 rounded text-sm ${
            charger.status === 'available' ? 'bg-green-200 text-green-800' :
            charger.status === 'in-use' ? 'bg-yellow-200 text-yellow-800' :
            'bg-red-200 text-red-800'
          }`}>
            {charger.status === 'available' ? 'Disponible' : 
             charger.status === 'in-use' ? 'En uso' : 'Mantenimiento'}
          </span>
        </div>
        
        <button 
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}