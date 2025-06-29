// src/App.tsx
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ChargerList from './components/ChargerList'; // Ruta corregida
import ChargerForm from './components/ChargerForm'; // Ruta corregida
import { Charger, ChargerType } from './models/Charger';
import TeamSpeakChartPage from './components/TeamSpeakChartPage';
import TeamSpeakChartDisp from './components/TeamSpeakChartDisp';

function App() {
  const [chargers, setChargers] = useState<Charger[]>([
  {
    _id: "1",
    name: "Cargador Principal",
    type: ChargerType.CCS, // Usa el enum en lugar del string
    power: 150,
    location: { lat: -33.0223262, lng: -71.5514982 },
    status: "available",
    createdAt: new Date()
  }
]);
  
  const [showForm, setShowForm] = useState(false);

  const addCharger = (charger: Omit<Charger, '_id' | 'createdAt'>) => {
    const newCharger: Charger = {
      ...charger,
      _id: Math.random().toString(36).substr(2, 9), // ID temporal
      createdAt: new Date()
    };
    setChargers([...chargers, newCharger]);
    setShowForm(false);
  };

  // Detectar preferencia de color del navegador y aplicar modo oscuro automáticamente
  useEffect(() => {
  const applyDarkMode = (isDark: boolean) => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark-mode');
    }
  };

  // Detectar preferencia inicial
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  applyDarkMode(darkQuery.matches);

  // Escuchar cambios
  const listener = (e: MediaQueryListEvent) => applyDarkMode(e.matches);
  darkQuery.addEventListener('change', listener);

  return () => darkQuery.removeEventListener('change', listener);
}, []);

  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        {/* Navbar mejorado */}
        <nav className="bg-white dark:bg-gray-800 shadow-md py-4 px-4 flex flex-wrap gap-3 justify-center sm:justify-start">
          <Link to="/" className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors px-3 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700">
            <i className="fas fa-charging-station mr-2"></i>Cargadores
          </Link>
          <Link to="/thingspeak" className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors px-3 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700">
            <i className="fas fa-bolt mr-2"></i>Potencia
          </Link>
          <Link to="/thingspeak-disp" className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors px-3 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700">
            <i className="fas fa-car mr-2"></i>Ocupación
          </Link>
        </nav>

        <Routes>
          <Route path="/" element={
            <main className="flex-grow p-4">
              {showForm ? (
                <div className="max-w-3xl mx-auto py-4 sm:py-8">
                  <ChargerForm 
                    onSubmit={addCharger} 
                    onCancel={() => setShowForm(false)} 
                  />
                </div>
              ) : (
                <ChargerList 
                  chargers={chargers} 
                  onAddNew={() => setShowForm(true)} 
                />
              )}
            </main>
          } />
          <Route path="/thingspeak" element={<TeamSpeakChartPage />} />
          <Route path="/thingspeak-disp" element={<TeamSpeakChartDisp />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;