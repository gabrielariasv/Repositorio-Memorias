// src/pages/ChargerCalendarPage.tsx
import { colorFromString } from '../utils/colors';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { addDays, startOfDay } from 'date-fns';
import WeeklyView from '../components/WeeklyView/WeeklyView';
import MonthlyCalendar from '../components/MonthlyCalendar/MonthlyCalendar';
import type { CalendarEvent as CalendarEventType } from '../types';
import {
  CalEvent,
  groupEventsByDay,
  computeDailyBusyHours,
  getDateKeyInTZ
} from '../utils/calendar';

type ApiEvent = {
  id: string;
  title: string;
  start: string | Date;
  end: string | Date;
  type?: 'session' | 'reservation' | string;
  status?: string;
  energy?: number;
  duration?: number;
  vehicle?: any;
  user?: any;
};

type AvailabilityDay = {
  date: string; // YYYY-MM-DD in TZ
  busySlots: { start: string; end: string }[];
  available: number; // hours available (float)
};

type ChargerDto = {
  _id: string;
  name?: string;
  location?: any;
};

const COLORS_BY_TYPE: Record<string, string> = {
  session: '#4caf50',
  reservation: '#2196f3',
  default: '#9e9e9e'
};

function colorForApiEvent(e: ApiEvent) {
  if (e.type === 'session') return COLORS_BY_TYPE.session;
  if (e.type === 'reservation') return COLORS_BY_TYPE.reservation;
  return COLORS_BY_TYPE.default;
}

