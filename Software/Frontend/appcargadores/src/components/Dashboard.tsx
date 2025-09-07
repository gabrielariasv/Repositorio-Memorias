import React from 'react';
import { useState} from 'react';
import { useAuth } from '../contexts/useAuth';
import ChargerList from './ChargerList';
import ChargerForm from './ChargerForm';
import VehicleDashboard from './VehicleDashboard';
import { Charger, ChargerType } from '../models/Charger';
import ThingSpeakChartPage from './ThingSpeakChartPage';
import ThingSpeakChartDisp from './ThingSpeakChartDisp';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
//import AdminDashboard from './AdminDashboard';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  // Renderizar dashboard según el rol del usuario
  switch (user.role) {
    case 'app_admin':
      return /*<AdminDashboard />*/;
    case 'station_admin':
      return <StationAdminDashboard />;
    case 'ev_user':
      return <VehicleDashboard />;
    default:
      return (
        <div className="p-4">
          <h1 className="text-2xl font-bold">Rol no reconocido</h1>
        </div>
      );
  }
};

// Dashboard para administradores de estaciones
const StationAdminDashboard: React.FC = () => {
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
          <Route path="/thingspeak" element={<ThingSpeakChartPage />} />
          <Route path="/thingspeak-disp" element={<ThingSpeakChartDisp />} />
        </Routes>
      </div>
    </Router>
  );
}


export default Dashboard;