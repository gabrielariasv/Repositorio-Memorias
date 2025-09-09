import React from 'react';
import { getHours, getMinutes } from 'date-fns';
import { EventProps } from '../../types';


// Tailwind-based version: no CSS import, classes inline
const Event = ({ event, style }: EventProps & { style?: React.CSSProperties }) => {
  return (
    <div
      className={`absolute left-[2px] right-[2px] p-1 rounded text-xs text-white overflow-hidden cursor-pointer shadow-sm z-10`}
      style={{
        backgroundColor: event.color,
        ...style,
      }}
    >
      <div className="font-bold mb-[2px]">
        {getHours(event.date)}:{getMinutes(event.date).toString().padStart(2, '0')}
      </div>
      <div className="overflow-hidden truncate whitespace-nowrap">{event.title}</div>
    </div>
  );
};


export default Event;