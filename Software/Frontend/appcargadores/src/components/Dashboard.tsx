// components/Dashboard.tsx
import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/useAuth'; // Cambiado a useAuth
import ChargerList from './ChargerList';
import ChargerForm from './ChargerForm';
import VehicleDashboard from './VehicleDashboard';
import { Charger } from '../models/Charger'; // Eliminado ChargerType ya que no se usa
import ChargingSessionsChart from './ChargingSessionsChart';
import ChargerOccupancyChart from './ChargerOccupancyChart';
import ChargerCalendarPage from '../pages/ChargerCalendarPage';
import { BrowserRouter as Router, Routes, Route, Link, useParams } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  // Renderizar dashboard según el rol del usuario
  switch (user.role) {
    case 'app_admin':
      return <AdminDashboard />;
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

// Dashboard para administradores (placeholder)
const AdminDashboard: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <nav className="bg-white dark:bg-gray-800 shadow-md py-4 px-4 flex flex-wrap gap-3 justify-center sm:justify-start">
          <Link to="/calendar" className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors px-3 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700">
            <i className="fas fa-calendar mr-2"></i>Calendario
          </Link>
          {/* Otros enlaces para admin */}
        </nav>
        
        <Routes>
          {/* Otras rutas para admin */}
        </Routes>
      </div>
    </Router>
  );
};

// Dashboard para administradores de estaciones
const StationAdminDashboard: React.FC = () => {
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);

  const fetchChargers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const baseUrl = `${import.meta.env.VITE_API_URL}/api/chargers/`;
      const headers: Record<string, string> = {};
      
      // Obtener el token del localStorage o del contexto de autenticación
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const params: Record<string, any> = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.chargerType = typeFilter;

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
  }, [statusFilter, typeFilter]);

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

  // Componente para mostrar gráficas de un cargador específico
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
      <div className="min-h-screen flex flex-col">
        <nav className="bg-white dark:bg-gray-800 shadow-md py-4 px-4 flex flex-wrap gap-3 justify-center sm:justify-start">
          <Link to="/" className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors px-3 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700">
            <i className="fas fa-charging-station mr-2"></i>Cargadores
          </Link>

          <div className="ml-4 flex items-center gap-2">
            <button
              onClick={() => fetchChargers()}
              className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 transition-colors"
            >
              Actualizar
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="px-3 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/30 dark:hover:bg-blue-800/40 dark:text-blue-200 transition-colors"
            >
              Nuevo cargador
            </button>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={
            <main className="flex-grow p-4">
              <div className="max-w-3xl mx-auto mb-4 flex gap-2 items-center">
                <select
                  value={statusFilter ?? ''}
                  onChange={(e) => setStatusFilter(e.target.value || undefined)}
                  className="px-2 py-1 border rounded"
                >
                  <option value="">Todos los estados</option>
                  <option value="available">Disponible</option>
                  <option value="occupied">Ocupado</option>
                  <option value="maintenance">Mantenimiento</option>
                </select>

                <select
                  value={typeFilter ?? ''}
                  onChange={(e) => setTypeFilter(e.target.value || undefined)}
                  className="px-2 py-1 border rounded"
                >
                  <option value="">Todos los tipos</option>
                  <option value="Type1">Type1</option>
                  <option value="Type2">Type2</option>
                  <option value="CCS">CCS</option>
                  <option value="CHAdeMO">CHAdeMO</option>
                  <option value="Tesla">Tesla</option>
                </select>

                <button onClick={() => fetchChargers()} className="px-2 py-1 border rounded">Filtrar</button>
              </div>

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
            </main>
          } />
          <Route path="/chargers/:chargerId/calendar" element={<ChargerCalendarPage />} />
          <Route path="/chargers/:chargerId/charts" element={<ChargerChartsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default Dashboard;