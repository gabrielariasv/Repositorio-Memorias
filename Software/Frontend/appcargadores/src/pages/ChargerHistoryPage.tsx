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
    return <div className="alert alert-error">No se especificó el cargador.</div>;
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="section-header">
          <div>
            <h1>Historial de Carga del Cargador</h1>
            <p className="text-muted text-sm sm:text-base">
              {charger?.name ? `${charger.name} · ${charger.chargerType ?? 'Tipo desconocido'}` : `ID: ${chargerId}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate('/')}
              className="btn btn-outline"
            >
              Volver a cargadores
            </button>
          </div>
        </header>

        {error && (
          <div className="alert alert-error">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="spinner"></div>
          </div>
        ) : !sessions.length ? (
          <div className="card text-center text-muted">
            No se encontraron sesiones de carga para este cargador.
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card">
                <div className="flex items-center gap-3 mb-2 text-blue-500">
                  <i className="fas fa-bolt text-2xl"></i>
                  <span className="text-sm font-semibold">Energía entregada</span>
                </div>
                <p className="text-2xl font-bold">
                  {computedStats.totalEnergy.toFixed(2)} kWh
                </p>
              </div>
              <div className="card">
                <div className="flex items-center gap-3 mb-2 text-green-500">
                  <i className="fas fa-charging-station text-2xl"></i>
                  <span className="text-sm font-semibold">Sesiones registradas</span>
                </div>
                <p className="text-2xl font-bold">
                  {computedStats.totalSessions}
                </p>
              </div>
              <div className="card">
                <div className="flex items-center gap-3 mb-2 text-yellow-500">
                  <i className="fas fa-clock text-2xl"></i>
                  <span className="text-sm font-semibold">Duración promedio</span>
                </div>
                <p className="text-2xl font-bold">
                  {(computedStats.avgDuration / 60).toFixed(1)} h
                </p>
              </div>
            </section>

            <section className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-lg font-semibold">Sesiones de carga</h2>
              </div>
              <div className="overflow-x-auto">
                <div className="max-h-[480px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                    <thead className="thead">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-secondary uppercase tracking-wider">Fecha</th>
                        <th className="px-4 py-3 text-left font-medium text-secondary uppercase tracking-wider">Hora</th>
                        <th className="px-4 py-3 text-left font-medium text-secondary uppercase tracking-wider">Vehículo</th>
                        <th className="px-4 py-3 text-left font-medium text-secondary uppercase tracking-wider">Energía (kWh)</th>
                        <th className="px-4 py-3 text-left font-medium text-secondary uppercase tracking-wider">Duración</th>
                      </tr>
                    </thead>
                    <tbody className="tbody-default">
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
                            <td className="px-4 py-3 whitespace-nowrap text-secondary">
                              {`${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-secondary">
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
