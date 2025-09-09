// components/Dashboard.tsx
import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/useAuth';
import ChargerList from './ChargerList';
import ChargerForm from './ChargerForm';
import VehicleDashboard from './VehicleDashboard';
import { Charger, ChargerType } from '../models/Charger';
import ThingSpeakChartPage from './ThingSpeakChartPage';
import ThingSpeakChartDisp from './ThingSpeakChartDisp';
import CalendarPage from '../pages/CalendarPage';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

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
          <Route path="/calendar" element={<CalendarPage />} />
          {/* Otras rutas para admin */}
        </Routes>
      </div>
    </Router>
  );
};

// Dashboard para administradores de estaciones
const StationAdminDashboard: React.FC = () => {
  const { user } = useAuth();
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
      if ((user as any)?.token) headers['Authorization'] = `Bearer ${(user as any).token}`;
      if ((user as any)?.accessToken) headers['Authorization'] = `Bearer ${(user as any).accessToken}`;

      const params: Record<string, any> = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.chargerType = typeFilter;

      const resp = await axios.get(baseUrl, { params, headers });
      const data = resp.data;

      if (!Array.isArray(data)) {
        throw new Error('Respuesta inesperada de la API: no vino un array');
      }

      const mapped: Charger[] = data.map(mapApiToLocal);
      setChargers(mapped);
    } catch (err: any) {
      console.error('Error fetchChargers:', err);
      setError(err?.response?.data?.message ?? err.message ?? 'Error al obtener cargadores');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, user]);

  useEffect(() => {
    fetchChargers();
  }, [fetchChargers]);

  const addCharger = async (charger: Omit<Charger, '_id' | 'createdAt'>) => {
    const newCharger: Charger = {
      ...charger,
      _id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date()
    };
    setChargers(prev => [...prev, newCharger]);
    setShowForm(false);
  };

  return (
    <Router>
      <div className="min-h-screen flex flex-col">
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
          <Link to="/calendar" className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors px-3 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700">
            <i className="fas fa-calendar mr-2"></i>Calendario
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
                  <option value="available">available</option>
                  <option value="occupied">occupied</option>
                  <option value="maintenance">maintenance</option>
                </select>

                <select
                  value={typeFilter ?? ''}
                  onChange={(e) => setTypeFilter(e.target.value || undefined)}
                  className="px-2 py-1 border rounded"
                >
                  <option value="">Todos los tipos</option>
                  <option value="CCS">CCS</option>
                  <option value="CHAdeMO">CHAdeMO</option>
                  <option value="Type2">Type2</option>
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
          <Route path="/thingspeak" element={<ThingSpeakChartPage />} />
          <Route path="/thingspeak-disp" element={<ThingSpeakChartDisp />} />
          <Route path="/calendar" element={<CalendarPage />} />
        </Routes>
      </div>
    </Router>
  );
}

// Helper functions (sin cambios)
function extractId(idField: any): string {
  if (!idField) return '';
  if (typeof idField === 'string') return idField;
  if (typeof idField === 'object') {
    if (idField.$oid) return idField.$oid;
    if (idField.toString) return idField.toString();
  }
  return String(idField);
}

function mapApiToLocal(apiCharger: any): Charger {
  const coords = apiCharger.location?.coordinates;
  const lat = Array.isArray(coords) && coords.length >= 2 ? coords[1] : (apiCharger.location?.lat ?? 0);
  const lng = Array.isArray(coords) && coords.length >= 2 ? coords[0] : (apiCharger.location?.lng ?? 0);

  let type: ChargerType;
  if (typeof apiCharger.chargerType === 'string') {
    const key = apiCharger.chargerType as keyof typeof ChargerType;
    type = (ChargerType as any)[key] ?? (apiCharger.chargerType as ChargerType);
  } else {
    type = ChargerType.CCS;
  }

  const id = extractId(apiCharger._id);

  return {
    _id: id,
    name: apiCharger.name ?? apiCharger.originalId ?? `Cargador-${id}`,
    type,
    power: typeof apiCharger.powerOutput === 'number' ? apiCharger.powerOutput : (apiCharger.power ?? 0),
    location: { lat, lng },
    status: apiCharger.status ?? 'unknown',
    createdAt: apiCharger.createdAt ? new Date(apiCharger.createdAt) : new Date()
  } as Charger;
}

export default Dashboard;