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
    location: { lat: 40.416775, lng: -3.703790 },
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
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    // Escuchar cambios en la preferencia del usuario
    const listener = (e: MediaQueryListEvent) => {
      if (e.matches) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    };
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', listener);
    return () => {
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', listener);
    };
  }, []);

  return (
    <Router>
      <nav className="bg-white shadow p-4 flex gap-4">
        <Link to="/" className="font-bold text-blue-600 hover:underline">Cargadores</Link>
        <Link to="/thingspeak" className="font-bold text-blue-600 hover:underline">Corriente</Link>
        <Link to="/thingspeak-disp" className="font-bold text-blue-600 hover:underline">Ocupación</Link>
      </nav>
      <Routes>
        <Route path="/" element={
          <div className="min-h-screen bg-gray-100">
            {showForm ? (
              <div className="max-w-3xl mx-auto py-8">
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
          </div>
        } />
        <Route path="/thingspeak" element={<TeamSpeakChartPage />} />
        <Route path="/thingspeak-disp" element={<TeamSpeakChartDisp />} />
      </Routes>
    </Router>
  );
}

export default App;