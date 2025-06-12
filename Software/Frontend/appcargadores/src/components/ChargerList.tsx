// src/components/ChargerList.tsx
import { useState } from 'react';
import { Charger } from '../models/Charger';
import ChargerDetail from './ChargerDetail';

interface ChargerListProps {
  chargers: Charger[];
  onAddNew: () => void;
}

export default function ChargerList({ chargers, onAddNew }: ChargerListProps) {
  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mis Estaciones de Carga</h1>
        <button 
          onClick={onAddNew}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          + Agregar Cargador
        </button>
      </div>

      {chargers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No hay cargadores registrados</p>
          <button 
            onClick={onAddNew}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Agregar Primer Cargador
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chargers.map(charger => (
            <div 
              key={charger._id || charger.name}
              onClick={() => setSelectedCharger(charger)}
              className="border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              <h3 className="text-xl font-semibold mb-2">{charger.name}</h3>
              <p>Tipo: {charger.type}</p>
              <p>Potencia: {charger.power} kW</p>
              <div className="mt-3">
                <span className={`inline-block px-2 py-1 rounded text-xs ${
                  charger.status === 'available' ? 'bg-green-200 text-green-800' :
                  charger.status === 'in-use' ? 'bg-yellow-200 text-yellow-800' :
                  'bg-red-200 text-red-800'
                }`}>
                  {charger.status === 'available' ? 'Disponible' : 
                   charger.status === 'in-use' ? 'En uso' : 'Mantenimiento'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedCharger && (
        <ChargerDetail 
          charger={selectedCharger} 
          onClose={() => setSelectedCharger(null)} 
        />
      )}
    </div>
  );
}