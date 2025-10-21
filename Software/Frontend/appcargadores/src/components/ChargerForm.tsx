// src/components/ChargerForm.tsx
import { useState } from 'react';
import { Charger, ChargerType, CHARGER_TYPE_LABELS } from '../models/Charger';
import MapPicker from './MapPicker';

interface ChargerFormProps {
  onSubmit: (charger: Omit<Charger, '_id' | 'createdAt'>) => void;
  onCancel: () => void;
}

export default function ChargerForm({ onSubmit, onCancel }: ChargerFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ChargerType>(ChargerType.TYPE2);
  const [power, setPower] = useState<number>(50);
  const [position, setPosition] = useState<[number, number]>([40.416775, -3.703790]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      chargerType: type,
      powerOutput: power,
      location: { type: 'Point', coordinates: [position[1], position[0]] },
      status: 'available'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Agregar Nueva Estación de Carga
      </h2>
      
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">Nombre</label>
        <input 
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          placeholder="Ej: Cargador Principal"
          required 
        />
      </div>
      
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">Tipo de Cargador</label>
        <select 
          value={type} 
          onChange={(e) => setType(e.target.value as ChargerType)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          {Object.values(ChargerType).map(t => (
            <option key={t} value={t}>{CHARGER_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">Potencia (kW)</label>
        <input 
          type="number" 
          value={power} 
          onChange={(e) => setPower(Number(e.target.value))}
          min="3"
          max="350"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          required 
        />
      </div>
      
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">Ubicación</label>
        <div className="rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
          <MapPicker 
            initialPosition={position} 
            onLocationSelect={setPosition} 
          />
        </div>
      </div>
      
      <div className="flex justify-end gap-3 pt-2">
        <button 
          type="button" 
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
        >
          Guardar Estación
        </button>
      </div>
    </form>
  );
}