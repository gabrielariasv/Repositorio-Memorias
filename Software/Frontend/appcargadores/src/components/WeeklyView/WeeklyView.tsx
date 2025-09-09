// components/WeeklyView/WeeklyView.tsx
import React, { useState, useEffect } from 'react';
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  getHours,
  getMinutes,
  startOfDay,
  isToday
} from 'date-fns';
import { es } from 'date-fns/locale';
import { WeeklyViewProps } from '../../types';
import Event from '../Event/Event';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return isMobile;
};

const WeeklyView = ({ currentDate, events, onDateChange }: WeeklyViewProps) => {
  const isMobile = useIsMobile();
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate);
  const hours = Array.from({ length: 15 }, (_, i) => i + 7); // 7:00 - 21:00

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

  const getEventsForDay = (day: Date) => events.filter(event => isSameDay(event.date, day));

  const getEventPosition = (event: any) => {
    const startHour = getHours(event.date);
    const startMinute = getMinutes(event.date);
    const endHour = getHours(event.endTime);
    const endMinute = getMinutes(event.endTime);

    // 1 hour = 60px (consistent con CSS de time-slot)
    const top = ((startHour - 7) * 60 + startMinute);
    const height = ((endHour - startHour) * 60 + (endMinute - startMinute));

    return { top, height };
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
              {isToday(selectedDate) && <span className="ml-2 inline-block bg-[#1976d2] dark:bg-[#1565c0] text-white px-2 py-0.5 rounded-full text-xs">Hoy</span>}
            </span>
          ) : (
            <span onClick={navigateToToday} className="cursor-pointer px-2 py-1 rounded transition-colors hover:bg-gray-200 dark:hover:bg-gray-600">
              Semana {format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd')} - {format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), 'd MMMM', { locale: es })}
              {isToday(currentDate) && <span className="ml-2 inline-block bg-[#1976d2] dark:bg-[#1565c0] text-white px-2 py-0.5 rounded-full text-xs">Esta semana</span>}
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

      {/* header - oculto en mobile */}
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
            {isToday(day) && <div className="absolute top-1 right-1 bg-[#1976d2] dark:bg-[#1565c0] text-white text-xs px-1 rounded">Hoy</div>}
          </div>
        ))}
      </div>

      <div className="flex flex-1 overflow-y-auto relative">
        <div className="w-[60px] min-w-[60px] pt-1">
          {hours.map(hour => (
            <div key={hour} className="h-[60px] border-b border-gray-200 dark:border-gray-700 flex items-center justify-center text-sm text-gray-500 dark:text-gray-300">
              {hour}:00
            </div>
          ))}
        </div>

        {weekDays.map(day => (
          <div key={day.toString()} className="flex-1 border-r border-gray-200 dark:border-gray-700 relative">
            {hours.map(hour => (
              <div key={`${day.toString()}-${hour}`} className="h-[60px] border-b border-gray-100 dark:border-gray-700 flex items-start pl-1 text-sm text-gray-500 dark:text-gray-300">
                &nbsp;
              </div>
            ))}

            {getEventsForDay(day).map(event => {
              const { top, height } = getEventPosition(event);
              return (
                <Event
                  key={event.id}
                  event={event}
                  style={{
                    top: `${top}px`,
                    height: `${height}px`
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeeklyView;
