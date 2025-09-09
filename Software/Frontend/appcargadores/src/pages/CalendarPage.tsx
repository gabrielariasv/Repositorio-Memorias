// src/pages/CalendarPage.tsx
import React, { useState } from 'react';
import WeeklyView from '../components/WeeklyView/WeeklyView';
import MonthlyCalendar from '../components/MonthlyCalendar/MonthlyCalendar';
import { CalendarEvent } from '../types';

/**
 * CalendarPage — layout principal
 * - No fuerza color de fondo global (el body/index.css debe controlar el fondo)
 * - Paneles y tarjetas usan bg-white dark:bg-gray-800 o bg-transparent según corresponda
 * - Asegúrate de tener `darkMode: 'class'` en tailwind.config.js y de aplicar la clase `dark` en <html> si usas modo oscuro manual
 */
const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [events] = useState<CalendarEvent[]>([
    {
      id: 1,
      title: 'Операційні системи та безпека даних',
      date: new Date(new Date().getFullYear(), new Date().getMonth(), 14, 10, 0),
      endTime: new Date(new Date().getFullYear(), new Date().getMonth(), 14, 11, 30),
      color: '#4caf50'
    },
    {
      id: 2,
      title: 'Проектування інтерфейсу користувача (UI)',
      date: new Date(new Date().getFullYear(), new Date().getMonth(), 15, 12, 30),
      endTime: new Date(new Date().getFullYear(), new Date().getMonth(), 15, 13, 50),
      color: '#2196f3'
    },
    {
      id: 3,
      title: 'Фахова іноземна мова',
      date: new Date(new Date().getFullYear(), new Date().getMonth(), 16, 9, 0),
      endTime: new Date(new Date().getFullYear(), new Date().getMonth(), 16, 10, 20),
      color: '#ff9800'
    },
    {
      id: 4,
      title: "Комп'ютерні мережі",
      date: new Date(new Date().getFullYear(), new Date().getMonth(), 17, 14, 0),
      endTime: new Date(new Date().getFullYear(), new Date().getMonth(), 17, 15, 20),
      color: '#e91e63'
    },
    {
      id: 5,
      title: 'Бази даних',
      date: new Date(new Date().getFullYear(), new Date().getMonth(), 18, 11, 0),
      endTime: new Date(new Date().getFullYear(), new Date().getMonth(), 18, 12, 20),
      color: '#9c27b0'
    },
    {
      id: 6,
      title: 'Основи програмування на мові С#',
      date: new Date(new Date().getFullYear(), new Date().getMonth(), 19, 15, 0),
      endTime: new Date(new Date().getFullYear(), new Date().getMonth(), 19, 16, 20),
      color: '#3f51b5'
    },
    // pasados y futuros
    {
      id: 7,
      title: 'Reunión pasada',
      date: new Date(new Date().getFullYear(), new Date().getMonth(), 10, 10, 0),
      endTime: new Date(new Date().getFullYear(), new Date().getMonth(), 10, 11, 0),
      color: '#9e9e9e'
    },
    {
      id: 8,
      title: 'Evento futuro',
      date: new Date(new Date().getFullYear(), new Date().getMonth(), 25, 14, 0),
      endTime: new Date(new Date().getFullYear(), new Date().getMonth(), 25, 15, 0),
      color: '#2196f3'
    }
  ]);

  const handleDateChange = (newDate: Date): void => setCurrentDate(newDate);

  return (
    // No forzamos background aquí. Deja que index.css (prefers-color-scheme / .dark) lo controle.
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Main content */}
      <main className="flex-1 p-4 overflow-auto">
        {/* Encabezado simple dentro del área principal */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Calendario
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Vista semanal y mensual
            </p>
          </div>

          {/* Controles/Acciones (si los necesitas aquí) */}
          <div className="flex items-center gap-3">
            {/* Botón de actualizar — variante dark incluida */}
            <button
              onClick={() => {/* puedes enlazar la acción real si quieres */}}
              className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 transition-colors"
            >
              Actualizar
            </button>

            {/* Botón Nuevo (ejemplo) */}
            <button
              onClick={() => {/* abrir modal / nuevo evento */}}
              className="px-3 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/30 dark:hover:bg-blue-800/40 dark:text-blue-200 transition-colors"
            >
              Nuevo evento
            </button>
          </div>
        </div>

        {/* WeeklyView: el componente ya fue actualizado para dark */}
        <div className="h-[70vh]">
          <WeeklyView currentDate={currentDate} events={events} onDateChange={handleDateChange} />
        </div>
      </main>

      {/* Sidebar / panel derecho */}
      <aside className="w-full md:w-1/3 lg:w-1/4 p-4 md:border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 min-w-[300px]">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Vista mensual</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Navega por el mes y selecciona fechas.</p>
        </div>

        <MonthlyCalendar currentDate={currentDate} onDateChange={handleDateChange} events={events} />
      </aside>
    </div>
  );
};

export default CalendarPage;
