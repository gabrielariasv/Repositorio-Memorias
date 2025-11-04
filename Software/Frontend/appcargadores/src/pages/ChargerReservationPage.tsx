// src/pages/ChargerReservationPage.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { addDays, startOfDay, format } from 'date-fns';
import WeeklyView from '../components/WeeklyView/WeeklyView';
import { CalendarEvent as CalendarEventType } from '../types';
import { useAuth } from '../contexts/useAuth';
import { useEvVehicle } from '../contexts/useEvVehicle';

type ApiEvent = {
  id: string;
  title: string;
  start: string | Date;
  end: string | Date;
  type?: 'session' | 'reservation' | string;
  status?: string;
};

type ChargerDto = {
  _id: string;
  name?: string;
  location?: any;
  chargerType?: string;
  powerOutput?: number;
  energy_cost?: number; // CLP$ por kWh
  parking_cost?: number; // CLP$ por minuto
};

export default function ChargerReservationPage() {
  const { chargerId } = useParams<{ chargerId: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const evVehicleContext = useEvVehicle();

  const [charger, setCharger] = useState<ChargerDto | null>(null);
  // favoritos
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [favLoading, setFavLoading] = useState<boolean>(false);
  const [events, setEvents] = useState<CalendarEventType[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  // Estados para la selección de rango
  const [selectionStart, setSelectionStart] = useState<Date | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Date | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Estados para los inputs de tiempo
  const [startDateInput, setStartDateInput] = useState('');
  const [startTimeInput, setStartTimeInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [endTimeInput, setEndTimeInput] = useState('');

  // Estado para feedback de reserva
  const [reservationFeedback, setReservationFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedVehicle = evVehicleContext?.selectedVehicle;

  const fetchCalendar = useCallback(async (date: Date) => {
    if (!chargerId) {
      setError('ChargerId no proporcionado');
      return;
    }

    setError(null);

    try {
      const start = startOfDay(addDays(date, -7)).toISOString();
      const end = startOfDay(addDays(date, +7)).toISOString();

      const resp = await axios.get(`${import.meta.env.VITE_API_URL}/api/calendar/charger/${chargerId}`, {
        params: { startDate: start, endDate: end }
      });

      const data = resp.data;
      setCharger(data.charger || null);

      const mapped: CalendarEventType[] = (data.events || [])
        .map((ev: ApiEvent) => {
          const startDate = new Date(ev.start);
          const endDate = new Date(ev.end);
          
          return {
            id: String(ev.id),
            title: ev.title,
            date: startDate,
            endTime: endDate,
            color: ev.type === 'session' ? '#4caf50' : '#2196f3',
            raw: ev
          };
        })
        .filter((ev: CalendarEventType) => {
          // Filtrar eventos con fechas inválidas
          return !isNaN(ev.date.getTime()) && 
                 !isNaN(ev.endTime.getTime()) && 
                 ev.endTime > ev.date;
        });
      setEvents(mapped);
    } catch (err: any) {
      console.error('Error fetching calendar:', err);
      setError(err?.response?.data?.error || err?.message || 'Error al cargar calendario');
      setEvents([]);
      setCharger(null);
    }
  }, [chargerId]);

  useEffect(() => {
    fetchCalendar(currentDate);
  }, [chargerId, currentDate, fetchCalendar]);

  // Comprobar si el cargador está en favoritos del usuario
  useEffect(() => {
    const checkFavorite = async () => {
      if (!user?._id || !token || !chargerId) {
        setIsFavorite(false);
        return;
      }
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/favourites/${user._id}`, {
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        });
        if (!res.ok) {
          setIsFavorite(false);
          return;
        }
        const data = await res.json();
        const favs = Array.isArray(data.favoriteStations) ? data.favoriteStations.map((s:any) => (s._id ? String(s._id) : String(s))) : [];
        setIsFavorite(favs.includes(String(chargerId)));
      } catch (err) {
        console.error('Error checking favorites:', err);
        setIsFavorite(false);
      }
    };
    checkFavorite();
  }, [user, token, chargerId]);

  // Alternar favorito (optimista)
  const toggleFavorite = async () => {
    if (!user?._id || !token) {
      alert('Debes iniciar sesión para gestionar favoritos.');
      return;
    }
    if (!chargerId) return;
    setFavLoading(true);
    const prev = isFavorite;
    setIsFavorite(!prev); // Actualización optimista
    try {
      const method = prev ? 'DELETE' : 'POST';
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/favourites/${user._id}/${chargerId}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Error actualizando favoritos');
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      setIsFavorite(prev); // Revertir cambio
      alert('No se pudo actualizar favoritos. Intenta de nuevo.');
    } finally {
      setFavLoading(false);
    }
  };

  const handleDateChange = (newDate: Date) => {
    setCurrentDate(newDate);
  };

  // Sincronizar inputs con selección
  useEffect(() => {
    if (selectionStart) {
      setStartDateInput(format(selectionStart, 'yyyy-MM-dd'));
      setStartTimeInput(format(selectionStart, 'HH:mm'));
    }
    if (selectionEnd) {
      setEndDateInput(format(selectionEnd, 'yyyy-MM-dd'));
      setEndTimeInput(format(selectionEnd, 'HH:mm'));
    }
  }, [selectionStart, selectionEnd]);

  // Manejar cambios en inputs de texto y actualizar selección
  useEffect(() => {
    if (startDateInput && startTimeInput) {
      try {
        const newStart = new Date(`${startDateInput}T${startTimeInput}`);
        if (!isNaN(newStart.getTime()) && newStart.getTime() > 0) {
          setSelectionStart(newStart);
        } else {
          setSelectionStart(null);
        }
      } catch {
        setSelectionStart(null);
      }
    } else if (!startDateInput || !startTimeInput) {
      // Si los inputs están vacíos, limpiar la selección
      setSelectionStart(null);
    }
  }, [startDateInput, startTimeInput]);

  useEffect(() => {
    if (endDateInput && endTimeInput) {
      try {
        const newEnd = new Date(`${endDateInput}T${endTimeInput}`);
        if (!isNaN(newEnd.getTime()) && newEnd.getTime() > 0) {
          setSelectionEnd(newEnd);
        } else {
          setSelectionEnd(null);
        }
      } catch {
        setSelectionEnd(null);
      }
    } else if (!endDateInput || !endTimeInput) {
      // Si los inputs están vacíos, limpiar la selección
      setSelectionEnd(null);
    }
  }, [endDateInput, endTimeInput]);

  const handleTimeSlotClick = (clickedTime: Date) => {
    if (!isSelecting) {
      // Primera selección - inicio
      setSelectionStart(clickedTime);
      setSelectionEnd(null);
      setIsSelecting(true);
    } else {
      // Segunda selección - fin
      if (selectionStart && clickedTime > selectionStart) {
        setSelectionEnd(clickedTime);
      } else if (selectionStart && clickedTime < selectionStart) {
        // Si hace click en un tiempo anterior, invertir
        setSelectionEnd(selectionStart);
        setSelectionStart(clickedTime);
      }
      setIsSelecting(false);
    }
  };

  const handleConfirmReservation = async () => {
    if (!selectionStart || !selectionEnd) {
      setReservationFeedback({ type: 'error', message: 'Debes seleccionar un rango de tiempo válido' });
      return;
    }

    if (!selectedVehicle) {
      setReservationFeedback({ type: 'error', message: 'Debes seleccionar un vehículo desde el menú lateral' });
      return;
    }

    if (!token) {
      setReservationFeedback({ type: 'error', message: 'Debes iniciar sesión para reservar' });
      return;
    }

    setSubmitting(true);
    setReservationFeedback(null);

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/reservations`,
        {
          vehicleId: selectedVehicle._id,
          chargerId: chargerId,
          startTime: selectionStart.toISOString(),
          endTime: selectionEnd.toISOString(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setReservationFeedback({ type: 'success', message: 'Reserva creada exitosamente' });
      
      // Limpiar selección
      setSelectionStart(null);
      setSelectionEnd(null);
      setIsSelecting(false);
      
      // Refrescar calendario
      fetchCalendar(currentDate);

      // Redirigir después de 2 segundos
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || err?.message || 'Error al crear la reserva';
      setReservationFeedback({ type: 'error', message: errorMsg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearSelection = () => {
    setSelectionStart(null);
    setSelectionEnd(null);
    setIsSelecting(false);
    setStartDateInput('');
    setStartTimeInput('');
    setEndDateInput('');
    setEndTimeInput('');
  };

  // Crear eventos visuales para mostrar el rango seleccionado
  const eventsWithSelection = useMemo(() => {
    // events ya contienen Date objects, no necesitamos convertirlos
    const baseEvents = [...events];

    // Solo agregar preview si ambas fechas son válidas
    if (
      selectionStart && 
      selectionEnd && 
      !isNaN(selectionStart.getTime()) && 
      !isNaN(selectionEnd.getTime()) &&
      selectionEnd > selectionStart
    ) {
      baseEvents.push({
        id: 'selection-preview',
        title: 'Tu reserva',
        date: selectionStart,
        endTime: selectionEnd,
        color: '#f59e0b', // amber
        raw: { isSelection: true }
      } as CalendarEventType);
    }

    return baseEvents;
  }, [events, selectionStart, selectionEnd]);

  // Calcular porcentaje alcanzable durante la duración seleccionada (solo para reservas manuales)
  const reachableInfo = useMemo(() => {
    if (!selectionStart || !selectionEnd) return null;
    if (!selectedVehicle) return null;
    if (!charger || !charger.powerOutput) return null;

    const batteryCapacity = Number(selectedVehicle.batteryCapacity || 0);
    const currentLevel = Number(selectedVehicle.currentChargeLevel ?? 0);
    if (!batteryCapacity || batteryCapacity <= 0) return null;

    const durationHours = (selectionEnd.getTime() - selectionStart.getTime()) / (1000 * 60 * 60);
    if (durationHours <= 0) return null;

    // energía aproximada que entregará el cargador en kWh
    const energyDelivered = Number(charger.powerOutput) * durationHours;
    const percentGain = (energyDelivered / batteryCapacity) * 100;
    const reachablePercent = Math.min(100, currentLevel + percentGain);

    // Tiempo necesario para alcanzar el porcentaje calculado usando la potencia del cargador
    let timeToReachHours = 0;
    if (reachablePercent > currentLevel && Number(charger.powerOutput) > 0) {
      const energyNeededToReach = batteryCapacity * ((reachablePercent - currentLevel) / 100);
      const hoursNeeded = energyNeededToReach / Number(charger.powerOutput);
      timeToReachHours = Math.min(durationHours, hoursNeeded);
    }

    // Energía necesaria para alcanzar ese porcentaje
    const energyNeededToReach = batteryCapacity * ((reachablePercent - currentLevel) / 100);

  // Precio por kWh del cargador (soporta varios nombres posibles)
  const unitCost = Number((charger as any).energy_cost ?? (charger as any).energyCost ?? (charger as any).unitCost ?? 0);
    const costEstimate = unitCost > 0 ? Math.ceil(energyNeededToReach * unitCost) : null;

  // Cálculo de tiempo y costo de estacionamiento (solo cuando no se esté cargando)
  const chargerParkingRatePerMin = Number((charger as any).parking_cost ?? 0); // CLP$ por minuto
  const parkingTimeHours = Math.max(0, durationHours - timeToReachHours);
  const parkingMinutes = Math.round(parkingTimeHours * 60);
  const parkingCostEstimate = chargerParkingRatePerMin > 0 && parkingMinutes > 0 ? Math.ceil(parkingMinutes * chargerParkingRatePerMin) : null;

    return {
      durationHours,
      energyDelivered,
      percentGain,
      reachablePercent,
      timeToReachHours,
      energyNeededToReach,
      unitCost,
      costEstimate
      ,
      parkingTimeHours,
      parkingMinutes,
      parkingCostEstimate
    };
  }, [selectionStart, selectionEnd, selectedVehicle, charger]);

  if (!chargerId) {
    return <div className="p-6 text-red-600 dark:text-red-400">Charger ID no especificado.</div>;
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reservar cargador</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {charger ? charger.name : `Cargador ID: ${chargerId}`}
              </p>
              {/* Estrella favoritos junto al nombre */}
              {user && (
                <button
                  onClick={toggleFavorite}
                  disabled={favLoading}
                  aria-label={isFavorite ? 'Quitar favorito' : 'Agregar favorito'}
                  title={isFavorite ? 'Quitar favorito' : 'Agregar favorito'}
                  className="inline-flex items-center justify-center p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {isFavorite ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.97a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.286 3.97c.3.92-.755 1.688-1.538 1.118l-3.385-2.46a1 1 0 00-1.176 0l-3.385 2.46c-.783.57-1.838-.197-1.538-1.118l1.286-3.97a1 1 0 00-.364-1.118L2.05 9.397c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.97z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.97a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.286 3.97c.3.92-.755 1.688-1.538 1.118l-3.385-2.46a1 1 0 00-1.176 0l-3.385 2.46c-.783.57-1.838-.197-1.538-1.118l1.286-3.97a1 1 0 00-.364-1.118L2.05 9.397c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.97z" />
                    </svg>
                  )}
                </button>
              )}
            </div>
           {selectedVehicle && (
             <p className="text-sm text-indigo-600 dark:text-indigo-300 mt-1">
               Vehículo: {selectedVehicle.model} ({selectedVehicle.chargerType})
             </p>
           )}
           </div>
 
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors shadow-md"
          >
            Volver
          </button>
         </header>
 
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded">
            {error}
          </div>
        )}

        {reservationFeedback && (
          <div className={`mb-4 p-3 rounded ${reservationFeedback.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
            {reservationFeedback.message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow transition-colors">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                Selecciona el horario de tu reserva
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {isSelecting 
                  ? 'Ahora selecciona la hora de fin haciendo click en el calendario' 
                  : 'Haz click en la hora de inicio en el calendario'}
              </p>
              <div style={{ height: 520 }}>
                <WeeklyView
                  currentDate={currentDate}
                  events={eventsWithSelection}
                  onDateChange={handleDateChange}
                  onTimeSlotClick={handleTimeSlotClick}
                />
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow transition-colors">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Horario seleccionado</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Fecha y hora de inicio
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={startDateInput}
                      onChange={(e) => setStartDateInput(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                    />
                    <input
                      type="time"
                      value={startTimeInput}
                      onChange={(e) => setStartTimeInput(e.target.value)}
                      className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Fecha y hora de fin
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={endDateInput}
                      onChange={(e) => setEndDateInput(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                    />
                    <input
                      type="time"
                      value={endTimeInput}
                      onChange={(e) => setEndTimeInput(e.target.value)}
                      className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                    />
                  </div>
                </div>

                {selectionStart && selectionEnd && (
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <div className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-1">
                      Duración de la reserva
                    </div>
                    <div className="text-sm text-amber-900 dark:text-amber-100">
                          {Math.round((selectionEnd.getTime() - selectionStart.getTime()) / (1000 * 60 * 60) * 10) / 10} horas
                        {reachableInfo && (
                          <div className="mt-2 text-sm text-amber-900 dark:text-amber-100">
                            <strong>Porcentaje alcanzable:</strong>{' '}
                            {`${Math.round(reachableInfo.reachablePercent)}%`} en {Math.round(reachableInfo.timeToReachHours)} horas con
                            {` ${Math.round(reachableInfo.timeToReachHours*60-Math.floor(reachableInfo.timeToReachHours*60))} minutos`}.
                            {reachableInfo.costEstimate !== null && reachableInfo.costEstimate !== undefined && (
                              <div className="mt-1"><strong>Costo estimado de la carga:</strong> CLP$ {Number(reachableInfo.costEstimate).toLocaleString()}</div>
                            )}
                            {reachableInfo.parkingMinutes !== null && reachableInfo.parkingMinutes !== undefined && reachableInfo.parkingMinutes > 0 && (
                              <div className="mt-1"><strong>Tiempo de estacionamiento:</strong> {reachableInfo.parkingMinutes} minutos  <strong>Costo de estacionamiento:</strong> CLP$ {Number(reachableInfo.parkingCostEstimate).toLocaleString()}</div>
                            )}
                              <div><strong>Costo Total:</strong> CLP$ {Number(reachableInfo.costEstimate + reachableInfo.parkingCostEstimate).toLocaleString()}</div>
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <button
                  onClick={handleConfirmReservation}
                  disabled={!selectionStart || !selectionEnd || submitting || !selectedVehicle}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Creando reserva...' : 'Confirmar reserva'}
                </button>
                
                <button
                  onClick={handleClearSelection}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Limpiar selección
                </button>
              </div>

              {!selectedVehicle && (
                <p className="mt-3 text-xs text-red-600 dark:text-red-400">
                  Selecciona un vehículo desde el menú lateral para continuar
                </p>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow transition-colors">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">Detalles del cargador</h3>
              {charger ? (
                <div className="text-sm text-gray-700 dark:text-gray-200 space-y-1">
                  <div><strong>Nombre:</strong> {charger.name || '—'}</div>
                  <div><strong>Tipo:</strong> {charger.chargerType || '—'}</div>
                  <div><strong>Potencia:</strong> {charger.powerOutput ? `${charger.powerOutput} kW` : '—'}</div>
                  <div><strong>Costo energía:</strong> { (charger as any).energy_cost ? `CLP$ ${Math.ceil(Number((charger as any).energy_cost)).toLocaleString()} / kWh` : '—' }</div>
                  <div><strong>Costo estacionamiento:</strong> { (charger as any).parking_cost ? `CLP$ ${Math.ceil(Number((charger as any).parking_cost)).toLocaleString()} / min` : '—' }</div>
                  {charger.location && (
                    <div>
                      <strong>Ubicación:</strong> {`${charger.location.lat?.toFixed?.(4) ?? '-'}, ${charger.location.lng?.toFixed?.(4) ?? '-'}`}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">Cargando detalles...</p>
              )}
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
              <h3 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-2 text-sm">
                💡 Instrucciones
              </h3>
              <ul className="text-xs text-indigo-800 dark:text-indigo-200 space-y-1 list-disc list-inside">
                <li>Haz click en la hora de inicio deseada</li>
                <li>Luego click en la hora de fin</li>
                <li>Verás tu reserva en color ámbar</li>
                <li>También puedes editar las horas manualmente</li>
                <li>Confirma para crear la reserva</li>
                <div>*Se aplica el costo de estacionamiento, por cada minuto extra sobre la demora de la carga.</div>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
