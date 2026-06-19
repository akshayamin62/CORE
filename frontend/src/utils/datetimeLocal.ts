const IST_TIMEZONE = 'Asia/Kolkata';

function getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((p) => p.type === type)?.value ?? '';
}

/** Format a date for `<input type="datetime-local" />` in IST */
export function toDatetimeLocalValue(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  return `${getPart(parts, 'year')}-${getPart(parts, 'month')}-${getPart(parts, 'day')}T${getPart(parts, 'hour')}:${getPart(parts, 'minute')}`;
}

/** Parse datetime-local value as IST and return ISO string for API storage */
export function datetimeLocalToISO(dateTimeLocal: string): string {
  if (!dateTimeLocal) return dateTimeLocal;
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(dateTimeLocal)) {
    return new Date(dateTimeLocal).toISOString();
  }
  return new Date(`${dateTimeLocal}:00+05:30`).toISOString();
}
