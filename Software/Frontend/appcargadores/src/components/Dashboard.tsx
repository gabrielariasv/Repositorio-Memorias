import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/useAuth';
import ChargerList from './ChargerList';
import ChargerForm from './ChargerForm';
import VehicleDashboard from './VehicleDashboard';
import { Charger } from '../models/Charger';
import ChargingSessionsChart from './ChargingSessionsChart';
import ChargerOccupancyChart from './ChargerOccupancyChart';
import ChargerCalendarPage from '../pages/ChargerCalendarPage';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import VerticalNavbar from './VerticalNavbar';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  switch (user.role) {
    case 'app_admin':
      return <AdminDashboard />;
    case 'station_admin':
      return <StationAdminDashboard />;
    case 'ev_user':
      return <EVUserDashboard />;
    default:
      return (
        <div className="p-4">
          <h1 className="text-2xl font-bold">Rol no reconocido</h1>
        </div>
      );
  }
};

const AdminDashboard: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900">
        <VerticalNavbar />
        <div className="flex-1 p-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-4">
            Panel de Administrador General
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Funcionalidad en desarrollo...
          </p>
        </div>
      </div>
    </Router>
  );
};

const StationAdminDashboard: React.FC = () => {
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChargers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const baseUrl = `${import.meta.env.VITE_API_URL}/api/chargers/`;
      const headers: Record<string, string> = {};
      
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const params: Record<string, any> = {};

      const resp = await axios.get(baseUrl, { params, headers });
      const data = resp.data;

      if (!Array.isArray(data)) {
        throw new Error('Respuesta inesperada de la API: no vino un array');
      }

      setChargers(data);
    } catch (err: any) {
      console.error('Error fetchChargers:', err);
      setError(err?.response?.data?.message ?? err.message ?? 'Error al obtener cargadores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChargers();
  }, [fetchChargers]);

  const addCharger = async (chargerData: Omit<Charger, '_id' | 'createdAt'>) => {
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/chargers`, chargerData, { headers });
      setChargers(prev => [...prev, response.data]);
      setShowForm(false);
    } catch (err: any) {
      console.error('Error al agregar cargador:', err);
      setError(err?.response?.data?.message ?? err.message ?? 'Error al agregar cargador');
    }
  };

  const ChargerChartsPage: React.FC = () => {
    const { chargerId } = useParams<{ chargerId: string }>();
    
    if (!chargerId) {
      return <div className="p-4">No se ha seleccionado ningún cargador</div>;
    }
    
    return (
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">Gráficas del Cargador</h2>
        <ChargerOccupancyChart chargerId={chargerId} />
        <ChargingSessionsChart chargerId={chargerId} />
      </div>
    );
  };

  return (
    <Router>
      <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900">
        <VerticalNavbar />
        <div className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 flex justify-between items-center">
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                Gestión de Cargadores
              </h1>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchChargers()}
                  className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 transition-colors"
                >
                  Actualizar
                </button>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/30 dark:hover:bg-blue-800/40 dark:text-blue-200 transition-colors"
                >
                  Nuevo cargador
                </button>
              </div>
            </div>

            <Routes>
              <Route path="/" element={
                <div>
                  {loading && <div className="text-center py-8">Cargando cargadores...</div>}
                  {error && <div className="text-red-600 mb-4">Error: {error}</div>}

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
                </div>
              } />
              <Route path="/charging-history" element={
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
                    Historial de Carga
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    Funcionalidad en desarrollo...
                  </p>
                </div>
              } />
              <Route path="/profile" element={
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
                    Editar Datos de Perfil
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    Funcionalidad en desarrollo...
                  </p>
                </div>
              } />
              <Route path="/chargers/:chargerId/calendar" element={<ChargerCalendarPage />} />
              <Route path="/chargers/:chargerId/charts" element={<ChargerChartsPage />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
};

const EVUserDashboard: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900">
        <VerticalNavbar />
        <div className="flex-1">
          <VehicleDashboard />
        </div>
      </div>
    </Router>
  );
};

export default Dashboard;