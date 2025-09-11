import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ChartDataset,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface OccupancyData {
  start: Date;
  end: Date;
  occupied: boolean;
}

interface ChargerOccupancyChartProps {
  chargerId: string;
  title?: string;
}

const ChargerOccupancyChart: React.FC<ChargerOccupancyChartProps> = ({ 
  chargerId, 
  title = "Historial de Ocupación" 
}) => {
  const [occupancyData, setOccupancyData] = useState<OccupancyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOccupancyData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/chargers/${chargerId}/usage-history`);
        
        if (!response.ok) {
          throw new Error('Error al cargar datos de ocupación');
        }
        
        const sessions = await response.json();
        
        // Transformar datos de sesiones a datos de ocupación
        const occupancy: OccupancyData[] = sessions.map((session: any) => ({
          start: new Date(session.startTime),
          end: new Date(session.endTime),
          occupied: true
        }));
        
        setOccupancyData(occupancy);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    fetchOccupancyData();
  }, [chargerId]);

  if (loading) {
    return <div className="text-center py-4">Cargando datos de ocupación...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-500">Error: {error}</div>;
  }

  // Preparar datos para el gráfico con tipos correctos
  const chartData = {
    datasets: [
      {
        label: 'Ocupación',
        data: occupancyData.flatMap(record => [
          { x: record.start.getTime(), y: record.occupied ? 1 : 0 },
          { x: record.end.getTime(), y: record.occupied ? 1 : 0 },
        ]),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        stepped: 'before' as const, // Usar 'as const' para el tipo literal
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'day' as const,
        },
        title: {
          display: true,
          text: 'Fecha',
        },
      },
      y: {
        min: 0,
        max: 1.1,
        ticks: {
          stepSize: 1,
          callback: function(value: any) {
            return value === 1 ? 'Ocupado' : 'Disponible';
          },
        },
        title: {
          display: true,
          text: 'Estado',
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: title,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return context.raw.y === 1 ? 'Ocupado' : 'Disponible';
          },
        },
      },
    },
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 mb-6">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          {title}
        </h2>
      </div>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default ChargerOccupancyChart;