const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(value: string): boolean {
  return TIME_RE.test(value);
}

function toMinutes(time: string): number {
  const [h = "0", m = "0"] = time.split(":");
  return Number(h) * 60 + Number(m);
}

/** Длительность смены в минутах. Если конец <= начала — смена переходит через полночь. */
function durationMinutes(start: string, end: string): number {
  const diff = toMinutes(end) - toMinutes(start);
  return diff <= 0 ? diff + 24 * 60 : diff;
}

function formatHours(minutes: number): string {
  const hours = minutes / 60;
  const text = Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace(".", ",");
  return `${text} ч`;
}

export function formatDuration(start: string, end: string): string {
  return formatHours(durationMinutes(start, end));
}

function shortTime(time: string): string {
  return time.endsWith(":00") ? time.slice(0, 2) : time;
}

/** `08:00`–`18:00` → `08 - 18`; с минутами — `08:30 - 18`. */
export function formatRange(start: string, end: string): string {
  return `${shortTime(start)} - ${shortTime(end)}`;
}

/** `07:00`–`15:00` → `07:00 - 15:00` */
export function formatRangeFull(start: string, end: string): string {
  return `${start} - ${end}`;
}
