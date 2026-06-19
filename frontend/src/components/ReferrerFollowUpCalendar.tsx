'use client';

import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, setMonth, setYear, addMonths, addWeeks, addDays } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { ReferrerFollowUp, REFERRER_STAGE, ReferrerPopulated } from '@/types';
import { useState, useCallback, useMemo } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import CalendarNavigationBar from '@/components/calendar/CalendarNavigationBar';
import BigCalendarViewport from '@/components/calendar/BigCalendarViewport';
import {
  getDesktopCalendarFormats,
  getMobileCalendarFormats,
} from '@/components/calendar/getMobileCalendarFormats';
import { getReferrerDisplayName } from '@/utils/referrerFollowUpHelpers';

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: ReferrerFollowUp;
}

interface ReferrerFollowUpCalendarProps {
  followUps: ReferrerFollowUp[];
  onFollowUpSelect: (followUp: ReferrerFollowUp) => void;
  hideHeader?: boolean;
  compact?: boolean;
  referrerName?: string;
}

const getStageColor = (stage: REFERRER_STAGE | string) => {
  switch (stage) {
    case REFERRER_STAGE.NEW:
      return { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' };
    case REFERRER_STAGE.HOT:
      return { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' };
    case REFERRER_STAGE.WARM:
      return { bg: '#FFEDD5', border: '#F97316', text: '#9A3412' };
    case REFERRER_STAGE.COLD:
      return { bg: '#CFFAFE', border: '#06B6D4', text: '#155E75' };
    case REFERRER_STAGE.CONVERTED:
      return { bg: '#DCFCE7', border: '#22C55E', text: '#166534' };
    case REFERRER_STAGE.CLOSED:
      return { bg: '#F3F4F6', border: '#9CA3AF', text: '#4B5563' };
    default:
      return { bg: '#F3F4F6', border: '#9CA3AF', text: '#374151' };
  }
};

export default function ReferrerFollowUpCalendar({
  followUps,
  onFollowUpSelect,
  hideHeader = false,
  compact = false,
  referrerName,
}: ReferrerFollowUpCalendarProps) {
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());
  const isMobile = useIsMobile();

  const events: CalendarEvent[] = useMemo(() => {
    return followUps.map((followUp) => {
      const referrer = followUp.referrerId as ReferrerPopulated;
      const displayName = referrerName || getReferrerDisplayName(referrer);
      const [hours, minutes] = followUp.scheduledTime.split(':').map(Number);
      const startDate = new Date(followUp.scheduledDate);
      startDate.setHours(hours, minutes, 0, 0);

      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + followUp.duration);

      return {
        id: followUp._id,
        title: `${displayName} - ${followUp.scheduledTime}`,
        start: startDate,
        end: endDate,
        resource: followUp,
      };
    });
  }, [followUps, referrerName]);

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const referrer = event.resource.referrerId as ReferrerPopulated;
    const stage = referrer?.stage || event.resource.stageAtFollowUp;
    const colors = getStageColor(stage);
    const isPast = event.start < new Date() && event.resource.status === 'Scheduled';

    return {
      style: {
        backgroundColor: isPast ? '#F3E8FF' : colors.bg,
        borderLeft: `4px solid ${isPast ? '#9333EA' : colors.border}`,
        color: isPast ? '#6B21A8' : colors.text,
        borderRadius: '4px',
        padding: '2px 6px',
        fontSize: '12px',
        fontWeight: 500,
        cursor: 'pointer',
      },
    };
  }, []);

  const handleEventSelect = useCallback(
    (event: CalendarEvent) => onFollowUpSelect(event.resource),
    [onFollowUpSelect]
  );

  const calendarFormats = useMemo(
    () => (isMobile ? getMobileCalendarFormats() : getDesktopCalendarFormats()),
    [isMobile]
  );

  return (
    <div className={`bg-white ${hideHeader ? '' : 'rounded-xl shadow-sm border border-gray-200'} overflow-hidden`}>
      {!hideHeader && (
        <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6 md:py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 md:h-10 md:w-10">
              <svg className="h-5 w-5 text-indigo-600 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 md:text-base">Referrer Follow-Up Calendar</h3>
              <p className="text-xs text-gray-500 md:text-sm">{events.length} follow-ups scheduled</p>
            </div>
          </div>
        </div>
      )}

      <CalendarNavigationBar
        view={view}
        date={date}
        accent="indigo"
        onPrevious={() => {
          if (view === 'month') setDate(addMonths(date, -1));
          else if (view === 'week') setDate(addWeeks(date, -1));
          else setDate(addDays(date, -1));
        }}
        onNext={() => {
          if (view === 'month') setDate(addMonths(date, 1));
          else if (view === 'week') setDate(addWeeks(date, 1));
          else setDate(addDays(date, 1));
        }}
        onViewChange={setView}
        onMonthChange={(e) => setDate(setMonth(date, parseInt(e.target.value)))}
        onYearChange={(e) => setDate(setYear(date, parseInt(e.target.value)))}
        onToday={() => setDate(new Date())}
      />

      <BigCalendarViewport compact={compact}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          date={date}
          onNavigate={setDate}
          onView={setView}
          onSelectEvent={handleEventSelect}
          selectable={false}
          eventPropGetter={eventStyleGetter}
          views={['month', 'week', 'day']}
          defaultView="month"
          popup
          style={{ height: '100%' }}
          toolbar={false}
          formats={calendarFormats}
        />
      </BigCalendarViewport>
    </div>
  );
}
