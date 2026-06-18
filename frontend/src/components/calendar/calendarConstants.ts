export const CALENDAR_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const CALENDAR_MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export const CALENDAR_YEARS = Array.from({ length: 11 }, (_, i) => 2020 + i);

export type CalendarAccent = 'teal' | 'blue' | 'indigo';

const ACCENT_STYLES: Record<
  CalendarAccent,
  { activeView: string; today: string; selectFocus: string }
> = {
  teal: {
    activeView: 'bg-teal-600 text-white',
    today: 'text-teal-600 bg-teal-50 border-teal-200 hover:bg-teal-100',
    selectFocus: 'focus:ring-teal-500 focus:border-teal-500',
  },
  blue: {
    activeView: 'bg-blue-600 text-white',
    today: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100',
    selectFocus: 'focus:ring-blue-500 focus:border-blue-500',
  },
  indigo: {
    activeView: 'bg-indigo-600 text-white',
    today: 'text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100',
    selectFocus: 'focus:ring-indigo-500 focus:border-indigo-500',
  },
};

export function getCalendarAccentStyles(accent: CalendarAccent) {
  return ACCENT_STYLES[accent];
}
