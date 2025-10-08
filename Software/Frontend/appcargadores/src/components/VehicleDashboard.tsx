import React, { useState, useEffect, useCallback } from 'react';
import ChargerOptionsModal from './ChargerOptionsModal';
import { useAuth } from '../contexts/useAuth';
import { useLocation } from 'react-router-dom';
import { useEvVehicle } from '../contexts/useEvVehicle';

interface Reservation {
  _id: string;
  vehicleId: string;
  chargerId: { name: string };
  startTime: string;
  endTime: string;
  status: string;
}

interface ChargingSession {
  _id: string;
  startTime: string;
  endTime: string;
  energyDelivered: number;
  duration: number;
  chargerId: {
    name: string;
    location: {
      coordinates: number[];
    };
  };
}

const VehicleDashboard: React.FC = () => {
  const [showChargerOptions, setShowChargerOptions] = useState(false);
  const [chargingHistory, setChargingHistory] = useState<ChargingSession[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showAllReservations, setShowAllReservations] = useState(false);
  
  const { user } = useAuth();
  const location = useLocation();
  const evVehicleContext = useEvVehicle();
  const vehicles = evVehicleContext?.vehicles ?? [];
  const selectedVehicle = evVehicleContext?.selectedVehicle ?? null;
  const vehiclesLoading = evVehicleContext?.loading ?? false;
  const vehiclesError = evVehicleContext?.error ?? null;

  const handleReserveCharger = () => {
    console.log('Reservar un cargador');
  };

  const fetchReservations = useCallback(async (vehicleId: string) => {
    setLoadingReservations(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/vehicles/${vehicleId}/actual`);
      const data = await response.json();
      setReservations(data);
    } catch (error) {
      console.error('Error fetching reservations:', error);
    } finally {
      setLoadingReservations(false);
    }
  }, []);

  const fetchChargingHistory = useCallback(async (vehicleId: string) => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/vehicles/${vehicleId}/charging-history`);
      const data = await response.json();
      setChargingHistory(data);
    } catch (error) {
      console.error('Error fetching charging history:', error);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedVehicle?._id) {
      setReservations([]);
      setChargingHistory([]);
      setShowChargerOptions(false);
      return;
    }

    fetchReservations(selectedVehicle._id);
    fetchChargingHistory(selectedVehicle._id);
  }, [selectedVehicle?._id, fetchReservations, fetchChargingHistory]);

  if (!evVehicleContext) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center text-gray-600 dark:text-gray-300">
          No se pudo cargar la información de vehículos. Vuelve a intentarlo más tarde.
        </div>
      </div>
    );
  }

  if (vehiclesLoading) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-indigo-600"></div>
      </div>
    );
  }

  const isReservarSection = location.pathname === '/';
  const isHistorialSection = location.pathname === '/charging-history';

  return (
    <div className="flex h-full min-h-0 flex-col bg-gray-100 dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl space-y-6 p-6">
          {vehiclesError && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-500 dark:bg-red-900/40 dark:text-red-200">
              {vehiclesError}
            </div>
          )}

          {vehicles.length === 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
              No tienes vehículos registrados aún. Añade uno para comenzar a reservar cargadores.
            </div>
          )}

          {vehicles.length > 0 && !selectedVehicle && (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
              Selecciona un vehículo desde el menú lateral para ver tus reservas e historial.
            </div>
          )}

          {isReservarSection && (
            <div>
              {selectedVehicle ? (
                <>
                  <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
                    <h1 className="mb-4 text-3xl font-bold text-gray-800 dark:text-gray-100">
                      ¡Buenos días! ¿Dónde quieres cargar?
                    </h1>
                    <p className="mb-6 text-gray-600 dark:text-gray-300">
                      Planifica otra carga como encuentres necesario
                    </p>
                    <button
                      className="mb-8 rounded bg-indigo-600 py-3 px-8 font-semibold text-white shadow transition-colors duration-200 hover:bg-indigo-700"
                      onClick={() => setShowChargerOptions(true)}
                    >
                      Buscar Cargador
                    </button>
                    {showChargerOptions && (
                      <ChargerOptionsModal
                        onClose={() => setShowChargerOptions(false)}
                        user={user}
                        selectedVehicle={selectedVehicle}
                        fetchReservations={fetchReservations}
                        onReserveCharger={handleReserveCharger}
                      />
                    )}
                  </div>

                  <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Próximas reservas</h2>
                      {reservations.length > 2 && (
                        <button
                          className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-300"
                          onClick={() => setShowAllReservations(true)}
                        >
                          Ver todas
                        </button>
                      )}
                    </div>
                    {loadingReservations ? (
                      <div className="flex min-h-[120px] items-center justify-center">
                        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-indigo-600"></div>
                      </div>
                    ) : reservations.length > 0 ? (
                      <div className="flex flex-col gap-4">
                        {reservations.slice(0, 2).map(res => {
                          const start = new Date(res.startTime);
                          const end = new Date(res.endTime);
                          const now = new Date();
                          const day = start.toLocaleDateString('en-US', { weekday: 'short' });
                          const date = start.getDate();
                          const month = start.toLocaleString('en-US', { month: 'short' });
                          const durationMs = end.getTime() - start.getTime();
                          const durationH = Math.floor(durationMs / (1000 * 60 * 60));
                          const durationM = Math.floor((durationMs / (1000 * 60)) % 60);
                          const durationStr = durationH > 0 ? `${durationH}h${durationM > 0 ? ' ' + durationM + 'm' : ''}` : `${durationM}m`;
                          const enCurso = start <= now && now < end;

                          return (
                            <div key={res._id} className="flex items-center rounded-lg bg-indigo-50 p-4 shadow-sm dark:bg-indigo-900">
                              <div className="mr-4 flex w-14 flex-col items-center justify-center">
                                <span className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-300">{day}</span>
                                <span className="text-2xl font-bold leading-none text-indigo-700 dark:text-indigo-200">{date}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{month}</span>
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold text-gray-800 dark:text-gray-100">{res.chargerId?.name || '-'}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-300">
                                  Carga de Vehículo Tipo {selectedVehicle.chargerType || '-'}
                                </div>
                                {enCurso && (
                                  <div className="mt-2 inline-block rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-800 dark:text-green-200">
                                    En curso
                                  </div>
                                )}
                              </div>
                              <div className="min-w-[150px] text-right">
                                <div className="font-semibold text-gray-800 dark:text-gray-100">
                                  {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="mt-1 text-xs text-gray-500 dark:text-gray-300">Duración estimada: {durationStr}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-600 dark:text-gray-300">No hay reservas actuales para este vehículo.</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  Selecciona un vehículo desde el menú lateral para planificar nuevas reservas.
                </div>
              )}
            </div>
          )}

          {isHistorialSection && (
            <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
              <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-100">Historial de Carga</h2>
              {selectedVehicle ? (
                loadingHistory ? (
                  <div className="flex min-h-[120px] items-center justify-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-indigo-600"></div>
                  </div>
                ) : chargingHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-cyan-400 dark:scrollbar-track-gray-800">
                      <table className="min-w-full divide-y divide-gray-200 text-gray-800 dark:divide-gray-700 dark:text-gray-100">
                        <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Cargador</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Energía (kWh)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Duración (min)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chargingHistory.map((session) => (
                            <tr key={session._id}>
                              <td className="whitespace-nowrap px-6 py-4">{new Date(session.startTime).toLocaleDateString()}</td>
                              <td className="whitespace-nowrap px-6 py-4">{session.chargerId.name}</td>
                              <td className="whitespace-nowrap px-6 py-4">{session.energyDelivered.toFixed(2)}</td>
                              <td className="whitespace-nowrap px-6 py-4">{session.duration.toFixed(0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-300">No hay historial de carga para este vehículo.</p>
                )
              ) : (
                <p className="text-center text-gray-600 dark:text-gray-300">
                  Selecciona un vehículo desde el menú lateral para revisar su historial de carga.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {showAllReservations && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="relative w-full max-w-[82vw] rounded-lg bg-white p-8 shadow-lg dark:bg-gray-900">
            <button
              className="absolute right-4 top-4 text-2xl text-gray-500 transition hover:text-gray-800 dark:hover:text-gray-200"
              onClick={() => setShowAllReservations(false)}
            >
              &times;
            </button>
            <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-100">Todas las reservas</h2>
            <div className="overflow-x-auto">
              <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-cyan-400 dark:scrollbar-track-gray-800">
                <table className="min-w-full divide-y divide-gray-200 text-gray-800 dark:divide-gray-700 dark:text-gray-100">
                  <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Fecha inicio</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Fecha fin</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Cargador</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map(res => (
                      <tr key={res._id}>
                        <td className="whitespace-nowrap px-6 py-4">{new Date(res.startTime).toLocaleString()}</td>
                        <td className="whitespace-nowrap px-6 py-4">{new Date(res.endTime).toLocaleString()}</td>
                        <td className="whitespace-nowrap px-6 py-4">{res.chargerId?.name || '-'}</td>
                        <td className="whitespace-nowrap px-6 py-4">{res.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleDashboard;