import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ChargerOptionsModal from './ChargerOptionsModal';
import ConfirmCancelModal from './ConfirmCancelModal';
import ChargingModal from './ChargingModal';
import ChargerMap, { ChargerMapHandle, FlyToOptions } from './ChargerMap';
import { getTravelTimeORS } from '../utils/getTravelTimeORS';
import { useAuth } from '../contexts/useAuth';
import { useEvVehicle } from '../contexts/useEvVehicle';
import MyFavourites from './MyFavourites';

interface Reservation {
  _id: string;
  vehicleId: string;
  chargerId: { _id?: string; name: string };
  startTime: string;
  endTime: string;
  status: string;
}

interface ActiveChargingSession {
  _id: string;
  reservationId: string;
  chargerId: string;
  status: 'waiting_confirmations' | 'admin_confirmed' | 'user_confirmed' | 'ready_to_start' | 'charging' | 'completed' | 'cancelled';
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
  const [activeSessions, setActiveSessions] = useState<Map<string, ActiveChargingSession>>(new Map());
  const [chargingModalOpen, setChargingModalOpen] = useState(false);
  const [selectedReservationForCharging, setSelectedReservationForCharging] = useState<Reservation | null>(null);
  const mapRef = useRef<ChargerMapHandle>(null);
  const optionsPanelRef = useRef<HTMLDivElement | null>(null);
  const isHistoryView = location.pathname === '/charging-history';

