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

const ThingSpeakChart = () => {
  const [chartData, setChartData] = useState<ChartData<'line'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Configuración (reemplazar con tus credenciales)
  const CHANNEL_ID = '2989160';
  const API_KEY = 'QGCK40I7LSEH0Y5S';
  const FIELD_NUMBER = 1; // Campo a mostrar (1-8)
  const RESULTS = 60; // Número de puntos a mostrar

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?api_key=${API_KEY}&results=${RESULTS}`
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
        
        const fieldKey = `field${FIELD_NUMBER}` as keyof ThingSpeakFeed;
        const values = feeds.map(feed => {
          const value = feed[fieldKey];
          return value !== undefined && value !== null ? parseFloat(String(value)) : null;
        });
        
        const newChartData: ChartData<'line'> = {
          labels,
          datasets: [
            {
              label: `Campo ${FIELD_NUMBER}`,
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
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Opcional: Actualizar datos periódicamente
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [CHANNEL_ID, API_KEY, FIELD_NUMBER, RESULTS]);

  // Configuración del gráfico
  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `Datos de ThingSpeak - Campo ${FIELD_NUMBER}`,
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
        <p>Datos del canal: {CHANNEL_ID} | Actualización cada 30 segundos</p>
      </div>
    </div>
  );
};

export default ThingSpeakChart;