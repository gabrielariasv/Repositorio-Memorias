// components/WeeklyView/WeeklyView.tsx
import { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { WeeklyViewProps } from '../../types';
import Event from '../Event/Event';
import { CalEvent, groupEventsByDay, getDateKeyInTZ, EventFragment } from '../../utils/calendar';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return isMobile;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0..23

const WeeklyView = ({ currentDate, events, onDateChange, onTimeSlotClick }: WeeklyViewProps) => {
  const isMobile = useIsMobile();
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate);

  // Sincroniza selectedDate con currentDate cuando cambia la prop
  useEffect(() => {
    setSelectedDate(currentDate);
  }, [currentDate]);

  const calEvents: CalEvent[] = useMemo(() => {
    return (events || [])
      .filter(ev => {
        // Filtrar eventos con fechas inválidas
        return ev.date && 
               ev.endTime && 
               !isNaN(ev.date.getTime()) && 
               !isNaN(ev.endTime.getTime()) && 
               ev.endTime > ev.date;
      })
      .map(ev => ({
        id: String(ev.id),
        title: ev.title,
        date: ev.date,
        endTime: ev.endTime,
        color: ev.color,
        raw: (ev as any).raw ?? undefined
      }));
  }, [events]);

  const eventsByDay = useMemo(() => groupEventsByDay(calEvents), [calEvents]);

  useEffect(() => {
    if (isMobile) {
      setWeekDays([selectedDate]);
    } else {
      const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
      const days: Date[] = [];
      for (let i = 0; i < 7; i++) days.push(addDays(startDate, i));
      setWeekDays(days);
    }
  }, [currentDate, selectedDate, isMobile]);

  const handleDateClick = (day: Date): void => {
    setSelectedDate(day);
    onDateChange(day);
  };

  const navigateDays = (direction: 'prev' | 'next'): void => {
    const increment = isMobile ? 1 : 7;
    const newDate = addDays(currentDate, direction === 'next' ? increment : -increment);
    onDateChange(newDate);
    setSelectedDate(newDate);
  };

  const navigateToToday = (): void => {
    const today = new Date();
    onDateChange(today);
    setSelectedDate(today);
  };

  const renderFragment = (frag: EventFragment) => {
    // Top and height in px: 1 minute = 1px -> 60px per hour
    const top = frag.startHour * 60 + frag.startMinute;
    const height = frag.endHour * 60 + frag.endMinute - (frag.startHour * 60 + frag.startMinute);

    const fakeStart = new Date();
    fakeStart.setHours(frag.startHour, frag.startMinute, 0, 0);
    const fakeEnd = new Date();
    fakeEnd.setHours(frag.endHour % 24, frag.endMinute, 0, 0);

    return (
      <Event
        key={`${frag.id}-${frag.dayKey}-${frag.startHour}-${frag.startMinute}`}
        event={{
          id: frag.id,
          title: frag.title,
          date: fakeStart,
          endTime: fakeEnd,
          color: frag.color
        } as any}
        style={{
          position: 'absolute',
          left: '8px',
          right: '8px',
          top: `${top}px`,
          height: `${height}px`,
          zIndex: 50
        }}
      />
    );
  };

  return (
    <div className="flex flex-col h-full border border-gray-200 rounded-lg overflow-hidden bg-white dark:bg-gray-800 transition-colors">
      <div className="flex justify-between items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700">
        <button
          className="bg-transparent border-0 text-xl cursor-pointer px-3 py-2 rounded transition-colors hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100"
          onClick={() => navigateDays('prev')}
          aria-label="prev"
        >
          &lt;
        </button>

        <div className="font-semibold text-gray-800 dark:text-gray-100">
          {isMobile ? (
            <span onClick={navigateToToday} className="cursor-pointer px-2 py-1 rounded transition-colors hover:bg-gray-200 dark:hover:bg-gray-600">
              {format(selectedDate, 'EEEE, d MMMM', { locale: es })}
            </span>
          ) : (
            <span onClick={navigateToToday} className="cursor-pointer px-2 py-1 rounded transition-colors hover:bg-gray-200 dark:hover:bg-gray-600">
              Semana {format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd')} - {format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), 'd MMMM', { locale: es })}
            </span>
          )}
        </div>

        <button
          className="bg-transparent border-0 text-xl cursor-pointer px-3 py-2 rounded transition-colors hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100"
          onClick={() => navigateDays('next')}
          aria-label="next"
        >
          &gt;
        </button>
      </div>

      <div className="hidden md:flex border-b-2 border-gray-200 dark:border-gray-700 font-bold bg-gray-100 dark:bg-gray-700">
        <div className="w-[60px] min-w-[60px] border-r border-gray-200 dark:border-gray-700"></div>
        {weekDays.map((day, idx) => (
          <div
            key={day.toString()}
            onClick={() => handleDateClick(day)}
            className={`flex-1 text-center p-3 cursor-pointer transition-colors border-r border-gray-200 dark:border-gray-700 relative ${isSameDay(day, selectedDate) ? 'bg-blue-50 dark:bg-[#0b3b66] text-[#1976d2] dark:text-[#bfe1ff]' : 'hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100'} ${idx === weekDays.length - 1 ? 'border-r-0' : ''}`}
          >
            <div className="text-2xl font-bold">{format(day, 'd')}</div>
            <div className="text-sm uppercase">{format(day, 'EEE', { locale: es })}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-1 overflow-y-auto relative">
        {/* time column */}
        <div className="w-[60px] min-w-[60px] pt-0 relative">
          {HOURS.map(hour => (
            <div key={hour} className="h-[60px] border-b border-gray-200 dark:border-gray-700 flex items-center justify-center text-sm text-gray-500 dark:text-gray-300">
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* day columns */}
        {weekDays.map(day => {
          const key = getDateKeyInTZ(day);
          const frags = eventsByDay[key] || [];

          return (
            <div
              key={key}
              className="flex-1 border-r border-gray-200 dark:border-gray-700 relative"
              style={{ minHeight: `${HOURS.length * 60}px` }}
            >
              {/* hour rows - ahora clickeables */}
              {HOURS.map(hour => {
                const handleSlotClick = () => {
                  if (onTimeSlotClick) {
                    const clickedDate = new Date(day);
                    clickedDate.setHours(hour, 0, 0, 0);
                    onTimeSlotClick(clickedDate);
                  }
                };

                return (
                  <div
                    key={hour}
                    className={`h-[60px] border-b border-gray-100 dark:border-gray-700 flex items-start pl-1 text-sm text-gray-500 dark:text-gray-300 ${onTimeSlotClick ? 'cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20' : ''}`}
                    onClick={handleSlotClick}
                  >
                    &nbsp;
                  </div>
                );
              })}

              {/* render event fragments directly (cada Event es absolute respecto a este div relativo) */}
              {frags.map(f => renderFragment(f))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyView;