  // Efecto: Obtener todos los cargadores disponibles para mostrar en el mapa
  useEffect(() => {
    const fetchNearbyChargers = async () => {
      try {
        // Llamar API con un radio muy amplio para obtener todos los cargadores
        // Coordenadas de Santiago, Chile como centro de referencia
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

  // Efecto: Obtener ubicación actual del usuario mediante Geolocation API
  useEffect(() => {
    // 1. Verificar disponibilidad de geolocalización en el navegador
    if (!('geolocation' in navigator)) {
      // Alternativa: usar coordenadas de Santiago como predeterminadas
      setUserLocation({ lat: -33.4489, lng: -70.6693 });
      return;
    }

    // 2. Callback exitoso: guardar coordenadas del usuario
    const handleSuccess = (pos: GeolocationPosition) => {
      setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    };

    // 3. Callback de error: usar ubicación default
    const handleError = () => {
      setUserLocation({ lat: -33.4489, lng: -70.6693 });
    };

    // 4. Solicitar ubicación actual
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError);
  }, []);

  // Función: Obtener sesiones de carga activas para las reservas
  const fetchActiveSessionsForReservations = useCallback(async (reservations: Reservation[]) => {
    try {
      const token = localStorage.getItem('token');
      const sessionMap = new Map<string, ActiveChargingSession>();

      // Buscar sesión activa para cada reserva
      await Promise.all(
        reservations.map(async (res) => {
          try {
            const response = await fetch(
              `${import.meta.env.VITE_API_URL}/api/charging-sessions/active/by-reservation/${res._id}`,
              {
                headers: {
                  ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
              }
            );

            if (response.ok) {
              const data = await response.json();
              if (data.session && data.session.status !== 'completed' && data.session.status !== 'cancelled') {
                sessionMap.set(res._id, data.session);
              }
            }
          } catch (err) {
            console.error(`Error fetching session for reservation ${res._id}:`, err);
          }
        })
      );

      setActiveSessions(sessionMap);
    } catch (error) {
      console.error('Error fetching active sessions:', error);
    }
  }, []);

  // Función: Obtener reservas activas del vehículo seleccionado
  const fetchReservations = useCallback(async (vehicleId: string) => {
    setLoadingReservations(true);
    try {
      // Llamar endpoint de reservas actuales/futuras
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/vehicles/${vehicleId}/actual`);
      if (!response.ok) {
        throw new Error('No se pudieron obtener las reservas');
      }
      const data = await response.json();
      setReservations(Array.isArray(data) ? data : []);
      
      // Cargar sesiones activas para cada reserva
      await fetchActiveSessionsForReservations(data);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      setReservations([]);
    } finally {
      setLoadingReservations(false);
    }
  }, [fetchActiveSessionsForReservations]);

  // Función: Obtener historial completo de sesiones de carga
  const fetchChargingHistory = useCallback(async (vehicleId: string) => {
    setLoadingHistory(true);
    try {
      // Llamar endpoint de historial de cargas
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

  // Callback: Navegar a página de reserva de un cargador específico
  const handleReserveCharger = useCallback((chargerId: string) => {
    navigate(`/chargers/${chargerId}/reserve`);
  }, [navigate]);
 
  // Efecto: Recargar datos cuando cambia el vehículo seleccionado
  useEffect(() => {
    // Si no hay vehículo seleccionado, limpiar datos
    if (!evVehicleContext?.selectedVehicle?._id) {
      setReservations([]);
      setChargingHistory([]);
      return;
    }

    // Cargar reservas e historial del vehículo actual
    fetchReservations(evVehicleContext.selectedVehicle._id);
    fetchChargingHistory(evVehicleContext.selectedVehicle._id);
  }, [evVehicleContext?.selectedVehicle?._id, fetchReservations, fetchChargingHistory]);

  // Extraer datos del contexto de vehículos con valores default
  const vehicles = evVehicleContext?.vehicles ?? [];
  const selectedVehicle = evVehicleContext?.selectedVehicle ?? null;
  const vehiclesLoading = evVehicleContext?.loading ?? false;
  const vehiclesError = evVehicleContext?.error ?? null;

  // Callback: Abrir modal de carga para una reserva
  const handleOpenChargingModal = useCallback((reservation: Reservation) => {
    setSelectedReservationForCharging(reservation);
    setChargingModalOpen(true);
  }, []);

  // Callback: Cerrar modal de carga y refrescar datos
  const handleCloseChargingModal = useCallback(() => {
    setChargingModalOpen(false);
    setSelectedReservationForCharging(null);
    
    // Refrescar reservas y sesiones activas
    if (selectedVehicle?._id) {
      fetchReservations(selectedVehicle._id);
    }
  }, [selectedVehicle, fetchReservations]);

  /**
   * Función: Confirmar cancelación de reserva con motivo específico
   * 
   * Proceso:
   * 1. Validar que hay una reserva seleccionada para cancelar
   * 2. Enviar solicitud POST a API con motivo de cancelación
   * 3. Manejar errores y mostrar mensajes al usuario
   * 4. Refrescar lista de reservas tras cancelación exitosa
   */
  const handleConfirmCancel = useCallback(async (reason: 'indisponibilidad' | 'mantenimiento' | 'falta_tiempo' | 'otro') => {
    if (!cancelTargetId) return;
    
    try {
      // 1. Preparar autenticación
      const token = localStorage.getItem('token');
      
      // 2. Enviar solicitud de cancelación con motivo
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/reservations/${cancelTargetId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ reason })
      });
      
      // 3. Manejar errores de la API
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        alert(err.error || 'No se pudo cancelar la reserva');
        return;
      }
      
      // 4. Cerrar modal y refrescar datos
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

  /**
   * Memo: Transformar cargadores a formato consistente para el mapa
   * 
   * Normaliza estructura de datos para compatibilidad con ChargerMap:
   * - Unifica 'power' y 'powerOutput' a un solo campo 'power'
   * - Convierte coordenadas GeoJSON a formato lat/lng
   * - Redondea valores numéricos a 2 decimales
   */
  const mappedChargers = useMemo(() =>
    allChargers.map((charger) => ({
      ...charger,
      // Normalizar campo de potencia
      power: typeof (charger.power ?? charger.powerOutput) === 'number'
        ? Number((charger.power ?? charger.powerOutput).toFixed(2))
        : charger.power ?? charger.powerOutput,
      // Normalizar ubicación: GeoJSON [lng, lat] -> {lat, lng}
      location: {
        ...charger.location,
        lat: charger.location?.coordinates?.[1] ?? charger.location?.lat ?? 0,
        lng: charger.location?.coordinates?.[0] ?? charger.location?.lng ?? 0,
      },
    })),
  [allChargers]);

  /**
   * Callback: Centrar mapa en un cargador y calcular tiempo de viaje
   * 
   * Proceso:
   * 1. Validar que hay coordenadas válidas
   * 2. Usar mapRef para hacer flyTo (animación suave)
   * 3. Si hay ubicación del usuario, calcular tiempo de viaje con ORS
   * 4. Mostrar notificación con tiempo estimado
   */
  const handleCenterOnMap = useCallback(async (options: FlyToOptions | null) => {
    if (!options) {
      return;
    }
    
    // 1. Centrar mapa en el cargador seleccionado
    if (mapRef.current) {
      mapRef.current.flyTo({ lat: options.lat, lng: options.lng, zoom: options.zoom ?? 17 });
    }

    // 2. Calcular tiempo de viaje si hay ubicación del usuario
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
      <div className="center-layout">
        <div className="text-center text-secondary">
          No se pudo cargar la información de vehículos. Vuelve a intentarlo más tarde.
        </div>
      </div>
    );
  }

  if (vehiclesLoading) {
    return (
      <div className="center-layout">
        <div className="spinner-lg"></div>
      </div>
    );
  }

  const renderReservationCards = () => {
    if (!selectedVehicle) {
      return (
  <div className="card card--2xl card--shadow-lg card--center">
          Selecciona un vehículo desde el menú lateral para planificar nuevas reservas.
        </div>
      );
    }

    if (loadingReservations) {
      return (
        <div className="loading-box">
          <div className="spinner-lg"></div>
        </div>
      );
    }
    // Excluir reservas canceladas de la lista de "Próximas reservas"
    const upcomingReservations = reservations.filter(r => String(r.status).toLowerCase() !== 'cancelled');

    if (!upcomingReservations.length) {
      return <p className="text-secondary">No hay reservas actuales para este vehículo.</p>;
    }

    // Ordenar reservas: las que tienen sesión activa primero
    const sortedReservations = [...upcomingReservations].sort((a, b) => {
      const aHasSession = activeSessions.has(a._id);
      const bHasSession = activeSessions.has(b._id);
      if (aHasSession && !bHasSession) return -1;
      if (!aHasSession && bHasSession) return 1;
      return 0;
    });

    return (
      <div className="flex flex-col gap-4">
        {sortedReservations.slice(0, 4).map((res) => {
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

          // Verificar si hay sesión de carga activa
          const activeSession = activeSessions.get(res._id);
          const hasActiveSession = !!activeSession;

          return (
            <div 
              key={res._id} 
              className={`card ${hasActiveSession ? 'card-indigo border-2 border-yellow-400 dark:border-yellow-500' : 'card-indigo'}`}
            >
              <div className="date-badge">
                <span className="date-badge-day">{day}</span>
                <span className="date-badge-date">{date}</span>
                <span className="date-badge-month">{month}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="item-title">{res.chargerId?.name ?? 'Cargador desconocido'}</div>
                  {hasActiveSession && (
                    <span className="badge badge-green animate-pulse">
                      <i className="fas fa-bolt mr-1"></i>
                      Carga Activa
                    </span>
                  )}
                </div>
                <div className="text-caption">Carga de Vehículo Tipo {selectedVehicle.chargerType || '-'}</div>
                {enCurso && !hasActiveSession && (
                  <div className="badge-in-progress">
                    En curso
                  </div>
                )}
              </div>
              <div className="flex min-w-[150px] flex-col items-end gap-1 text-right">
                <div className="item-title">
                  {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="mt-1 text-caption">Duración estimada: {durationStr}</div>
                
                {/* Botón de Ver Carga Actual - Solo visible si hay sesión activa */}
                {hasActiveSession && enCurso && (
                  <button 
                    className="btn btn-success btn-sm mt-2 w-full"
                    onClick={() => handleOpenChargingModal(res)}
                  >
                    <i className="fas fa-bolt mr-2"></i>
                    Ver Carga Actual
                  </button>
                )}
                
                {chargerLocation && (
                  <div className="mt-1 flex items-center gap-2">
                    <button className="btn btn-outline btn-xs" onClick={() => handleCenterOnMap({ ...chargerLocation, zoom: 17 })}>
                      Centrar en mapa
                    </button>
                    {!hasActiveSession && (
                      <button
                        className="btn btn-danger btn-xs"
                        onClick={() => {
                          setCancelTargetId(res._id);
                          setCancelModalOpen(true);
                        }}
                      >
                        Cancelar
                      </button>
                    )}
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
        <p className="text-center text-secondary">
          Selecciona un vehículo desde el menú lateral para revisar su historial de carga.
        </p>
      );
    }

    if (loadingHistory) {
      return (
        <div className="loading-box">
          <div className="spinner-lg"></div>
        </div>
      );
    }

    if (!chargingHistory.length) {
      return <p className="text-secondary">No hay historial de carga para este vehículo.</p>;
    }

    return (
      <div className="overflow-x-auto">
        <div className="scroll-table">
          <table className="table table-divide-y">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="th-spacious">Fecha</th>
                <th className="th-spacious">Cargador</th>
                <th className="th-spacious">Energía (kWh)</th>
                <th className="th-spacious">Duración (min)</th>
              </tr>
            </thead>
            <tbody>
              {chargingHistory.map((session) => (
                <tr key={session._id}>
                  <td className="td-spacious-nowrap">{new Date(session.startTime).toLocaleDateString()}</td>
                  <td className="td-spacious-nowrap">{session.chargerId.name}</td>
                  <td className="td-spacious-nowrap">{session.energyDelivered.toFixed(2)}</td>
                  <td className="td-spacious-nowrap">{session.duration.toFixed(0)}</td>
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
            <div className="md:col-span-3 alert alert-error">
              {vehiclesError}
            </div>
          )}

          {!isHistoryView && (
            <>
              <div className="space-y-6">
                <section className="card">
                  <h1 className="heading-xl">¡Buenos días! ¿Dónde quieres cargar?</h1>
                  <p className="mb-6 text-secondary">Planifica otra carga como encuentres necesario.</p>
                  {/* Modal/Panel de opciones renderizado aquí, justo debajo del mensaje de bienvenida */}
                  <div ref={optionsPanelRef} className="mt-4">
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

                <section className="card">
                  <h2 className="heading-lg">Mapa de cargadores</h2>
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
                <section className="card h-full flex flex-col">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="tabs">
                      <button
                        onClick={() => setSelectedTab('reservations')}
                        className={`tab ${selectedTab === 'reservations' ? 'tab--active' : ''}`}
                      >
                        Próximas reservas
                      </button>
                      <button
                        onClick={() => setSelectedTab('favourites')}
                        className={`tab ${selectedTab === 'favourites' ? 'tab--active' : ''}`}
                      >
                        Mis Favoritos
                      </button>
                    </div>
                    {selectedTab === 'reservations' && reservations.length > 0 && (
                      <button className="btn btn-ghost btn-xs" onClick={() => setShowAllReservations(true)}>
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
            <section className="md:col-span-3 card">
              <h2 className="heading-lg">Historial de carga</h2>
              {renderHistory()}
            </section>
          )}

          {vehicles.length > 0 && !selectedVehicle && (
            <div className="md:col-span-3 card card--2xl card--shadow-lg card--center">
              Selecciona un vehículo desde el menú lateral para ver tus reservas e historial.
            </div>
          )}
        </div>
      </main>

      {showAllReservations && (
        <div className="modal">
          <div className="relative w-full max-w-[82vw] modal__panel p-8" onClick={(e) => e.stopPropagation()}>
            <button className="absolute right-4 top-4 btn btn-ghost btn-xs" onClick={() => setShowAllReservations(false)}>
              ×
            </button>
            <h2 className="heading-lg">Todas las reservas</h2>
            <div className="overflow-x-auto">
              <div className="scroll-table">
                <table className="table table-divide-y">
                  <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="th-spacious">Fecha inicio</th>
                      <th className="th-spacious">Fecha fin</th>
                      <th className="th-spacious">Cargador</th>
                      <th className="th-spacious">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map((res) => (
                      <tr key={res._id}>
                        <td className="td-spacious-nowrap">{new Date(res.startTime).toLocaleString()}</td>
                        <td className="td-spacious-nowrap">{new Date(res.endTime).toLocaleString()}</td>
                        <td className="td-spacious-nowrap">{res.chargerId?.name ?? '-'}</td>
                        <td className="td-spacious-nowrap">{res.status}</td>
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

      {/* Modal de Carga Activa */}
      {selectedReservationForCharging && chargingModalOpen && (() => {
        // Buscar el cargador completo para obtener el ownerId (adminId)
        const chargerFullData = mappedChargers.find(c => 
          c._id === selectedReservationForCharging.chargerId._id
        );
        const adminId = chargerFullData?.ownerId || '';

        return (
          <ChargingModal
            isOpen={chargingModalOpen}
            onClose={handleCloseChargingModal}
            reservationId={selectedReservationForCharging._id}
            chargerId={selectedReservationForCharging.chargerId._id || ''}
            vehicleId={selectedReservationForCharging.vehicleId}
            adminId={adminId}
          />
        );
      })()}
    </div>
  );
};

export default VehicleDashboard;