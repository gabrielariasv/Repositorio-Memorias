import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import VerticalNavbar from './VerticalNavbar';
import NotificationBell from './NotificationBell';
import ChargerList from './ChargerList';
import VehicleDashboard from './VehicleDashboard';
import { Charger } from '../models/Charger';
import ChargingSessionsChart from './ChargingSessionsChart';
import ChargerOccupancyChart from './ChargerOccupancyChart';
import ChargerCalendarPage from '../pages/ChargerCalendarPage';
import ChargerHistoryPage from '../pages/ChargerHistoryPage';
import ChargerReservationPage from '../pages/ChargerReservationPage';
import ProfilePage from '../pages/ProfilePage';
import { EvVehicleProvider } from '../contexts/EvVehicleContext';
import AdminDashboard from './AdminDashboard';

// Componente principal: enruta según el rol del usuario autenticado
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

// Dashboard para administradores de estaciones de carga (gestión de cargadores)
const StationAdminDashboard: React.FC = () => {
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleChargerRenamed = (updated: Charger) => {
    setChargers(prev => prev.map(charger => (charger._id === updated._id ? { ...charger, ...updated } : charger)));
  };

  const ChargerChartsPage: React.FC = () => {
    const { chargerId } = useParams<{ chargerId: string }>();
    const navigate = useNavigate();

    if (!chargerId) {
      return <div className="modal__body">No se ha seleccionado ningún cargador.</div>;
    }

    return (
      <div className="flex h-full flex-col gap-6">
        <div className="flex-between-wrap-3">
          <h2 className="heading-page-2xl">Gráficas del Cargador</h2>
          <button
            onClick={() => navigate('/')}
            className="btn btn-secondary"
          >
            Volver a cargadores
          </button>
        </div>
        {/* Siempre vertical (como en móvil) */}
        <div className="grid flex-1 gap-6 grid-cols-1">
          <div className="card">
            <ChargerOccupancyChart chargerId={chargerId} />
          </div>
          <div className="card">
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
          <h1 className="heading-page-3xl">Gestión de Cargadores</h1>
          <p className="text-sm text-secondary">
            Administra tus estaciones sin desplazamientos adicionales.
          </p>
        </div>
        <button
          onClick={() => fetchChargers()}
          className="btn btn-secondary"
        >
          Actualizar
        </button>
      </div>

      <div className="card flex-1 min-h-0 overflow-hidden">
        <div className="flex h-full min-h-0 flex-col">
          {loading && (
            <div className="alert mb-4">Cargando cargadores…</div>
          )}
          {error && (
            <div className="alert alert-error mb-4">{error}</div>
          )}
          <div className="flex-1 min-h-0 overflow-hidden">
            <div className="h-full min-h-0 overflow-hidden">
              <ChargerList chargers={chargers} onChargerRename={handleChargerRenamed} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Router>
      <div className="main-layout">
        <VerticalNavbar />
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* top right header */}
          <div className="header-actions">
            <NotificationBell />
          </div>
          <main className="flex-1 overflow-hidden px-4 py-2 sm:px-6">
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

// Dashboard para usuarios de vehículos eléctricos (reservas, historial, perfil)
const EVUserDashboard: React.FC = () => (
  <Router>
    <EvVehicleProvider>
      <div className="main-layout">
        <VerticalNavbar />
        <div className="flex-1">
          <div className="header-actions">
            <NotificationBell />
          </div>
          <div className="p-6">
          <Routes>
            <Route path="/" element={<VehicleDashboard />} />
            <Route path="/charging-history" element={<VehicleDashboard />} />
            <Route path="/chargers/:chargerId/reserve" element={<ChargerReservationPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
          </div>
        </div>
      </div>
    </EvVehicleProvider>
  </Router>
);

export default Dashboard;