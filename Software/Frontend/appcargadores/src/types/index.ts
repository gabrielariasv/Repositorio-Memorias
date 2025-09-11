// types/index.ts
export type CalendarEvent = {
  id: string;        // usar string si tus _id son ObjectId
  title: string;
  date: Date;
  endTime: Date;
  color?: string;
  raw?: any;
};

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