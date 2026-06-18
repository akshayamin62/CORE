import { format } from 'date-fns';
import { Formats } from 'react-big-calendar';

export function getMobileCalendarFormats(): Formats {
  return {
    weekdayFormat: (date) => format(date, 'EEEEE'),
    dayFormat: (date) => format(date, 'd'),
    dayHeaderFormat: (date) => format(date, 'EEE d'),
    dayRangeHeaderFormat: ({ start, end }) =>
      `${format(start, 'd MMM')} – ${format(end, 'd MMM')}`,
    timeGutterFormat: 'HH:mm',
    eventTimeRangeFormat: ({ start, end }) =>
      `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`,
  };
}

export function getDesktopCalendarFormats(): Formats {
  return {
    timeGutterFormat: 'HH:mm',
    eventTimeRangeFormat: ({ start, end }) =>
      `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`,
  };
}
