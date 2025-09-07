import React, { useState } from 'react';
import ThingSpeakChart from '../models/ThingSpeakChart';

const CHANNEL_ID = '2989160';
const FIELD_NUMBER = 1;
const API_KEY = 'QGCK40I7LSEH0Y5S';

const ThingSpeakChartDisp: React.FC = () => {
  const [currentStatus, setCurrentStatus] = useState<string>('Desconocido');
  
  // Reutilizamos el mismo componente de indicador de estado
  const StatusIndicator = () => (
    <span className={`font-bold px-3 py-1 rounded-lg ${
      currentStatus === 'Ocupado' 
        ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20' 
        : currentStatus === 'Desocupado' 
          ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20'
          : 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700'
    }`}>
      {currentStatus}
    </span>
  );

  return (
    <div className="thingspeak-page p-4 max-w-6xl mx-auto">
      <header className="mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
          <i className="fas fa-car mr-3 text-blue-500"></i>
          Ocupación del Cargador
        </h1>
      </header>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6">
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            Canal #{CHANNEL_ID} - Campo {FIELD_NUMBER}
          </h2>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm">
              <i className="fas fa-download mr-2"></i> Exportar
            </button>
          </div>
        </div>
        
        {/* Estado actual unificado usando el mismo componente */}
        <div className="text-center mb-4">
          <span className="font-semibold mr-2">Estado actual:</span>
          <StatusIndicator />
        </div>
        
        <ThingSpeakChart
          channelId={CHANNEL_ID}
          fieldNumber={FIELD_NUMBER}
          apiKey={API_KEY}
          title="Historial de Ocupación"
          isBinary={true}
          showStatusIndicator={false}
          onStatusChange={setCurrentStatus}
        />
      </div>
      
      <footer className="mt-8 text-center text-gray-500 dark:text-gray-400 text-sm">
        <p>Powered by ThingSpeak API | React Chart.js</p>
      </footer>
    </div>
  );
};

export default ThingSpeakChartDisp;