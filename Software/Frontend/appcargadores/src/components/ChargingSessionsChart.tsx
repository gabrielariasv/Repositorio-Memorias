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
import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);
ChartJS.register(zoomPlugin);

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
  const [chartKey, setChartKey] = useState(0);
  const [sessions, setSessions] = useState<ChargingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessionsData = async () => {
      try {
        setLoading(true);
        let url = '';
        
        if (chargerId) {
          url = `${import.meta.env.VITE_API_URL}/api/chargers/${chargerId}/usage-history`;
        } else if (vehicleId) {
          url = `${import.meta.env.VITE_API_URL}/api/vehicles/${vehicleId}/charging-history`;
        } else {
          throw new Error('Se requiere chargerId o vehicleId');
        }
        
        const token = localStorage.getItem('token');
        const response = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined
        });
        
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Error al cargar datos de sesiones: ${response.status} ${text}`);
        }
        
        const sessionsData = await response.json();
        // Asegurarnos que tenemos objetos Date y ordenar ascendente por startTime
        const normalized: ChargingSession[] = sessionsData
          .map((session: any) => ({
            ...session,
            startTime: new Date(session.startTime),
            endTime: new Date(session.endTime)
          }))
          .sort((a: ChargingSession, b: ChargingSession) => a.startTime.getTime() - b.startTime.getTime());

        setSessions(normalized);
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

  /**
   * Procesamiento de datos para Chart.js
   * 
   * Objetivo: Agrupar sesiones de carga por día y calcular energía total entregada.
   * 
   * Pasos:
   * 1. Iterar sesiones y extraer fecha en formato 'YYYY-MM-DD' (ISO slice)
   * 2. Acumular energyDelivered por cada fecha única
   * 3. Ordenar fechas ascendentemente (orden lexicográfico funciona con YYYY-MM-DD)
   * 4. Crear labels legibles con toLocaleDateString()
   * 
   * Razón del formato YYYY-MM-DD:
   * - Ordenable como string sin parsear fechas
   * - Compatible con múltiples zonas horarias
   * - Evita duplicados por diferencias de hora
   */
  const energyByDay: { [key: string]: number } = {};
  sessions.forEach(session => {
    const key = session.startTime.toISOString().slice(0, 10); // 'YYYY-MM-DD'
    energyByDay[key] = (energyByDay[key] || 0) + (session.energyDelivered || 0);
  });

  // ordenar fechas ascendentemente
  const sortedDates = Object.keys(energyByDay).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const chartData = {
    labels: sortedDates.map(d => {
      // Mostrar formato local amigable en labels
      return new Date(d).toLocaleDateString();
    }),
    datasets: [
      {
        label: 'Energía (kWh)',
        data: sortedDates.map(d => energyByDay[d]),
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 3,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 14,
          weight: 'bold' as const
        },
        padding: 10
      },
      /**
       * Configuración de zoom/pan para UX optimizada
       * 
       * Características:
       * - limits: Previene zoom/pan más allá de los datos
       *   - min: 0 (primer dato)
       *   - max: sortedDates.length - 1 (último dato)
       *   - minRange: 2 (siempre mostrar al menos 2 barras)
       * 
       * - zoom: Rueda del mouse y pinch en touch
       *   - mode: 'x' (solo zoom horizontal, no vertical)
       * 
       * - pan: Arrastrar para desplazar
       *   - threshold: 10px (evita clicks accidentales como pan)
       * 
       * Optimización móvil:
       * - touch-manipulation CSS class (en contenedor)
       * - touchAction: 'pan-x pinch-zoom' (permite gestos nativos)
       */
      zoom: {
        limits: {
          x: { min: 0, max: sortedDates.length - 1, minRange: 2 }
        },
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: 'x' as const
        },
        pan: {
          enabled: true,
          mode: 'x' as const,
          threshold: 10
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Energía (kWh)',
          font: {
            size: 12
          }
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Fecha',
          font: {
            size: 12
          }
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          autoSkip: true,
          autoSkipPadding: 10,
          font: {
            size: 10
          }
        }
      }
    }
  };

  const handleResetZoom = () => {
    // react-chartjs-2 expone la instancia del gráfico vía ref si es necesario; lo más simple es confiar en el reinicio del plugin mediante re-renderizado
    // como una UX rápida, forzar un cambio de key para remontar el gráfico
    setChartKey((prevKey) => prevKey + 1);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 mb-6">
      <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">
          {title}
        </h2>
        <button
          type="button"
          onClick={handleResetZoom}
          className="rounded-md bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200 active:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:active:bg-gray-500 touch-manipulation"
        >
          Restablecer zoom
        </button>
      </div>
      <div className="relative" style={{ minHeight: '300px', touchAction: 'pan-x pinch-zoom' }}>
        <Bar key={chartKey} data={chartData} options={options} />
      </div>
      
      {/* Estadísticas adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
          <div className="text-blue-500 text-2xl mb-2">
            <i className="fas fa-bolt"></i>
          </div>
          <h3 className="font-semibold text-lg mb-1">Energía Total</h3>
          <p className="text-xl font-bold">
            {sessions.reduce((sum, session) => sum + (session.energyDelivered || 0), 0).toFixed(2)} kWh
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
            {(sessions.reduce((sum, session) => sum + (session.duration || 0), 0) / (sessions.length || 1) / 60).toFixed(1)} h
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChargingSessionsChart;
