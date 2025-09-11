// components/ChargerOccupancyChart.tsx
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
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chargers/${chargerId}/usage-history`);
        
        if (!response.ok) {
          const text = await response.text();
          throw new Error('Error al cargar datos de ocupación: ' + text);
        }
        
        const sessions = await response.json();
        
        // Transformar sesiones a occupancyData (ocupado = true)
        const occupancy: OccupancyData[] = sessions
          .map((s: any) => ({
            start: s.startTime ? new Date(s.startTime) : null,
            end: s.endTime ? new Date(s.endTime) : null,
            occupied: true
          }))
          // Filtrar intervalos inválidos
          .filter((it: any) => it.start && it.end)
          // Ordenar asc por start
          .sort((a: OccupancyData, b: OccupancyData) => a.start.getTime() - b.start.getTime());

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

  // Construir puntos escalonados incluyendo gaps marcados como 0 (desocupado)
  const buildSteppedPoints = (intervals: OccupancyData[]) => {
    const points: { x: Date; y: number }[] = [];
    let prevEnd: Date | null = null;

    for (const iv of intervals) {
      if (!iv.start || !iv.end) continue;

      if (!prevEnd) {
        // antes del primer segmento, marcar 0 en el inicio del primer segmento
        points.push({ x: iv.start, y: 0 });
        // subir a 1 en el inicio del segmento
        points.push({ x: iv.start, y: iv.occupied ? 1 : 0 });
        // mantener 1 hasta el end
        points.push({ x: iv.end, y: iv.occupied ? 1 : 0 });
        prevEnd = iv.end;
        continue;
      }

      // si hay gap entre prevEnd y nuevo start -> marcar 0 en prevEnd y en nuevo start
      if (iv.start.getTime() > prevEnd.getTime()) {
        points.push({ x: prevEnd, y: 0 });         // bajar al final del anterior
        points.push({ x: iv.start, y: 0 });        // mantener 0 hasta el nuevo inicio
        points.push({ x: iv.start, y: iv.occupied ? 1 : 0 }); // subir en el inicio
        points.push({ x: iv.end, y: iv.occupied ? 1 : 0 });   // mantener hasta fin
        prevEnd = iv.end;
      } else {
        // superposición o continuidad: ajustar para no retroceder en el tiempo
        const startPoint = new Date(Math.max(iv.start.getTime(), prevEnd.getTime()));
        points.push({ x: startPoint, y: iv.occupied ? 1 : 0 });
        // extender al end si end es mayor
        if (iv.end.getTime() > prevEnd.getTime()) {
          points.push({ x: iv.end, y: iv.occupied ? 1 : 0 });
          prevEnd = iv.end;
        }
      }
    }

    // después del último segmento, bajar a 0 en prevEnd para cerrar la línea
    if (prevEnd) {
      points.push({ x: prevEnd, y: 0 });
    }

    // Asegurarse que los puntos están ordenados cronológicamente
    points.sort((a, b) => a.x.getTime() - b.x.getTime());
    return points;
  };

  const steppedPoints = buildSteppedPoints(occupancyData);

  const chartData = {
    datasets: [
      {
        label: 'Ocupación (1=Ocupado, 0=Disponible)',
        data: steppedPoints,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.25)',
        stepped: 'before' as const,
        fill: true,
        pointRadius: 0,
      } as ChartDataset<'line', { x: Date; y: number }[]>,
    ],
  };

  const options = {
    responsive: true,
    scales: {
      x: {
        type: 'time' as const,
        time: {
          // adapta la unidad según el rango de datos
          tooltipFormat: 'P p'
        },
        title: {
          display: true,
          text: 'Fecha / Hora',
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
