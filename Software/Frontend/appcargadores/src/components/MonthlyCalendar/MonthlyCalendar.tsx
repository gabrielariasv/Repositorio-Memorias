// components/MonthlyCalendar/MonthlyCalendar.tsx
import { useState, useEffect, useRef } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  isAfter,
  isBefore,
  startOfDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import { MonthlyCalendarProps } from '../../types';

// Componente: calendario mensual con selector de fecha y eventos
const MonthlyCalendar = ({ currentDate, onDateChange, events }: MonthlyCalendarProps) => {
  const [month, setMonth] = useState<Date[][]>([]);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showWheelPicker, setShowWheelPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows: Date[][] = [];
    let days: Date[] = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        days.push(day);
        day = addDays(day, 1);
      }
      rows.push(days);
      days = [];
    }

    setMonth(rows);
  }, [currentDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowMonthPicker(false);
        setShowYearPicker(false);
        setShowWheelPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Si un día tiene eventos
  const hasEvents = (day: Date) => events.some(event => isSameDay(event.date, day));

  const getEventType = (day: Date) => {
    const today = startOfDay(new Date());
    const currentDay = startOfDay(day);

    if (isAfter(currentDay, today)) return 'future';
    if (isBefore(currentDay, today)) return 'past';
    return 'today';
  };

  const handleDateClick = (day: Date): void => onDateChange(day);
  const goToPreviousMonth = (): void => onDateChange(addMonths(currentDate, -1));
  const goToNextMonth = (): void => onDateChange(addMonths(currentDate, 1));

  const handleMonthChange = (monthIndex: number): void => {
    const newDate = new Date(currentDate);
    newDate.setMonth(monthIndex);
    if (!isNaN(newDate.getTime())) onDateChange(newDate);
    else onDateChange(new Date(currentDate.getFullYear(), monthIndex, 1));
    setShowMonthPicker(false);
  };

  const handleYearChange = (year: number): void => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(year);
    if (!isNaN(newDate.getTime())) onDateChange(newDate);
    else onDateChange(new Date(year, currentDate.getMonth(), 1));
    setShowYearPicker(false);
  };

/*  const toggleMonthPicker = (): void => {
    setShowMonthPicker(!showMonthPicker);
    setShowYearPicker(false);
    setShowWheelPicker(false);
  };

  const toggleYearPicker = (): void => {
    setShowYearPicker(!showYearPicker);
    setShowMonthPicker(false);
    setShowWheelPicker(false);
  };
*/
  const toggleWheelPicker = (): void => {
    setShowWheelPicker(!showWheelPicker);
    setShowMonthPicker(false);
    setShowYearPicker(false);
  };

  const handleWheelDateChange = (day: number, month: number, year: number): void => {
    const newDate = new Date(year, month, day);
    if (!isNaN(newDate.getTime())) onDateChange(newDate);
    else {
      const lastDay = new Date(year, month + 1, 0).getDate();
      onDateChange(new Date(year, month, Math.min(day, lastDay)));
    }
    setShowWheelPicker(false);
  };

  const weekDays = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  // Auxiliar para clases CSS de puntos según tipo
  const dotClassFor = (type: string) => {
    if (type === 'future') return 'bg-[#2196f3] dark:bg-[#1e88e5]';
    if (type === 'past') return 'bg-gray-500 dark:bg-gray-600';
    return 'bg-green-500 dark:bg-green-500';
  };

  return (
    <div className="bg-transparent"> {/* fondo lo controla el layout global; no forzamos blanco */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg mb-5 relative md:p-6 transition-colors">
        <div className="flex justify-between items-center mb-3">
          <button
              className="btn btn-ghost btn-sm text-xl"
            onClick={goToPreviousMonth}
            aria-label="Anterior"
          >
            &lt;
          </button>

          <div className="btn btn-ghost cursor-pointer gap-1">
            <span className="font-bold text-gray-800 dark:text-gray-100" onClick={toggleWheelPicker}>
              {format(currentDate, 'MMMM', { locale: es })}
            </span>
            <span className="font-bold text-gray-800 dark:text-gray-100" onClick={toggleWheelPicker}>
              {format(currentDate, 'yyyy')}
            </span>
          </div>

          <button
              className="btn btn-ghost btn-sm text-xl"
            onClick={goToNextMonth}
            aria-label="Siguiente"
          >
            &gt;
          </button>
        </div>

          {(showMonthPicker || showYearPicker || showWheelPicker) && (
            <div className="card absolute top-[50px] left-0 right-0 z-[100] p-2.5 transition-colors" ref={pickerRef}>
            {showMonthPicker && (
              <div className="grid grid-cols-3 gap-1 w-full max-h-[200px] overflow-y-auto">
                {months.map((monthName, index) => (
                  <div
                    key={monthName}
                    role="button"
                    tabIndex={0}
                    className={`px-2 py-2 text-center rounded cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${index === currentDate.getMonth() ? 'bg-[#1976d2] dark:bg-[#1565c0] text-white' : 'text-gray-800 dark:text-gray-100'}`}
                    onClick={() => handleMonthChange(index)}
                  >
                    {monthName}
                  </div>
                ))}
              </div>
            )}

            {showYearPicker && (
              <div className="grid grid-cols-3 gap-1 w-full max-h-[200px] overflow-y-auto">
                {years.map(year => (
                  <div
                    key={year}
                    role="button"
                    tabIndex={0}
                    className={`px-2 py-2 text-center rounded cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${year === currentDate.getFullYear() ? 'bg-[#1976d2] dark:bg-[#1565c0] text-white' : 'text-gray-800 dark:text-gray-100'}`}
                    onClick={() => handleYearChange(year)}
                  >
                    {year}
                  </div>
                ))}
              </div>
            )}

            {showWheelPicker && (
              <WheelPicker
                currentDate={currentDate}
                onDateChange={handleWheelDateChange}
                onClose={() => setShowWheelPicker(false)}
              />
            )}
          </div>
        )}

        <div className="flex mb-2">
          {weekDays.map((d, i) => (
            <div key={i} className="flex-1 text-center font-bold text-[0.8rem] text-gray-500 dark:text-gray-400">
              {d}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {month.map((week, index) => (
            <div key={index} className="flex">
              {week.map((day, idx) => {
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isSelected = isSameDay(day, currentDate);
                const hasEventsToday = hasEvents(day);
                const eventType = getEventType(day);

                const baseDay = 'flex-1 text-center py-2 cursor-pointer rounded-full m-[2px] transition-colors text-sm flex flex-col items-center justify-center min-h-[40px]';
                const monthText = isCurrentMonth ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500';
                const selectedText = isSelected ? 'bg-[#1976d2] dark:bg-[#1565c0] text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700';

                return (
                  <div
                    key={idx}
                    className={`${baseDay} ${monthText} ${selectedText}`}
                    onClick={() => handleDateClick(day)}
                    role="button"
                    aria-label={`Día ${format(day, 'd')}`}
                  >
                    <div className="mb-[2px]">{format(day, 'd')}</div>
                    {hasEventsToday && <div className={`w-[6px] h-[6px] rounded-full mt-0.5 ${dotClassFor(eventType)}`} />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// WheelPicker - Mantiene comportamiento, con clases dark
interface WheelPickerProps {
  currentDate: Date;
  onDateChange: (day: number, month: number, year: number) => void;
  onClose: () => void;
}

const WheelPicker = ({ currentDate, onDateChange, onClose }: WheelPickerProps) => {
  const [selectedDay, setSelectedDay] = useState(currentDate.getDate());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();

  const days = Array.from({ length: getDaysInMonth(selectedMonth, selectedYear) }, (_, i) => i + 1);
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const years = Array.from({ length: 21 }, (_, i) => selectedYear - 10 + i);

  const handleConfirm = () => onDateChange(selectedDay, selectedMonth, selectedYear);

  return (
    <div className="card w-full transition-colors">
      <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <button className="btn btn-ghost btn-sm" onClick={onClose}>
          Cancelar
        </button>
        <h3 className="m-0 text-base">Seleccionar fecha</h3>
        <button className="btn btn-primary btn-sm" onClick={handleConfirm}>
          Confirmar
        </button>
      </div>

      <div className="flex h-[200px] overflow-hidden">
        <div className="flex-1 relative overflow-hidden wheel-column">
          <div className="text-center py-2 font-semibold text-[0.9rem] text-secondary">Día</div>
          <div className="h-full overflow-y-auto snap-y snap-mandatory wheel">
            {days.map(d => (
              <div key={d} className={`snap-center text-center py-3 cursor-pointer transition-all text-[1.1rem] ${d === selectedDay ? 'text-[#1976f3] dark:text-[#1976f3] font-semibold text-[1.3rem]' : 'text-gray-800 dark:text-gray-100'}`} onClick={() => setSelectedDay(d)}>
                {d}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden wheel-column">
          <div className="text-center py-2 font-semibold text-[0.9rem] text-secondary">Mes</div>
          <div className="h-full overflow-y-auto snap-y snap-mandatory wheel">
            {months.map((m, i) => (
              <div key={m} className={`snap-center text-center py-3 cursor-pointer transition-all text-[1.1rem] ${i === selectedMonth ? 'text-[#1976f3] dark:text-[#1976f3] font-semibold text-[1.3rem]' : 'text-gray-800 dark:text-gray-100'}`} onClick={() => setSelectedMonth(i)}>
                {m}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden wheel-column">
          <div className="text-center py-2 font-semibold text-[0.9rem] text-secondary">Año</div>
          <div className="h-full overflow-y-auto snap-y snap-mandatory wheel">
            {years.map(y => (
              <div key={y} className={`snap-center text-center py-3 cursor-pointer transition-all text-[1.1rem] ${y === selectedYear ? 'text-[#1976f3] dark:text-[#1976f3] font-semibold text-[1.3rem]' : 'text-gray-800 dark:text-gray-100'}`} onClick={() => setSelectedYear(y)}>
                {y}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyCalendar;
