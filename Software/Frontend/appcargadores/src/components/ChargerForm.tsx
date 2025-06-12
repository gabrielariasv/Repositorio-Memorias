// src/components/ChargerForm.tsx
import { useState } from 'react';
import { Charger, ChargerType } from '../models/Charger'; // Ruta corregida
import MapPicker from './MapPicker';

interface ChargerFormProps {
  onSubmit: (charger: Omit<Charger, '_id' | 'createdAt'>) => void;
  onCancel: () => void;
}

export default function ChargerForm({ onSubmit, onCancel }: ChargerFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ChargerType>(ChargerType.TYPE2);
  const [power, setPower] = useState<number>(50);
  const [position, setPosition] = useState<[number, number]>([40.416775, -3.703790]); // Madrid

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      type,
      power,
      location: { lat: position[0], lng: position[1] },
      status: 'available'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Agregar Nuevo Cargador</h2>
      
      <div className="mb-4">
        <label className="block mb-2 font-medium">Nombre</label>
        <input 
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          className="w-full p-2 border rounded"
          required 
        />
      </div>
      
      <div className="mb-4">
        <label className="block mb-2 font-medium">Tipo de Cargador</label>
        <select 
          value={type} 
          onChange={(e) => setType(e.target.value as ChargerType)}
          className="w-full p-2 border rounded"
        >
          {Object.values(ChargerType).map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      
      <div className="mb-4">
        <label className="block mb-2 font-medium">Potencia (kW)</label>
        <input 
          type="number" 
          value={power} 
          onChange={(e) => setPower(Number(e.target.value))}
          min="3"
          max="350"
          className="w-full p-2 border rounded"
          required 
        />
      </div>
      
      <div className="mb-4">
        <label className="block mb-2 font-medium">Ubicación</label>
        <MapPicker 
          initialPosition={position} 
          onLocationSelect={setPosition} 
        />
      </div>
      
      <div className="flex justify-end gap-3">
        <button 
          type="button" 
          onClick={onCancel}
          className="px-4 py-2 border rounded"
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Guardar Cargador
        </button>
      </div>
    </form>
  );
}