import ThingSpeakChart from '../models/ThingSpeakChart';
import { useState } from 'react';
const DEFAULT_CHANNEL_ID = '2989160';
const DEFAULT_FIELD_NUMBER = 2;
const DEFAULT_API_KEY = 'FQA7NYG9D8TH79I6';

const ThingSpeakChartPage = () => {
  const [currentValue, setCurrentValue] = useState<string>('--');
  return (
    <div className="thingspeak-page p-4 max-w-6xl mx-auto">
      <header className="mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
          <i className="fas fa-chart-line mr-3 text-blue-500"></i>
          Monitoreo de Cargadores IoT
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Datos en tiempo real de corriente eléctrica
        </p>
      </header>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6">
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            Canal #{DEFAULT_CHANNEL_ID} - Campo {DEFAULT_FIELD_NUMBER}
          </h2>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm">
              <i className="fas fa-sync-alt mr-2"></i> Actualizar
            </button>
            <button className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm">
              <i className="fas fa-download mr-2"></i> Exportar
            </button>
          </div>
        </div>
        
        <ThingSpeakChart
          channelId={DEFAULT_CHANNEL_ID}
          fieldNumber={DEFAULT_FIELD_NUMBER}
          apiKey={DEFAULT_API_KEY}
          title="Corriente Eléctrica"
          onStatusChange={setCurrentValue} // Pasamos el setter como prop
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
          <div className="text-blue-500 text-3xl mb-3">
            <i className="fas fa-bolt"></i>
          </div>
          <h3 className="font-semibold text-lg mb-1">Consumo Actual</h3>
          <p className="text-2xl font-bold">
            {currentValue}
          </p>
          <div className="mt-2 flex items-center text-green-500">
            <i className="fas fa-arrow-up mr-1"></i>
            <span>2.3% desde ayer</span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
          <div className="text-green-500 text-3xl mb-3">
            <i className="fas fa-car"></i>
          </div>
          <h3 className="font-semibold text-lg mb-1">Cargadores Activos</h3>
          <p className="text-2xl font-bold">2/2</p>
          <div className="mt-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{width: '67%'}}></div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
          <div className="text-yellow-500 text-3xl mb-3">
            <i className="fas fa-clock"></i>
          </div>
          <h3 className="font-semibold text-lg mb-1">Tiempo Promedio</h3>
          <p className="text-2xl font-bold">42 min</p>
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Por sesión de carga
          </div>
        </div>
      </div>
      
      <footer className="mt-8 text-center text-gray-500 dark:text-gray-400 text-sm">
        <p>Powered by ThingSpeak API | React Chart.js | Última actualización: {new Date().toLocaleTimeString()}</p>
      </footer>
    </div>
  );
};

export default ThingSpeakChartPage;