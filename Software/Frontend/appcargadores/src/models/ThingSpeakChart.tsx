import { useState, useEffect } from 'react';
import { Line, Pie } from 'react-chartjs-2';
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
  ChartOptions,
  ArcElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
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
  title?: string;
  isBinary?: boolean;
  showStatusIndicator?: boolean;
  onStatusChange?: (status: string) => void;
}

type TimeRange = 'live' | '24h' | 'week' | 'month' | 'year';

const ThingSpeakChart: React.FC<ThingSpeakChartProps> = ({
  channelId,
  fieldNumber,
  apiKey,
  title = 'Datos de ThingSpeak',
  isBinary = false,
  showStatusIndicator = true,
  onStatusChange
}) => {
  const [chartData, setChartData] = useState<ChartData<'line'> | null>(null);
  const [pieData, setPieData] = useState<ChartData<'pie'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('live');
  const [lastValue, setLastValue] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [occupancyPercentage, setOccupancyPercentage] = useState<number>(0);
  const [currentStatus, setCurrentStatus] = useState<string>('Desconocido');


  const getQueryParams = () => {
    const now = new Date();
    let startDate: Date;
    let interval: string;
    let points: number;

    switch (timeRange) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        interval = '10m';
        points = 144;
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        interval = '1h';
        points = 168;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        interval = '12h';
        points = 60;
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        interval = '1d';
        points = 365;
        break;
      default:
        return `results=100`;
    }

    const start = startDate.toISOString().replace(/\.\d+Z$/, '');
    return `start=${start}&interval=${interval}&timescale=${interval}&average=daily&round=2&sum=sum&median=median&min=min&max=max&points=${points}`;
  };

  useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const queryParams = getQueryParams();
      const url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${apiKey}&${queryParams}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      const feeds: ThingSpeakFeed[] = data.feeds;
      
      if (!feeds || feeds.length === 0) {
        throw new Error('No se encontraron datos');
      }
        
        // Procesar datos para el gráfico
        const labels = feeds.map(feed => {
          const date = new Date(feed.created_at);
          switch (timeRange) {
            case 'live': return date.toLocaleTimeString();
            case '24h': return date.toLocaleTimeString();
            case 'week': return date.toLocaleDateString('es-ES', { weekday: 'short' });
            case 'month': return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
            case 'year': return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
            default: return date.toLocaleTimeString();
          }
        });
        
        const fieldKey = `field${fieldNumber}` as keyof ThingSpeakFeed;
        const values = feeds.map(feed => {
          const value = feed[fieldKey];
          return value !== undefined && value !== null ? parseFloat(String(value)) : null;
        });
        
        // Calcular porcentaje de ocupación (solo para datos binarios)
        if (isBinary) {
        const occupiedCount = values.filter(v => v === 1).length;
        const percentage = (occupiedCount / values.length) * 100;
        setOccupancyPercentage(parseFloat(percentage.toFixed(1)));
        
        // Crear datos para Pie chart
        setPieData({
          labels: ['Ocupado', 'Desocupado'],
          datasets: [
            {
              data: [occupiedCount, values.length - occupiedCount],
              backgroundColor: ['#ef4444', '#16a34a'],
              borderColor: ['#fff', '#fff'],
              borderWidth: 2
            }
          ]
        });
      }
      
      // Guardar último valor
        const lastValue = values[values.length - 1];
        if (lastValue !== null) setLastValue(lastValue);
        setLastUpdate(new Date().toLocaleTimeString());
        
        // Determinar estado actual basado en el último valor
        let newStatus = 'Desconocido';
        if (lastValue !== null) {
          if (isBinary) {
            newStatus = lastValue === 1 ? 'Ocupado' : 'Desocupado';
          } else {
            newStatus = `${lastValue.toFixed(2)} kW`;
          }
        }
        
        // Actualizar estado actual
        setCurrentStatus(newStatus);
        
        // Notificar al componente padre sobre el cambio de estado
        if (onStatusChange) {
          onStatusChange(newStatus);
        }
        
      
      const newChartData: ChartData<'line'> = {
        labels,
        datasets: [
          {
            label: `Campo ${fieldNumber}`,
            data: values,
            borderColor: isBinary ? '#ef4444' : '#3e95cd',
            backgroundColor: isBinary ? 'rgba(239,68,68,0.2)' : 'rgba(62,149,205,0.3)',
            tension: isBinary ? 0 : 0.3,
            stepped: isBinary,
            pointRadius: timeRange === 'live' ? 3 : 2,
            pointBackgroundColor: isBinary ? '#ef4444' : '#3e95cd',
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
  }, [channelId, fieldNumber, apiKey, timeRange, isBinary, onStatusChange]);

  // Opciones específicas para gráfico binario
  const getBinaryOptions = (): ChartOptions<'line'> => {
    return {
      scales: {
        y: {
          min: -0.1,
          max: 1.1,
          ticks: {
            stepSize: 1,
            callback: (value) => {
              if (value === 1) return 'Ocupado';
              if (value === 0) return 'Desocupado';
              return '';
            }
          }
        }
      }
    };
  };

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
        callbacks: {
          label: (context) => {
            if (isBinary) {
              return context.parsed.y === 1 ? 'Ocupado' : 'Desocupado';
            }
            return `${context.dataset.label}: ${context.parsed.y}`;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: timeRange === 'live' || timeRange === '24h' ? 'Hora' : 'Fecha'
        },
        ticks: {
          maxTicksLimit: timeRange === 'year' ? 12 : 10
        }
      },
      y: {
        title: {
          display: true,
          text: 'Valor'
        },
        ...(isBinary ? getBinaryOptions().scales?.y : {})
      }
    },
    interaction: {
      intersect: false,
      mode: 'nearest',
    },
  };

  const pieOptions: ChartOptions<'pie'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${percentage}%`;
          }
        }
      }
    }
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'live': return 'Tiempo Real';
      case '24h': return '24 Horas';
      case 'week': return 'Última Semana';
      case 'month': return 'Último Mes';
      case 'year': return 'Último Año';
      default: return '';
    }
  };

    const StatusIndicator = () => (
    <span className={`ml-3 px-2 py-1 rounded text-sm ${
      isBinary 
        ? currentStatus === 'Ocupado' 
          ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' 
          : currentStatus === 'Desocupado' 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
    }`}>
      {isBinary ? currentStatus : `Último valor: ${currentStatus}`}
    </span>
  );

  return (
    <div className="thingspeak-chart-container">
      <div className="flex flex-wrap justify-between items-center mb-4">
        <div className="text-lg font-medium text-gray-700 dark:text-gray-300">
          {getTimeRangeLabel()}
          {/* Mostrar indicador de estado solo si showStatusIndicator es true */}
          {showStatusIndicator && lastValue !== null && <StatusIndicator />}
        </div>
        
        <div className="flex space-x-1">
          {(['live', '24h', 'week', 'month', 'year'] as TimeRange[]).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded text-sm ${
                timeRange === range
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}
            >
              {range === 'live' ? 'Ahora' : 
               range === '24h' ? '24h' : 
               range === 'week' ? 'Sem' : 
               range === 'month' ? 'Mes' : 'Año'}
            </button>
          ))}
        </div>
      </div>
      
      <div className={`grid gap-4 ${isBinary && pieData ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
      <div 
        className={isBinary && pieData ? "lg:col-span-2" : ""} 
        style={{ height: '500px', width: '100%' }}
      >
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-gray-500 dark:text-gray-400">
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Cargando datos...
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-red-500">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            {error}
          </div>
        ) : (
          chartData && <Line data={chartData} options={chartOptions} />
        )}
      </div>
      
      {isBinary && pieData && (
        <div className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Porcentaje de Ocupación
          </h3>
          <div className="w-full h-64">
            <Pie data={pieData} options={pieOptions} />
          </div>
          <div className="mt-4 text-center">
            <p className="text-3xl font-bold text-gray-800 dark:text-white">
              {occupancyPercentage}%
            </p>
            <p className="text-gray-600 dark:text-gray-400">Tiempo ocupado</p>
          </div>
        </div>
      )}
    </div>
      
      <div className="mt-4 text-right text-sm text-gray-500 dark:text-gray-400">
        Última actualización: {lastUpdate}
      </div>
    </div>
  );
};

export default ThingSpeakChart;