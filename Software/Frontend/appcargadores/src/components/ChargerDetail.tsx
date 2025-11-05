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
      <div className="screen-center">
        <div className="spinner-lg"></div>
      </div>
    );
  }

  if (error || !charger) {
    return (
      <div className="screen-center">
        <div className="text-center">
          <h1 className="heading-2">Error</h1>
          <p className="text-secondary">{error || 'Cargador no encontrado'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page">
      <div className="card mb-6">
        <div className="header-row">
          <div>
            <h1 className="title-page">
              <i className="fas fa-charging-station mr-3 text-blue-500"></i>
              {charger.name}
            </h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="badge badge-blue">{charger.chargerType}</span>
              <span className="badge badge-green">{charger.powerOutput} kW</span>
              <span className={`badge ${
                charger.status === 'available' ? 'badge-green' : charger.status === 'occupied' ? 'badge-purple' : 'badge-red'
              }`}>
                {charger.status === 'available' ? 'Disponible' : charger.status === 'occupied' ? 'Ocupado' : 'Mantenimiento'}
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