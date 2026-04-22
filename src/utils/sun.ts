import SunCalc from 'suncalc';

export interface SunTimes {
  sunrise: Date;
  sunset: Date;
}

export function getSunTimes(lat: number, lng: number, date: Date = new Date()): SunTimes {
  const times = SunCalc.getTimes(date, lat, lng);
  return {
    sunrise: times.sunrise,
    sunset: times.sunset,
  };
}

export function getRelativeTimeString(diffMs: number): string {
  const absDiff = Math.abs(diffMs);
  const totalMinutes = Math.floor(absDiff / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const sign = diffMs >= 0 ? '+' : '-';
  const prefix = diffMs >= 0 ? 'after' : 'before';

  if (hours === 0) {
    return `${sign}${minutes}m ${prefix}`;
  }
  return `${sign}${hours}h ${minutes}m ${prefix}`;
}

export type SunEventType = 'sunrise' | 'sunset';

export interface ClosestEvent {
  type: SunEventType;
  time: Date;
  diffMs: number;
}

export function getClosestEvent(lat: number, lng: number, now: Date): ClosestEvent {
  const today = getSunTimes(lat, lng, now);
  const tomorrow = getSunTimes(lat, lng, new Date(now.getTime() + 24 * 60 * 60 * 1000));
  const yesterday = getSunTimes(lat, lng, new Date(now.getTime() - 24 * 60 * 60 * 1000));

  const events: { type: SunEventType; time: Date }[] = [
    { type: 'sunrise', time: yesterday.sunrise },
    { type: 'sunset', time: yesterday.sunset },
    { type: 'sunrise', time: today.sunrise },
    { type: 'sunset', time: today.sunset },
    { type: 'sunrise', time: tomorrow.sunrise },
    { type: 'sunset', time: tomorrow.sunset },
  ];

  let closest = events[0];
  let minDiff = Math.abs(now.getTime() - closest.time.getTime());

  for (const event of events) {
    const diff = Math.abs(now.getTime() - event.time.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      closest = event;
    }
  }

  return {
    ...closest,
    diffMs: now.getTime() - closest.time.getTime(),
  };
}
