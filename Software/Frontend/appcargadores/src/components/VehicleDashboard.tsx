import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ChargerOptionsModal from './ChargerOptionsModal';
import ConfirmCancelModal from './ConfirmCancelModal';
import ChargerMap, { ChargerMapHandle, FlyToOptions } from './ChargerMap';
import { getTravelTimeORS } from '../utils/getTravelTimeORS';
import { useAuth } from '../contexts/useAuth';
import { useEvVehicle } from '../contexts/useEvVehicle';
import MyFavourites from './MyFavourites';

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
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const evVehicleContext = useEvVehicle();

  const [allChargers, setAllChargers] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [chargingHistory, setChargingHistory] = useState<ChargingSession[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showAllReservations, setShowAllReservations] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'reservations' | 'favourites'>('reservations');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [favoriteRefreshKey, setFavoriteRefreshKey] = useState(0);
  const mapRef = useRef<ChargerMapHandle>(null);
  const optionsPanelRef = useRef<HTMLDivElement | null>(null);
  const isHistoryView = location.pathname === '/charging-history';

  // Obtener todos los cargadores para el mapa
  useEffect(() => {
    const fetchNearbyChargers = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chargers/nearby?latitude=-33.4489&longitude=-70.6693&maxDistance=1000000`);
        if (!response.ok) {
          throw new Error('No se pudieron obtener los cargadores cercanos');
        }
        const data = await response.json();
        setAllChargers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching chargers:', error);
        setAllChargers([]);
      }
    };

    fetchNearbyChargers();
  }, []);

  // Obtener ubicación del usuario (geolocalización)
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setUserLocation({ lat: -33.4489, lng: -70.6693 });
      return;
    }

    const handleSuccess = (pos: GeolocationPosition) => {
      setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    };

    const handleError = () => {
      setUserLocation({ lat: -33.4489, lng: -70.6693 });
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError);
  }, []);

  const fetchReservations = useCallback(async (vehicleId: string) => {
    setLoadingReservations(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/vehicles/${vehicleId}/actual`);
      if (!response.ok) {
        throw new Error('No se pudieron obtener las reservas');
      }
      const data = await response.json();
      setReservations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      setReservations([]);
    } finally {
      setLoadingReservations(false);
    }
  }, []);

  const fetchChargingHistory = useCallback(async (vehicleId: string) => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/vehicles/${vehicleId}/charging-history`);
      if (!response.ok) {
        throw new Error('No se pudo obtener el historial de carga');
      }
      const data = await response.json();
      setChargingHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching charging history:', error);
      setChargingHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const handleReserveCharger = useCallback((chargerId: string) => {
    navigate(`/chargers/${chargerId}/reserve`);
  }, [navigate]);
 

  useEffect(() => {
    if (!evVehicleContext?.selectedVehicle?._id) {
      setReservations([]);
      setChargingHistory([]);
      return;
    }

    fetchReservations(evVehicleContext.selectedVehicle._id);
    fetchChargingHistory(evVehicleContext.selectedVehicle._id);
  }, [evVehicleContext?.selectedVehicle?._id, fetchReservations, fetchChargingHistory]);

  const vehicles = evVehicleContext?.vehicles ?? [];
  const selectedVehicle = evVehicleContext?.selectedVehicle ?? null;
  const vehiclesLoading = evVehicleContext?.loading ?? false;
  const vehiclesError = evVehicleContext?.error ?? null;

  const handleConfirmCancel = useCallback(async (reason: 'indisponibilidad' | 'mantenimiento' | 'falta_tiempo' | 'otro') => {
    if (!cancelTargetId) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/reservations/${cancelTargetId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ reason })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        alert(err.error || 'No se pudo cancelar la reserva');
        return;
      }
      // cerrar modal y refrescar reservas
      setCancelModalOpen(false);
      setCancelTargetId(null);
      if (selectedVehicle?._id) {
        fetchReservations(selectedVehicle._id);
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      alert('Ocurrió un error al cancelar la reserva');
    }
  }, [cancelTargetId, fetchReservations, selectedVehicle]);

  const mappedChargers = useMemo(() =>
    allChargers.map((charger) => ({
      ...charger,
      power: typeof (charger.power ?? charger.powerOutput) === 'number'
        ? Number((charger.power ?? charger.powerOutput).toFixed(2))
        : charger.power ?? charger.powerOutput,
      location: {
        ...charger.location,
        lat: charger.location?.coordinates?.[1] ?? charger.location?.lat ?? 0,
        lng: charger.location?.coordinates?.[0] ?? charger.location?.lng ?? 0,
      },
    })),
  [allChargers]);

  const handleCenterOnMap = useCallback(async (options: FlyToOptions | null) => {
    if (!options) {
      return;
    }
    if (mapRef.current) {
      mapRef.current.flyTo({ lat: options.lat, lng: options.lng, zoom: options.zoom ?? 17 });
    }

    if (userLocation) {
      const apiKey = import.meta.env.VITE_ORS_API_KEY;
      if (apiKey) {
        const duration = await getTravelTimeORS({ origin: userLocation, destination: { lat: options.lat, lng: options.lng }, apiKey });
        if (duration) {
          console.log(`Tiempo estimado en auto (ORS): ${duration}`);
        } else {
          console.log('No se pudo obtener el tiempo estimado de viaje');
        }
      } else {
        console.log('No hay API key de OpenRouteService configurada');
      }
    }
  }, [userLocation]);

  // callback para recibir actualización de favoritos desde ChargerMap
  const handleFavoritesChange = useCallback(() => {
    // incrementar la key para forzar refresh en MyFavourites
    setFavoriteRefreshKey(k => k + 1);
  }, []);

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

  const renderReservationCards = () => {
    if (!selectedVehicle) {
      return (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
          Selecciona un vehículo desde el menú lateral para planificar nuevas reservas.
        </div>
      );
    }

    if (loadingReservations) {
      return (
        <div className="flex min-h-[120px] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      );
    }
    // Excluir reservas canceladas de la lista de "Próximas reservas"
    const upcomingReservations = reservations.filter(r => String(r.status).toLowerCase() !== 'cancelled');

    if (!upcomingReservations.length) {
      return <p className="text-gray-600 dark:text-gray-300">No hay reservas actuales para este vehículo.</p>;
    }

    return (
      <div className="flex flex-col gap-4">
        {upcomingReservations.slice(0, 4).map((res) => {
          const start = new Date(res.startTime);
          const end = new Date(res.endTime);
          const now = new Date();
          const day = start.toLocaleDateString('es-CL', { weekday: 'short' });
          const date = start.getDate();
          const month = start.toLocaleString('es-CL', { month: 'short' });

          const durationMs = end.getTime() - start.getTime();
          const durationH = Math.floor(durationMs / (1000 * 60 * 60));
          const durationM = Math.floor((durationMs / (1000 * 60)) % 60);
          const durationStr = durationH > 0 ? `${durationH}h${durationM > 0 ? ` ${durationM}m` : ''}` : `${durationM}m`;
          const enCurso = start <= now && now < end;

          const chargerMatch = mappedChargers.find((charger) =>
            (charger._id && charger._id === (res.chargerId as any)?._id) || charger.name === res.chargerId?.name
          );

          const chargerLocation = chargerMatch
            ? { lat: chargerMatch.location.lat, lng: chargerMatch.location.lng }
            : null;

          return (
            <div key={res._id} className="flex items-center rounded-lg bg-indigo-50 p-5 shadow-sm dark:bg-indigo-900/60">
              <div className="mr-4 flex w-14 flex-col items-center justify-center">
                <span className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-300">{day}</span>
                <span className="text-2xl font-bold leading-none text-indigo-700 dark:text-indigo-100">{date}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{month}</span>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-800 dark:text-gray-100">{res.chargerId?.name ?? 'Cargador desconocido'}</div>
                <div className="text-sm text-gray-500 dark:text-gray-300">Carga de Vehículo Tipo {selectedVehicle.chargerType || '-'}</div>
                {enCurso && (
                  <div className="mt-2 inline-block rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-800 dark:text-green-200">
                    En curso
                  </div>
                )}
              </div>
              <div className="flex min-w-[150px] flex-col items-end gap-1 text-right">
                <div className="font-semibold text-gray-800 dark:text-gray-100">
                  {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-300">Duración estimada: {durationStr}</div>
                {chargerLocation && (
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      className="rounded bg-indigo-200 px-2 py-1 text-xs text-indigo-800 transition hover:bg-indigo-300 dark:bg-indigo-700 dark:text-indigo-100 dark:hover:bg-indigo-600"
                      onClick={() => handleCenterOnMap({ ...chargerLocation, zoom: 17 })}
                    >
                      Centrar en mapa
                    </button>
                    <button
                      className="rounded bg-red-500 px-2 py-1 text-xs font-medium text-white transition hover:bg-red-600"
                      onClick={() => {
                        setCancelTargetId(res._id);
                        setCancelModalOpen(true);
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderHistory = () => {
    if (!selectedVehicle) {
      return (
        <p className="text-center text-gray-600 dark:text-gray-300">
          Selecciona un vehículo desde el menú lateral para revisar su historial de carga.
        </p>
      );
    }

    if (loadingHistory) {
      return (
        <div className="flex min-h-[120px] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-indigo-600"></div>
        </div>
      );
    }

    if (!chargingHistory.length) {
      return <p className="text-gray-600 dark:text-gray-300">No hay historial de carga para este vehículo.</p>;
    }

    return (
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
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-gray-100 dark:bg-gray-900">
      <main className="flex-1 overflow-y-auto p-6 md:p-12">
        <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {vehiclesError && (
            <div className="md:col-span-3 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-500 dark:bg-red-900/40 dark:text-red-200">
              {vehiclesError}
            </div>
          )}

          {!isHistoryView && (
            <>
              <div className="space-y-6">
                <section className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
                  <h1 className="mb-3 text-3xl font-bold text-gray-800 dark:text-gray-100">¡Buenos días! ¿Dónde quieres cargar?</h1>
                  <p className="mb-6 text-gray-600 dark:text-gray-300">Planifica otra carga como encuentres necesario.</p>
                  {/* Modal/Panel de opciones renderizado aquí, justo debajo del mensaje de bienvenida */}
                  <div ref={optionsPanelRef} className="rounded-lg bg-white dark:bg-gray-800 p-0 mt-4">
                    <ChargerOptionsModal
                      onClose={() => { /* inline: no-op */ }}
                      user={user}
                      selectedVehicle={selectedVehicle}
                      fetchReservations={fetchReservations}
                      onReserveCharger={handleReserveCharger}
                      onCenterCharger={handleCenterOnMap}
                      userLocation={userLocation}
                    />
                  </div>
                </section>

                <section className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
                  <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-100">Mapa de cargadores</h2>
                  <div className="h-72 md:h-80 rounded overflow-hidden">
                    <ChargerMap
                      ref={mapRef}
                      chargers={mappedChargers}
                      userLocation={userLocation}
                      onReserveCharger={handleReserveCharger}
                      currentUser={user}
                      onFavoritesChange={handleFavoritesChange}
                    />
                  </div>
                </section>
              </div>

              <div className="h-full">
                <section className="rounded-lg bg-white p-6 shadow dark:bg-gray-800 h-full flex flex-col">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedTab('reservations')}
                        className={`px-3 py-1 rounded ${selectedTab === 'reservations' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                      >
                        Próximas reservas
                      </button>
                      <button
                        onClick={() => setSelectedTab('favourites')}
                        className={`px-3 py-1 rounded ${selectedTab === 'favourites' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                      >
                        Mis Favoritos
                      </button>
                    </div>
                    {selectedTab === 'reservations' && reservations.length > 0 && (
                      <button
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200"
                        onClick={() => setShowAllReservations(true)}
                      >
                        Ver todas
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {selectedTab === 'reservations' && renderReservationCards()}
                    {selectedTab === 'favourites' && user?._id && (
                      <div className="p-2">
                        <MyFavourites userId={user._id} onGoToReserve={handleReserveCharger} refreshKey={favoriteRefreshKey} />
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </>
          )}

          {isHistoryView && (
            <section className="md:col-span-3 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
              <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-100">Historial de carga</h2>
              {renderHistory()}
            </section>
          )}

          {vehicles.length > 0 && !selectedVehicle && (
            <div className="md:col-span-3 rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
              Selecciona un vehículo desde el menú lateral para ver tus reservas e historial.
            </div>
          )}
        </div>
      </main>

      {showAllReservations && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
          <div className="relative w-full max-w-[82vw] rounded-lg bg-white p-8 shadow-xl dark:bg-gray-900">
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
                    {reservations.map((res) => (
                      <tr key={res._id}>
                        <td className="whitespace-nowrap px-6 py-4">{new Date(res.startTime).toLocaleString()}</td>
                        <td className="whitespace-nowrap px-6 py-4">{new Date(res.endTime).toLocaleString()}</td>
                        <td className="whitespace-nowrap px-6 py-4">{res.chargerId?.name ?? '-'}</td>
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
      <ConfirmCancelModal
        isOpen={cancelModalOpen}
        onClose={() => { setCancelModalOpen(false); setCancelTargetId(null); }}
        onConfirm={handleConfirmCancel}
        title="Confirmar cancelación de reserva"
      />
    </div>
  );
};

export default VehicleDashboard;