import React from 'react';
import ThingSpeakChart from '../models/ThingSpeakChart';

const DEFAULT_CHANNEL_ID = '2989160';
const DEFAULT_FIELD_NUMBER = 2;
const DEFAULT_API_KEY = 'FQA7NYG9D8TH79I6';

const ThingSpeakChartPage = () => {
  return (
    <div className="thingspeak-page">
      <header>
        <h1>Visualizador de Datos ThingSpeak</h1>
      </header>
      
      <div className="chart-container">
        <ThingSpeakChart
          channelId={DEFAULT_CHANNEL_ID}
          fieldNumber={DEFAULT_FIELD_NUMBER}
          apiKey={DEFAULT_API_KEY}
          results={100}
          title={`Datos del Canal ${DEFAULT_CHANNEL_ID} - Campo ${DEFAULT_FIELD_NUMBER}`}
        />
      </div>
      
      <footer>
        <p>Powered by ThingSpeak API | React Chart.js</p>
      </footer>
    </div>
  );
};

export default ThingSpeakChartPage;