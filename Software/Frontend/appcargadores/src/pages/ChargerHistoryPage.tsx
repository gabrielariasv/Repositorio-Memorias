import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

interface ChargerSession {
  _id: string;
  startTime: string;
  endTime: string;
  energyDelivered?: number;
  duration?: number;
  vehicleId?: {
    model?: string;
    plate?: string;
  };
}

interface ChargerInfo {
  _id: string;
  name?: string;
  location?: {
    coordinates?: number[];
  };
  chargerType?: string;
}

export default function ChargerHistoryPage() {
  const { chargerId } = useParams<{ chargerId: string }>();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ChargerSession[]>([]);
  const [charger, setCharger] = useState<ChargerInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!chargerId) {
        setError('No se proporcionó el identificador del cargador.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const baseUrl = import.meta.env.VITE_API_URL;
        const [sessionsResp, chargerResp] = await Promise.all([
          axios.get(`${baseUrl}/api/chargers/${chargerId}/usage-history`),
          axios.get(`${baseUrl}/api/chargers/${chargerId}`)
        ]);

        setSessions(Array.isArray(sessionsResp.data) ? sessionsResp.data : []);
        setCharger(chargerResp.data ?? null);
      } catch (err: any) {
        console.error('Error al cargar historial del cargador:', err);
        setError(err?.response?.data?.message ?? err?.message ?? 'No fue posible cargar el historial.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [chargerId]);

  const computedStats = useMemo(() => {
    if (!sessions.length) {
      return {
        totalEnergy: 0,
        totalSessions: 0,
        avgDuration: 0,
        totalDuration: 0
      };
    }

    const totalEnergy = sessions.reduce((sum, session) => sum + (session.energyDelivered ?? 0), 0);
    const totalDuration = sessions.reduce((sum, session) => sum + (session.duration ?? 0), 0);
    const totalSessions = sessions.length;

    return {
      totalEnergy,
      totalSessions,
      totalDuration,
      avgDuration: totalSessions ? totalDuration / totalSessions : 0
    };
  }, [sessions]);

  if (!chargerId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-red-600 dark:text-red-300">
        No se especificó el cargador.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Historial de Carga del Cargador
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
              {charger?.name ? `${charger.name} · ${charger.chargerType ?? 'Tipo desconocido'}` : `ID: ${chargerId}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100 transition-colors"
            >
              Volver a cargadores
            </button>
          </div>
        </header>

        {error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : !sessions.length ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center text-gray-600 dark:text-gray-300">
            No se encontraron sesiones de carga para este cargador.
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex items-center gap-3 mb-2 text-blue-500">
                  <i className="fas fa-bolt text-2xl"></i>
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Energía entregada</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {computedStats.totalEnergy.toFixed(2)} kWh
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex items-center gap-3 mb-2 text-green-500">
                  <i className="fas fa-charging-station text-2xl"></i>
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Sesiones registradas</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {computedStats.totalSessions}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex items-center gap-3 mb-2 text-yellow-500">
                  <i className="fas fa-clock text-2xl"></i>
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Duración promedio</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {(computedStats.avgDuration / 60).toFixed(1)} h
                </p>
              </div>
            </section>

            <section className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Sesiones de carga</h2>
              </div>
              <div className="overflow-x-auto">
                <div className="max-h-[480px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Hora</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Vehículo</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Energía (kWh)</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Duración</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {sessions.map(session => {
                        const start = new Date(session.startTime);
                        const end = new Date(session.endTime);
                        const durationMinutes = (session.duration ?? (end.getTime() - start.getTime()) / (1000 * 60));
                        const vehicleLabel = session.vehicleId?.model ?? 'Vehículo desconocido';

                        return (
                          <tr key={session._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap text-gray-800 dark:text-gray-200">
                              {start.toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                              {`${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                              {vehicleLabel}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-800 dark:text-gray-200">
                              {(session.energyDelivered ?? 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-gray-800 dark:text-gray-200">
                              {durationMinutes.toFixed(0)} min
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
