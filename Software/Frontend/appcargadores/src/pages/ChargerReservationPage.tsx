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
};

export default function ChargerReservationPage() {
  const { chargerId } = useParams<{ chargerId: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const evVehicleContext = useEvVehicle();

  const [charger, setCharger] = useState<ChargerDto | null>(null);
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

  if (!chargerId) {
    return <div className="p-6 text-red-600 dark:text-red-400">Charger ID no especificado.</div>;
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reservar cargador</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {charger ? charger.name : `Cargador ID: ${chargerId}`}
            </p>
            {selectedVehicle && (
              <p className="text-sm text-indigo-600 dark:text-indigo-300 mt-1">
                Vehículo: {selectedVehicle.model} ({selectedVehicle.chargerType})
              </p>
            )}
          </div>

          <button
            onClick={() => navigate('/')}
            className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 dark:text-gray-100 text-gray-800 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
