// components/ChargingSessionsChart.tsx
import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface ChargingSession {
  startTime: Date;
  endTime: Date;
  energyDelivered: number;
  duration: number;
}

interface ChargingSessionsChartProps {
  chargerId?: string;
  vehicleId?: string;
  title?: string;
}

const ChargingSessionsChart: React.FC<ChargingSessionsChartProps> = ({ 
  chargerId, 
  vehicleId, 
  title = "Historial de Sesiones de Carga" 
}) => {
  const [sessions, setSessions] = useState<ChargingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessionsData = async () => {
      try {
        setLoading(true);
        let url = '';
        
        if (chargerId) {
          url = `/api/chargers/${chargerId}/usage-history`;
        } else if (vehicleId) {
          url = `/api/vehicles/${vehicleId}/charging-history`;
        } else {
          throw new Error('Se requiere chargerId o vehicleId');
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Error al cargar datos de sesiones');
        }
        
        const sessionsData = await response.json();
        setSessions(sessionsData.map((session: any) => ({
          ...session,
          startTime: new Date(session.startTime),
          endTime: new Date(session.endTime)
        })));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchSessionsData();
  }, [chargerId, vehicleId]);

  if (loading) {
    return <div className="text-center py-4">Cargando datos de sesiones...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-500">Error: {error}</div>;
  }

  // Agrupar por día para el gráfico de barras
  const energyByDay: { [key: string]: number } = {};
  
  sessions.forEach(session => {
    const date = new Date(session.startTime).toLocaleDateString();
    if (!energyByDay[date]) {
      energyByDay[date] = 0;
    }
    energyByDay[date] += session.energyDelivered;
  });

  const chartData = {
    labels: Object.keys(energyByDay),
    datasets: [
      {
        label: 'Energía (kWh)',
        data: Object.values(energyByDay),
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: title,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Energía (kWh)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Fecha'
        }
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 mb-6">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          {title}
        </h2>
      </div>
      <Bar data={chartData} options={options} />
      
      {/* Estadísticas adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
          <div className="text-blue-500 text-2xl mb-2">
            <i className="fas fa-bolt"></i>
          </div>
          <h3 className="font-semibold text-lg mb-1">Energía Total</h3>
          <p className="text-xl font-bold">
            {sessions.reduce((sum, session) => sum + session.energyDelivered, 0).toFixed(2)} kWh
          </p>
        </div>
        
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
          <div className="text-green-500 text-2xl mb-2">
            <i className="fas fa-charging-station"></i>
          </div>
          <h3 className="font-semibold text-lg mb-1">Sesiones</h3>
          <p className="text-xl font-bold">{sessions.length}</p>
        </div>
        
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
          <div className="text-yellow-500 text-2xl mb-2">
            <i className="fas fa-clock"></i>
          </div>
          <h3 className="font-semibold text-lg mb-1">Tiempo Promedio</h3>
          <p className="text-xl font-bold">
            {(sessions.reduce((sum, session) => sum + session.duration, 0) / sessions.length / 60).toFixed(1)} h
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChargingSessionsChart;