// types/index.ts
export interface CalendarEvent {
  id: number;
  title: string;
  date: Date;
  endTime: Date;
  color: string;
}

export interface WeeklyViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateChange: (date: Date) => void;
}

export interface MonthlyCalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  events: CalendarEvent[]; // Añadido para pasar eventos al calendario mensual
}

export interface EventProps {
  event: CalendarEvent;
  style?: React.CSSProperties;
}

export interface WheelPickerProps {
  currentDate: Date;
  onDateChange: (day: number, month: number, year: number) => void;
  onClose: () => void;
}