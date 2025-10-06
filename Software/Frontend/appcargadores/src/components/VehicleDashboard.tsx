import React, { useState, useEffect } from 'react';
import ChargerOptionsModal from './ChargerOptionsModal';
import { useAuth } from '../contexts/useAuth';
import { useLocation } from 'react-router-dom';

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
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [chargingHistory, setChargingHistory] = useState<ChargingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showAllReservations, setShowAllReservations] = useState(false);
  
  const { user } = useAuth();
  const location = useLocation();

  const handleReserveCharger = () => {
    console.log('Reservar un cargador');
  };

  const fetchReservations = async (vehicleId: string) => {
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
  };

  const fetchUserVehicles = React.useCallback(async () => {
    if (!user?._id) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/vehicles/user/${user._id}`);
      const data = await response.json();
      setVehicles(data);
      if (data.length > 0) {
        setSelectedVehicle(data[0]);
        fetchChargingHistory(data[0]._id);
        fetchReservations(data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.vehicles && user.vehicles.length > 0) {
      fetchUserVehicles();
    }
  }, [user, fetchUserVehicles]);

  const fetchChargingHistory = async (vehicleId: string) => {
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
  };

  const handleVehicleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vehicleId = e.target.value;
    const vehicle = vehicles.find(v => v._id === vehicleId);
    if (vehicle) {
      setSelectedVehicle(vehicle);
      fetchChargingHistory(vehicleId);
      fetchReservations(vehicleId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Determinar qué sección mostrar basado en la ruta
  const isReservarSection = location.pathname === '/';
  const isHistorialSection = location.pathname === '/charging-history';

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Vehicle Selector */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <label className="block text-gray-700 dark:text-gray-200 font-semibold mb-2">
            Seleccionar Vehículo
          </label>
          <select
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
            value={selectedVehicle?._id || ''}
            onChange={handleVehicleChange}
          >
            {vehicles.map(vehicle => (
              <option key={vehicle._id} value={vehicle._id}>
                {vehicle.model} - {vehicle.chargerType}
              </option>
            ))}
          </select>
          
          {selectedVehicle && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">Nivel de carga</div>
                <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {selectedVehicle.currentChargeLevel}%
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">Capacidad</div>
                <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {selectedVehicle.batteryCapacity} kWh
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">Modelo</div>
                <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {selectedVehicle.model}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">Tipo de cargador</div>
                <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {selectedVehicle.chargerType}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content based on route */}
        {isReservarSection && (
          <div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-4">
                ¡Buenos días! ¿Dónde quieres cargar?
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Planifica otra carga como encuentres necesario
              </p>
              <button
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded shadow transition-colors duration-200 mb-8"
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

            {/* Próximas reservas */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                  Próximas reservas
                </h2>
                {reservations.length > 2 && (
                  <button
                    className="text-indigo-600 dark:text-indigo-300 text-sm font-semibold hover:underline"
                    onClick={() => setShowAllReservations(true)}
                  >
                    Ver todas
                  </button>
                )}
              </div>
              {loadingReservations ? (
                <div className="flex items-center justify-center min-h-[120px]">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
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
                      <div key={res._id} className="flex items-center bg-indigo-50 dark:bg-indigo-900 rounded-lg p-4 shadow-sm">
                        <div className="flex flex-col items-center justify-center w-14 mr-4">
                          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 uppercase">{day}</span>
                          <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-200 leading-none">{date}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{month}</span>
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800 dark:text-gray-100">{res.chargerId?.name || '-'}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-300">Carga de Vehículo Tipo {selectedVehicle?.chargerType || '-'}</div>
                          {enCurso && (
                            <div className="inline-block bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 text-xs font-semibold px-2 py-1 rounded mt-2">
                              En curso
                            </div>
                          )}
                        </div>
                        <div className="text-right min-w-[150px]">
                          <div className="font-semibold text-gray-800 dark:text-gray-100">
                            {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">Duración estimada: {durationStr}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-300">No hay reservas actuales para este vehículo.</p>
              )}
            </div>
          </div>
        )}

        {isHistorialSection && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
              Historial de Carga
            </h2>
            {loadingHistory ? (
              <div className="flex items-center justify-center min-h-[120px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
              </div>
            ) : chargingHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-cyan-400 dark:scrollbar-track-gray-800">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-gray-800 dark:text-gray-100">
                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cargador</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Energía (kWh)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Duración (min)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chargingHistory.map((session) => (
                        <tr key={session._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {new Date(session.startTime).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {session.chargerId.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {session.energyDelivered.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {session.duration.toFixed(0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-300">No hay historial de carga para este vehículo.</p>
            )}
          </div>
        )}

        {/* Modal para ver todas las reservas */}
        {showAllReservations && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 max-w-[82vw] w-full">
              <button
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-2xl"
                onClick={() => setShowAllReservations(false)}
              >
                &times;
              </button>
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
                Todas las reservas
              </h2>
              <div className="overflow-x-auto">
                <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-cyan-400 dark:scrollbar-track-gray-800">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-gray-800 dark:text-gray-100">
                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha inicio</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha fin</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cargador</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservations.map(res => (
                        <tr key={res._id}>
                          <td className="px-6 py-4 whitespace-nowrap">{new Date(res.startTime).toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{new Date(res.endTime).toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{res.chargerId?.name || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{res.status}</td>
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
    </div>
  );
};

export default VehicleDashboard;