function computeAvailabilityFromCalEvents(events: CalEvent[], daysAhead = 7): AvailabilityDay[] {
  const grouped = groupEventsByDay(events);
  const now = new Date();
  const res: AvailabilityDay[] = [];

  for (let i = 0; i < daysAhead; i++) {
    const day = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const dayKey = getDateKeyInTZ(day);
    const fragments = grouped[dayKey] || [];

    const busyHours = computeDailyBusyHours(fragments);

    const intervals = fragments.map(f => ({
      sMin: f.startHour * 60 + f.startMinute,
      eMin: f.endHour * 60 + f.endMinute
    })).sort((a, b) => a.sMin - b.sMin);

    const merged: { sMin: number; eMin: number }[] = [];
    intervals.forEach(iv => {
      if (merged.length === 0) merged.push(iv);
      else {
        const last = merged[merged.length - 1];
        if (iv.sMin <= last.eMin) {
          last.eMin = Math.max(last.eMin, iv.eMin);
        } else merged.push(iv);
      }
    });

    const busySlots = merged.map(m => {
      const startH = Math.floor(m.sMin / 60);
      const startM = m.sMin % 60;
      const endH = Math.floor(m.eMin / 60) % 24;
      const endM = m.eMin % 60;
      const startStr = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
      const endStr = (m.eMin >= 24 * 60) ? '00:00' : `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
      return { start: startStr, end: endStr };
    });

    res.push({
      date: dayKey,
      busySlots,
      available: Math.max(0, 24 - busyHours)
    });
  }

  return res;
}

export default function ChargerCalendarPage() {
  const { chargerId } = useParams<{ chargerId: string }>();
  const navigate = useNavigate();

  const [charger, setCharger] = useState<ChargerDto | null>(null);
  const [events, setEvents] = useState<CalendarEventType[]>([]);
  const [availability, setAvailability] = useState<AvailabilityDay[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapApiEvent = (apiEvent: ApiEvent): CalendarEventType => {
    // Intenta extraer un identificador/clave del vehículo (o del usuario) para generar color.
    // Maneja diferentes formas que pueda venir la respuesta (string id o objeto poblado).
    const vehicleKey =
      (apiEvent as any).vehicle?.model ??
      (apiEvent as any).vehicle?._id ??
      (apiEvent as any).vehicle ??
      (apiEvent as any).user?.name ??
      apiEvent.id;

    // Si hay vehicleKey generamos color a partir de él; si no, caemos al color según tipo (sesión/reserva)
    const vehicleColor = vehicleKey ? colorFromString(String(vehicleKey), 64, 46) : undefined;

    const fallbackColor = colorForApiEvent(apiEvent);

    return {
      id: String(apiEvent.id),
      title: apiEvent.title,
      date: new Date(apiEvent.start),
      endTime: new Date(apiEvent.end),
      color: vehicleColor ?? fallbackColor,
      raw: apiEvent as any
    } as CalendarEventType;
  };

  const fetchCalendar = useCallback(async (date: Date) => {
    if (!chargerId) {
      setError('ChargerId no proporcionado');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const start = startOfDay(addDays(date, -7)).toISOString();
      const end = startOfDay(addDays(date, +7)).toISOString();

      const resp = await axios.get(`${import.meta.env.VITE_API_URL}/api/calendar/charger/${chargerId}`, {
        params: { startDate: start, endDate: end }
      });

      const data = resp.data;
      setCharger(data.charger || null);

      const mapped: CalendarEventType[] = (data.events || []).map((ev: ApiEvent) => mapApiEvent(ev));
      setEvents(mapped);

      const calEventsForCompute: CalEvent[] = mapped.map(m => ({
        id: String(m.id),
        title: m.title,
        date: m.date,
        endTime: m.endTime,
        color: m.color,
        raw: (m as any).raw
      }));

      const computedAvailability = computeAvailabilityFromCalEvents(calEventsForCompute, 7);
      setAvailability(computedAvailability);
    } catch (err: any) {
      console.error('Error fetching calendar:', err);
      setError(err?.response?.data?.error || err?.message || 'Error al cargar calendario');
      setEvents([]);
      setAvailability([]);
      setCharger(null);
    } finally {
      setLoading(false);
    }
  }, [chargerId]);

  useEffect(() => {
    fetchCalendar(currentDate);
  }, [chargerId, currentDate, fetchCalendar]);

  const handleRefresh = () => fetchCalendar(currentDate);

  const handleDateChange = (newDate: Date) => {
    setCurrentDate(newDate);
  };

  const eventsForCalendar = useMemo(() => {
    return events.map(ev => ({
      id: String(ev.id),
      title: ev.title,
      date: new Date(ev.date),
      endTime: new Date(ev.endTime),
      color: ev.color,
      raw: (ev as any).raw
    })) as CalendarEventType[];
  }, [events]);

  if (!chargerId) {
    return <div className="p-6 text-red-600 dark:text-red-400">Charger ID no especificado.</div>;
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Calendario del cargador</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {charger ? charger.name : `Cargador ID: ${chargerId}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/chargers')}
              className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 dark:text-gray-100 text-gray-800 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Volver
            </button>

            <button
              onClick={handleRefresh}
              className="px-3 py-1 rounded bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-800/40 text-blue-800 dark:text-blue-200 transition-colors"
              disabled={loading}
            >
              {loading ? 'Cargando...' : 'Actualizar'}
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow transition-colors">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Vista semanal</h2>
              <div style={{ height: 520 }}>
                <WeeklyView
                  currentDate={currentDate}
                  events={eventsForCalendar}
                  onDateChange={handleDateChange}
                />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow transition-colors">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Vista mensual</h2>
              <MonthlyCalendar
                currentDate={currentDate}
                events={eventsForCalendar}
                onDateChange={handleDateChange}
              />
            </div>
          </div>

          <aside className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow transition-colors">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">Disponibilidad (próx. 7 días)</h3>
              {availability.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Sin datos de disponibilidad</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {availability.map((day) => (
                    <li key={day.date} className="flex flex-col">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-700 dark:text-gray-200">{day.date}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{day.available.toFixed(1)} h libres</span>
                      </div>
                      {day.busySlots.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-2">
                          {day.busySlots.map((s, i) => (
                            <span key={i} className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded">
                              {s.start} - {s.end}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-1 text-xs text-green-700 dark:text-green-300">Libre todo el día</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow transition-colors">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">Eventos próximos</h3>
              <div className="mt-3 space-y-2">
                {eventsForCalendar.length === 0 && <p className="text-sm text-gray-600 dark:text-gray-400">No hay eventos programados</p>}
                {eventsForCalendar.slice(0, 10).map(ev => (
                  <div key={ev.id} className="flex items-center justify-between p-2 border border-gray-100 dark:border-gray-700 rounded">
                    <div>
                      <div className="font-medium text-gray-800 dark:text-gray-100">{ev.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {ev.date.toLocaleString()} — {ev.endTime.toLocaleTimeString()}
                      </div>
                    </div>
                    <div style={{ background: ev.color }} className="w-3 h-3 rounded-full ml-2" />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow transition-colors">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">Detalles del cargador</h3>
              {charger ? (
                <div className="mt-2 text-sm text-gray-700 dark:text-gray-200 space-y-1">
                  <div><strong>Nombre:</strong> {charger.name || '—'}</div>
                  {charger.location && <div><strong>Ubicación:</strong> {`${charger.location.lat?.toFixed?.(4) ?? '-'}, ${charger.location.lng?.toFixed?.(4) ?? '-'}`}</div>}
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Cargando detalles...</p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
