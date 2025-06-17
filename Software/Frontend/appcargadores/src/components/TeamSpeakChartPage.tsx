import React, { useState } from 'react';
import ThingSpeakChart from '../models/ThingSpeakChart';

const ThingSpeakChartPage = () => {
  // Valores por defecto (puedes cambiarlos)
  const [channelId, setChannelId] = useState('2989160');
  const [fieldNumber, setFieldNumber] = useState(1);
  const [apiKey, setApiKey] = useState('LU9ITF5L8SJVJRVP');
  
  return (
    <div className="thingspeak-page">
      <header>
        <h1>Visualizador de Datos ThingSpeak</h1>
        <p>Conecta tus dispositivos IoT y visualiza datos en tiempo real</p>
      </header>
      
      <div className="config-panel">
        <div className="input-group">
          <label>ID del Canal:</label>
          <input
            type="text"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            placeholder="Ej: 1234567"
          />
        </div>
        
        <div className="input-group">
          <label>Número de Campo:</label>
          <select
            value={fieldNumber}
            onChange={(e) => setFieldNumber(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
              <option key={num} value={num}>Campo {num}</option>
            ))}
          </select>
        </div>
        
        <div className="input-group">
          <label>API Key (opcional):</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Para canales privados"
          />
        </div>
      </div>
      
      <div className="chart-container">
        <ThingSpeakChart
          channelId={channelId}
          fieldNumber={fieldNumber}
          apiKey={apiKey}
          results={100}
          title={`Datos del Canal ${channelId} - Campo ${fieldNumber}`}
        />
      </div>
      
      <footer>
        <p>Powered by ThingSpeak API | React Chart.js</p>
      </footer>
    </div>
  );
};

export default ThingSpeakChartPage;