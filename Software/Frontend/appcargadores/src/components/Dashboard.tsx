import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import VerticalNavbar from './VerticalNavbar';
import ChargerList from './ChargerList';
import ChargerForm from './ChargerForm';
import VehicleDashboard from './VehicleDashboard';
import { Charger } from '../models/Charger';
import ChargingSessionsChart from './ChargingSessionsChart';
import ChargerOccupancyChart from './ChargerOccupancyChart';
import ChargerCalendarPage from '../pages/ChargerCalendarPage';
import ChargerHistoryPage from '../pages/ChargerHistoryPage';
import ProfilePage from '../pages/ProfilePage';
import { EvVehicleProvider } from '../contexts/EvVehicleContext';

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
      return null;
  }
};

const AdminDashboard: React.FC = () => (
  <Router>
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <VerticalNavbar />
      <div className="flex-1 p-6">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white p-10 text-center shadow-xl dark:bg-gray-800">
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
            Panel del administrador general
          </h1>
          <p className="mt-4 text-base text-gray-600 dark:text-gray-300">
            Aquí podrás revisar métricas globales y administrar usuarios en futuras iteraciones.
          </p>
        </div>
      </div>
    </div>
  </Router>
);

const StationAdminDashboard: React.FC = () => {
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchChargers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await axios.get<Charger[]>(`${import.meta.env.VITE_API_URL}/api/chargers`, { headers });
      const data = response.data;

      if (!Array.isArray(data)) {
        throw new Error('Respuesta inesperada: se esperaba un listado de cargadores.');
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
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await axios.post<Charger>(`${import.meta.env.VITE_API_URL}/api/chargers`, chargerData, { headers });
      setChargers(prev => [...prev, response.data]);
      setShowForm(false);
    } catch (err: any) {
      console.error('Error al agregar cargador:', err);
      setError(err?.response?.data?.message ?? err.message ?? 'Error al agregar cargador');
    }
  };

  const handleChargerRenamed = (updated: Charger) => {
    setChargers(prev => prev.map(charger => (charger._id === updated._id ? { ...charger, ...updated } : charger)));
  };

  const ChargerChartsPage: React.FC = () => {
    const { chargerId } = useParams<{ chargerId: string }>();
    const navigate = useNavigate();

    if (!chargerId) {
      return <div className="p-6 text-gray-700 dark:text-gray-200">No se ha seleccionado ningún cargador.</div>;
    }

    return (
      <div className="flex h-full flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Gráficas del Cargador</h2>
          <button
            onClick={() => navigate('/')}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
          >
            Volver a cargadores
          </button>
        </div>
        <div className="grid flex-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow dark:bg-gray-800">
            <ChargerOccupancyChart chargerId={chargerId} />
          </div>
          <div className="rounded-2xl bg-white p-6 shadow dark:bg-gray-800">
            <ChargingSessionsChart chargerId={chargerId} />
          </div>
        </div>
      </div>
    );
  };

  const StationAdminHome: React.FC = () => (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Gestión de Cargadores</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Administra tus estaciones sin desplazamientos adicionales.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => fetchChargers()}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
          >
            Actualizar
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Nuevo cargador
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden rounded-2xl bg-white shadow dark:bg-gray-800">
        <div className="flex h-full min-h-0 flex-col p-6">
          {loading && (
            <div className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-200">
              Cargando cargadores…
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/30 dark:text-red-200">
              {error}
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-hidden">
            {showForm ? (
              <div className="mx-auto flex h-full min-h-0 max-w-3xl flex-col overflow-y-auto">
                <ChargerForm onSubmit={addCharger} onCancel={() => setShowForm(false)} />
              </div>
            ) : (
              <div className="h-full min-h-0 overflow-hidden">
                <ChargerList chargers={chargers} onChargerRename={handleChargerRenamed} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Router>
      <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
        <VerticalNavbar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-hidden px-4 py-6 sm:px-6">
            <div className="mx-auto flex h-full max-w-7xl flex-col">
              <Routes>
                <Route path="/" element={<StationAdminHome />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/chargers/:chargerId/calendar" element={<ChargerCalendarPage />} />
                <Route path="/chargers/:chargerId/charts" element={<ChargerChartsPage />} />
                <Route path="/chargers/:chargerId/history" element={<ChargerHistoryPage />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </Router>
  );
};

const EVUserDashboard: React.FC = () => (
  <Router>
    <EvVehicleProvider>
      <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
        <VerticalNavbar />
        <div className="flex-1 p-6">
          <Routes>
            <Route path="/" element={<VehicleDashboard />} />
            <Route path="/charging-history" element={<VehicleDashboard />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </div>
      </div>
    </EvVehicleProvider>
  </Router>
);

export default Dashboard;