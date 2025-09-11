import React, { useState, useEffect } from 'react';
import ChargerOptionsModal from './ChargerOptionsModal';
import { useAuth } from '../contexts/useAuth';
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
  // Opcional: lógica para cada acción
  // La lógica de encontrar y reservar cargador se moverá al modal
  const handleReserveCharger = () => {
    // Aquí va la lógica para "Reservar un cargador"
    console.log('Reservar un cargador');
  };
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [chargingHistory, setChargingHistory] = useState<ChargingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeSection, setActiveSection] = useState<'reservar' | 'reservas' | 'historial'>('reservar');

  const [showAllReservations, setShowAllReservations] = useState(false);

  // Obtener reservas actuales del vehículo
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
      // Obtener vehículos del usuario
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
  {/* Sección Reservas actuales */ }
  {
    activeSection === 'reservas' && (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Reservas actuales</h2>
        {loadingReservations ? (
          <div className="flex items-center justify-center min-h-[120px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            {reservations.filter(r => new Date(r.endTime) > new Date()).length > 0 ? (
              <div className="overflow-x-auto">
                <div className="max-h-96 overflow-y-auto custom-scrollbar" style={{ minWidth: '100%' }}>
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
                      {reservations.filter(r => new Date(r.endTime) > new Date()).map(res => (
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
            ) : (
              <p className="text-gray-600 dark:text-gray-300">No hay reservas actuales para este vehículo.</p>
            )}
          </>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-white dark:bg-gray-800 flex flex-col items-center py-8 px-4 border-r border-gray-200 dark:border-gray-700 min-h-screen">
        {/* Perfil */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-3xl font-bold text-gray-600 dark:text-gray-200 mb-2">
            {user?.name ? user.name[0] : 'U'}
          </div>
          <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">{user?.name}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</div>
        </div>
        {/* Selector de vehículo y datos */}
        <div className="w-full mb-8">
          <label className="block text-gray-700 dark:text-gray-200 font-semibold mb-2">Seleccionar Vehículo</label>
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Información del Vehículo</h2>
              <div className="flex flex-col gap-2">
                <p className="text-gray-800 dark:text-gray-100"><span className="font-semibold">Nivel de carga actual:</span> {selectedVehicle.currentChargeLevel}%</p>
                <p className="text-gray-800 dark:text-gray-100"><span className="font-semibold">Capacidad de batería:</span> {selectedVehicle.batteryCapacity} kWh</p>
                <p className="text-gray-800 dark:text-gray-100"><span className="font-semibold">Modelo:</span> {selectedVehicle.model}</p>
                <p className="text-gray-800 dark:text-gray-100"><span className="font-semibold">Tipo de cargador:</span> {selectedVehicle.chargerType}</p>
              </div>
            </div>
          )}
        </div>
        {/* Navegación */}
        <nav className="flex flex-col gap-2 w-full">
          <button
            className={`w-full py-2 rounded text-left px-4 font-medium transition ${activeSection === 'reservar' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            onClick={() => setActiveSection('reservar')}
          >Reservar</button>
          <button
            className={`w-full py-2 rounded text-left px-4 font-medium transition ${activeSection === 'historial' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            onClick={() => setActiveSection('historial')}
          >Historial de cargas</button>
        </nav>
      </aside>
      {/* Contenido principal */}
      <main className="flex-1 p-6 md:p-12">
        <div className="max-w-4xl mx-auto">
          {activeSection !== 'historial' && (
            <>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-4">¡Buenos días! ¿Dónde quieres cargar?</h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6">Planifica otra carga como encuentres necesario</p>
              <button
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded shadow transition-colors duration-200 mb-8"
                onClick={() => setShowChargerOptions(true)}
              >Buscar Cargador</button>
              {showChargerOptions && (
                <ChargerOptionsModal
                  onClose={() => setShowChargerOptions(false)}
                  user={user}
                  selectedVehicle={selectedVehicle}
                  fetchReservations={fetchReservations}
                  onReserveCharger={handleReserveCharger}
                />
              )}
            </>
          )}
          {/* Sección Reservar y reservas actuales */}
          {activeSection === 'reservar' && (
            <>
              {/* Aquí iría el formulario o botón para reservar cargador */}
              {/* ...otros elementos de la sección reservar... */}
              {/* Tarjetas de próximas reservas */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Próximas reservas</h2>
                  {reservations.length > 2 && (
                    <button
                      className="text-indigo-600 dark:text-indigo-300 text-sm font-semibold hover:underline"
                      onClick={() => setShowAllReservations(true)}
                    >Ver todas</button>
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
                      const day = start.toLocaleDateString('en-US', { weekday: 'short' });
                      const date = start.getDate();
                      const month = start.toLocaleString('en-US', { month: 'short' });
                      // Calcular duración estimada en milisegundos
                      const durationMs = end.getTime() - start.getTime();
                      const durationH = Math.floor(durationMs / (1000 * 60 * 60));
                      const durationM = Math.floor((durationMs / (1000 * 60)) % 60);
                      const durationStr = durationH > 0 ? `${durationH}h${durationM > 0 ? ' ' + durationM + 'm' : ''}` : `${durationM}m`;
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
              {/* Modal o sección para ver todas las reservas en tabla */}
              {showAllReservations && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                  <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8" style={{ maxWidth: '82vw', width: '100%' }}>
                    <button
                      className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-2xl"
                      onClick={() => setShowAllReservations(false)}
                    >&times;</button>
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Todas las reservas</h2>
                    <div className="overflow-x-auto">
                      <div className="max-h-96 overflow-y-auto custom-scrollbar" style={{ minWidth: '100%' }}>
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
            </>
          )}
          {/* Sección Historial */}
          {activeSection === 'historial' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Historial de Carga</h2>
              {loadingHistory ? (
                <div className="flex items-center justify-center min-h-[120px]">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
                </div>
              ) : chargingHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <div
                    className="max-h-96 overflow-y-auto custom-scrollbar"
                    style={{ minWidth: '100%' }}
                  >
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
        </div>
      </main>
    </div>
  );
};

export default VehicleDashboard;