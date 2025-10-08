// pages/ChargerDetail.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ChargerOccupancyChart from '../components/ChargerOccupancyChart';
import ChargingSessionsChart from '../components/ChargingSessionsChart';

interface Charger {
  _id: string;
  name: string;
  chargerType: string;
  powerOutput: number;
  status: string;
  location: {
    coordinates: [number, number];
  };
}

const ChargerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [charger, setCharger] = useState<Charger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChargerData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/chargers/${id}`);
        
        if (!response.ok) {
          throw new Error('Error al cargar datos del cargador');
        }
        
        const chargerData = await response.json();
        setCharger(chargerData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchChargerData();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !charger) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Error</h1>
          <p className="text-gray-600">{error || 'Cargador no encontrado'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
              <i className="fas fa-charging-station mr-3 text-blue-500"></i>
              {charger.name}
            </h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg text-xs font-medium">
                {charger.chargerType}
              </span>
              <span className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1 rounded-lg text-xs font-medium">
                {charger.powerOutput} kW
              </span>
              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                charger.status === 'available' 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                  : charger.status === 'occupied'
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              }`}>
                {charger.status === 'available' ? 'Disponible' : 
                 charger.status === 'occupied' ? 'Ocupado' : 'Mantenimiento'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <ChargerOccupancyChart 
          chargerId={charger._id} 
          title={`Ocupación: ${charger.name}`} 
        />
        
        <ChargingSessionsChart 
          chargerId={charger._id}
          title={`Sesiones de Carga: ${charger.name}`}
        />
      </div>
    </div>
  );
};

export default ChargerDetail;