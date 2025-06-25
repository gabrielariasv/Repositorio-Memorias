import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ThingSpeakFeed {
  created_at: string;
  entry_id: number;
  field1?: string;
  field2?: string;
  field3?: string;
  field4?: string;
  field5?: string;
  field6?: string;
  field7?: string;
  field8?: string;
}

interface ThingSpeakChartProps {
  channelId: string;
  fieldNumber: number;
  apiKey: string;
  results?: number;
  title?: string;
}

const ThingSpeakChart: React.FC<ThingSpeakChartProps> = ({
  channelId,
  fieldNumber,
  apiKey,
  results = 60,
  title = 'Datos de ThingSpeak'
}) => {
  const [chartData, setChartData] = useState<ChartData<'line'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${apiKey}&results=${results}`
        );
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        const data = await response.json();
        const feeds: ThingSpeakFeed[] = data.feeds;
        if (!feeds || feeds.length === 0) {
          throw new Error('No se encontraron datos');
        }
        // Procesar datos para el gráfico
        const labels = feeds.map(feed => 
          new Date(feed.created_at).toLocaleTimeString()
        );
        const fieldKey = `field${fieldNumber}` as keyof ThingSpeakFeed;
        const values = feeds.map(feed => {
          const value = feed[fieldKey];
          return value !== undefined && value !== null ? parseFloat(String(value)) : null;
        });
        const newChartData: ChartData<'line'> = {
          labels,
          datasets: [
            {
              label: `Campo ${fieldNumber}`,
              data: values,
              borderColor: '#3e95cd',
              backgroundColor: 'rgba(62, 149, 205, 0.3)',
              tension: 0.3,
              pointRadius: 3,
              pointBackgroundColor: '#3e95cd',
              fill: true,
            }
          ]
        };
        setChartData(newChartData);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [channelId, fieldNumber, apiKey, results]);

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 16
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Hora'
        },
        ticks: {
          maxTicksLimit: 10
        }
      },
      y: {
        title: {
          display: true,
          text: 'Valor'
        },
        suggestedMin: 0,
        suggestedMax: 100
      }
    },
    interaction: {
      intersect: false,
      mode: 'nearest',
    },
  };

  if (loading) {
    return <div className="loading">Cargando datos...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="thingspeak-chart-container">
      <div style={{ height: '500px', width: '100%' }}>
        {chartData && (
          <Line data={chartData} options={chartOptions} />
        )}
      </div>
      <div className="info">
        <p>Datos del canal: {channelId} | Actualización cada 30 segundos</p>
      </div>
    </div>
  );
};

export default ThingSpeakChart;