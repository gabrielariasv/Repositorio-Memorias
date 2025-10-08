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
      chargerType: type,
      powerOutput: power,
      location: {type: "Point", coordinates:[position[0], position[1]] },
      status: 'available'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center">
        <i className="fas fa-plus-circle mr-3 text-blue-500"></i> 
        Agregar Nuevo Cargador
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
            <i className="fas fa-tag mr-2"></i> Nombre
          </label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ej: Cargador Principal"
            required 
          />
        </div>
        
        <div>
          <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
            <i className="fas fa-plug mr-2"></i> Tipo de Cargador
          </label>
          <select 
            value={type} 
            onChange={(e) => setType(e.target.value as ChargerType)}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {Object.values(ChargerType).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
            <i className="fas fa-bolt mr-2"></i> Potencia (kW)
          </label>
          <div className="relative">
            <input 
              type="number" 
              value={power} 
              onChange={(e) => setPower(Number(e.target.value))}
              min="3"
              max="350"
              className="w-full p-3 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required 
            />
            <span className="absolute left-3 top-3 text-gray-500">kW</span>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
          <i className="fas fa-map-marker-alt mr-2"></i> Ubicación
        </label>
        <div className="rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
          <MapPicker 
            initialPosition={position} 
            onLocationSelect={setPosition} 
          />
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-end gap-3">
        <button 
          type="button" 
          onClick={onCancel}
          className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
        >
          <i className="fas fa-times mr-2"></i> Cancelar
        </button>
        <button 
          type="submit" 
          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg hover:from-blue-700 hover:to-indigo-800 shadow-md transition-all flex items-center justify-center"
        >
          <i className="fas fa-save mr-2"></i> Guardar Cargador
        </button>
      </div>
    </form>
  );
}