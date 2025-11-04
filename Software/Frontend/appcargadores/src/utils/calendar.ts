// src/utils/calendar.ts
export type CalEvent = {
  id: string;
  title: string;
  date: Date;     // inicio (instant)
  endTime: Date;  // fin (instant)
  color?: string;
  raw?: any;
};

export type EventFragment = {
  id: string;
  title: string;
  dayKey: string; // 'YYYY-MM-DD' en TZ
  startHour: number;   // 0..24 (24 solo si termina en 00:00 del siguiente día)
  startMinute: number; // 0..59
  endHour: number;     // 0..24
  endMinute: number;
  color?: string;
  raw?: any;
};

const TZ = 'America/Santiago';

// Extrae componentes de fecha en zona horaria de Santiago
function getPartsInTZ(date: Date) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);

  const map: Record<string, string> = {};
  parts.forEach(p => { if (p.type !== 'literal') map[p.type] = p.value; });

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute)
  };
}

// Retorna fecha en formato 'YYYY-MM-DD' según zona horaria de Santiago
export function getDateKeyInTZ(date: Date) {
  const p = getPartsInTZ(date);
  const mm = String(p.month).padStart(2, '0');
  const dd = String(p.day).padStart(2, '0');
  return `${p.year}-${mm}-${dd}`;
}

// Extrae hora y minuto de una fecha según zona horaria de Santiago
export function getHourMinuteInTZ(date: Date) {
  const p = getPartsInTZ(date);
  return { hour: p.hour, minute: p.minute };
}

/**
 * splitEventIntoDayFragments
 * - Recibe un evento con instantes `date` y `endTime`.
 * - Devuelve un array de EventFragment, uno por cada día (en TZ) que cubre el evento.
 * - Los start/end son horas locales en TZ (0..24).
 */
export function splitEventIntoDayFragments(ev: CalEvent): EventFragment[] {
  const fragments: EventFragment[] = [];

  if (!ev.date || !ev.endTime || ev.endTime <= ev.date) return fragments;

  const startKey = getDateKeyInTZ(ev.date);
  const endKey = getDateKeyInTZ(ev.endTime);

  const getHM = (d: Date, allow24IfMidnight = false) => {
    const { hour, minute } = getHourMinuteInTZ(d);
    if (allow24IfMidnight && hour === 0 && minute === 0) {
      return { hour: 24, minute: 0 };
    }
    return { hour, minute };
  };

  let cur = new Date(ev.date);
  const maxLoops = 64;
  let loops = 0;

  while (true) {
    const dayKey = getDateKeyInTZ(cur);

    let startHM;
    if (dayKey === startKey) {
      startHM = getHM(ev.date, false);
    } else {
      startHM = { hour: 0, minute: 0 };
    }

    let endHM;
    if (dayKey === endKey) {
      endHM = getHM(ev.endTime, true);
    } else {
      endHM = { hour: 24, minute: 0 };
    }

    const startTotal = startHM.hour * 60 + startHM.minute;
    const endTotal = endHM.hour * 60 + endHM.minute;
    if (endTotal > startTotal) {
      fragments.push({
        id: ev.id,
        title: ev.title,
        dayKey,
        startHour: startHM.hour,
        startMinute: startHM.minute,
        endHour: endHM.hour,
        endMinute: endHM.minute,
        color: ev.color,
        raw: ev.raw
      });
    }

    if (dayKey === endKey) break;

    cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000);

    loops++;
    if (loops > maxLoops) break;
  }

  return fragments;
}

// Agrupa eventos por día, retornando un mapa de 'YYYY-MM-DD' -> fragmentos ordenados
export function groupEventsByDay(events: CalEvent[]): Record<string, EventFragment[]> {
  const map: Record<string, EventFragment[]> = {};
  events.forEach(ev => {
    const frags = splitEventIntoDayFragments(ev);
    frags.forEach(f => {
      if (!map[f.dayKey]) map[f.dayKey] = [];
      map[f.dayKey].push(f);
    });
  });

  Object.keys(map).forEach(k => {
    map[k].sort((a, b) => {
      const ta = a.startHour * 60 + a.startMinute;
      const tb = b.startHour * 60 + b.startMinute;
      return ta - tb;
    });
  });

  return map;
}

// Calcula total de horas ocupadas en un día fusionando intervalos solapados
export function computeDailyBusyHours(fragments: EventFragment[]): number {
  if (!fragments || fragments.length === 0) return 0;

  const intervals = fragments.map(f => {
    const s = f.startHour * 60 + f.startMinute;
    const e = f.endHour * 60 + f.endMinute;
    return [s, e] as [number, number];
  });
  intervals.sort((a, b) => a[0] - b[0]);

  const merged: [number, number][] = [];
  for (const intv of intervals) {
    if (merged.length === 0) merged.push(intv);
    else {
      const last = merged[merged.length - 1];
      if (intv[0] <= last[1]) {
        last[1] = Math.max(last[1], intv[1]);
      } else merged.push(intv);
    }
  }

  const totalMinutes = merged.reduce((sum, [s, e]) => sum + Math.max(0, e - s), 0);
  return totalMinutes / 60;
}
