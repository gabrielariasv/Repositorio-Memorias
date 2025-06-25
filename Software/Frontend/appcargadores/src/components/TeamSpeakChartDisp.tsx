import React, { useEffect, useState } from 'react';
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const CHANNEL_ID = '2989160';
const API_KEY = 'QGCK40I7LSEH0Y5S';
const FIELD_NUMBER = 1; // Campo 1 para ocupación
const RESULTS = 60;

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

const TeamSpeakChartDisp: React.FC = () => {
  const [chartData, setChartData] = useState<ChartData<'line'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?api_key=${API_KEY}&results=${RESULTS}`
        );
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        const data = await response.json();
        const feeds: ThingSpeakFeed[] = data.feeds;
        if (!feeds || feeds.length === 0) throw new Error('No se encontraron datos');
        const labels = feeds.map(feed => new Date(feed.created_at).toLocaleTimeString());
        const fieldKey = `field${FIELD_NUMBER}` as keyof ThingSpeakFeed;
        const values = feeds.map(feed => {
          const value = feed[fieldKey];
          return value !== undefined && value !== null ? parseInt(String(value)) : null;
        });
        setLastStatus(values[values.length - 1] ?? null);
        const newChartData: ChartData<'line'> = {
          labels,
          datasets: [
            {
              label: 'Ocupación (0=Desocupado, 1=Ocupado)',
              data: values,
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239,68,68,0.2)',
              stepped: true,
              tension: 0,
              pointRadius: 3,
              pointBackgroundColor: '#ef4444',
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
  }, []);

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: {
        display: true,
        text: 'Historial de Ocupación del Cargador',
        font: { size: 16 }
      },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: { title: { display: true, text: 'Hora' }, ticks: { maxTicksLimit: 10 } },
      y: {
        title: { display: true, text: 'Estado' },
        min: -0.1,
        max: 1.1,
        ticks: {
          stepSize: 1,
          callback: (value) => value === 1 ? 'Ocupado' : 'Desocupado'
        }
      }
    },
    interaction: { intersect: false, mode: 'nearest' },
  };

  return (
    <div className="thingspeak-page">
      <header>
        <h1>Ocupación del Cargador</h1>
      </header>
      <div style={{ margin: '1rem 0', textAlign: 'center' }}>
        Estado actual: {lastStatus === 1 ? (
          <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Ocupado</span>
        ) : lastStatus === 0 ? (
          <span style={{ color: '#16a34a', fontWeight: 'bold' }}>Desocupado</span>
        ) : (
          <span style={{ color: '#888' }}>Desconocido</span>
        )}
      </div>
      <div className="chart-container" style={{ height: 400 }}>
        {loading && <div>Cargando datos...</div>}
        {error && <div style={{ color: 'red' }}>Error: {error}</div>}
        {chartData && <Line data={chartData} options={chartOptions} />}
      </div>
      <footer>
        <p>Powered by ThingSpeak API | React Chart.js</p>
      </footer>
    </div>
  );
};

export default TeamSpeakChartDisp;