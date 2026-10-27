export function getSiteDayBounds(timeZone?: string, referenceTimestamp: number = Date.now()) {
  const tz = timeZone || 'UTC';
  const refDate = new Date(referenceTimestamp);
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(refDate);

  const [year, month, day] = dateStr.split('-').map(Number);
  const utcGuess = Date.UTC(year, month - 1, day, 0, 0, 0);

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(new Date(utcGuess));

  const p = Object.fromEntries(parts.map((pt) => [pt.type, pt.value]));
  const guessInTzMs = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second)
  );

  const offsetMs = guessInTzMs - utcGuess;
  const startOfDayUtc = utcGuess - offsetMs;
  const yesterdayStartUtc = startOfDayUtc - 24 * 3600 * 1000;
  const yesterdayEndUtc = startOfDayUtc;

  return {
    startOfDayUtc,
    toUtc: referenceTimestamp,
    yesterdayStartUtc,
    yesterdayEndUtc,
  };
}

export function formatTimeInTz(utcMs: number, timeZone?: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timeZone || 'UTC',
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(utcMs));
  } catch {
    const d = new Date(utcMs);
    return `${d.getUTCHours()}:${d.getUTCMinutes().toString().padStart(2, '0')}`;
  }
}

// Whole-hour boundaries (in the given timezone) between fromUtc and toUtc, thinned so
// at most maxTicks are returned (always keeping the last one). Works for half-hour offsets like Asia/Kolkata.
export function getHourTicksInTz(
  fromUtc: number,
  toUtc: number,
  timeZone?: string,
  maxTicks: number = 10
): number[] {
  const QUARTER = 15 * 60 * 1000;
  const minuteFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: timeZone || 'UTC',
    minute: '2-digit',
  });
  const hourTicks: number[] = [];
  for (let t = Math.ceil(fromUtc / QUARTER) * QUARTER; t <= toUtc; t += QUARTER) {
    if (Number(minuteFmt.format(new Date(t))) === 0) hourTicks.push(t);
  }
  const step = Math.max(1, Math.ceil(hourTicks.length / maxTicks));
  return hourTicks.filter((_, i) => (hourTicks.length - 1 - i) % step === 0);
}

export function formatTime12hInTz(utcMs: number, timeZone?: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'UTC',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(utcMs));
  } catch {
    return new Date(utcMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

export function formatDwellDuration(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return '--';
  const totalSeconds = Math.round(minutes * 60);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
