'use client';

import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, setMonth, setYear, addMonths, addWeeks, addDays } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { FollowUp, LEAD_STAGE, Lead } from '@/types';
import { useState, useCallback, useMemo } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import CalendarNavigationBar from '@/components/calendar/CalendarNavigationBar';
import BigCalendarViewport from '@/components/calendar/BigCalendarViewport';
import CalendarLegendModal from '@/components/calendar/CalendarLegendModal';
import {
  getDesktopCalendarFormats,
  getMobileCalendarFormats,
} from '@/components/calendar/getMobileCalendarFormats';

const locales = {
  'en-US': enUS,
};

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
  resource: FollowUp;
}

interface FollowUpCalendarProps {
  followUps: FollowUp[];
  onFollowUpSelect: (followUp: FollowUp) => void;
  onLeadSelect?: (leadId: string) => void;
  minimized?: boolean;
  onToggleMinimize?: () => void;
  hideHeader?: boolean;
  compact?: boolean;
  leadName?: string; // Override lead name for single-lead views
}

// Stage colors for calendar events - matching the standard color mapping
const getStageColor = (stage: LEAD_STAGE) => {
  switch (stage) {
    case LEAD_STAGE.NEW:
      return { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' }; // bg-blue-100 text-blue-800
    case LEAD_STAGE.HOT:
      return { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' }; // bg-red-100 text-red-800
    case LEAD_STAGE.WARM:
      return { bg: '#FFEDD5', border: '#F97316', text: '#9A3412' }; // bg-orange-100 text-orange-800
    case LEAD_STAGE.COLD:
      return { bg: '#CFFAFE', border: '#06B6D4', text: '#155E75' }; // bg-cyan-100 text-cyan-800
    case LEAD_STAGE.CONVERTED:
      return { bg: '#DCFCE7', border: '#22C55E', text: '#166534' }; // bg-green-100 text-green-800
    case LEAD_STAGE.CLOSED:
      return { bg: '#F3F4F6', border: '#9CA3AF', text: '#4B5563' }; // bg-gray-100 text-gray-600
    default:
      return { bg: '#F3F4F6', border: '#9CA3AF', text: '#374151' };
  }
};

export default function FollowUpCalendar({
  followUps,
  onFollowUpSelect,
  onLeadSelect,
  minimized = false,
  onToggleMinimize,
  hideHeader = false,
  compact = false,
  leadName,
}: FollowUpCalendarProps) {
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());
  const isMobile = useIsMobile();

  const followUpLegend = useMemo(
    () => [
      {
        title: 'Follow-up Colors (Lead Stage)',
        items: [
          { color: 'bg-blue-500', label: 'New Lead' },
          { color: 'bg-red-500', label: 'Hot Lead' },
          { color: 'bg-amber-500', label: 'Warm Lead' },
          { color: 'bg-cyan-400', label: 'Cold Lead' },
          { color: 'bg-green-500', label: 'Converted Lead' },
          { color: 'bg-purple-400', label: 'Missed Follow-up' },
        ],
      },
    ],
    []
  );

  // Convert follow-ups to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    return followUps.map((followUp) => {
      const lead = followUp.leadId as Lead;
      const displayName = leadName || lead?.name || 'Unknown';
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
  }, [followUps, leadName]);

  // Custom event styling based on lead stage
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const lead = event.resource.leadId as Lead;
    const stage = lead?.stage || event.resource.stageAtFollowUp;
    const colors = getStageColor(stage);
    
    // Check if it's a past event that's still scheduled (missed)
    const isPast = event.start < new Date() && event.resource.status === 'Scheduled';
    
    return {
      style: {
        backgroundColor: isPast ? '#F3E8FF' : colors.bg, // Purple for missed
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

  const handleEventSelect = useCallback((event: CalendarEvent) => {
    onFollowUpSelect(event.resource);
  }, [onFollowUpSelect]);

  const handleNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  const handleViewChange = useCallback((newView: View) => {
    setView(newView);
  }, []);

  const handleMonthChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value);
    setDate(setMonth(date, newMonth));
  }, [date]);

  const handleYearChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value);
    setDate(setYear(date, newYear));
  }, [date]);

  // Navigate Previous based on current view
  const handlePrevious = useCallback(() => {
    if (view === 'month') {
      setDate(addMonths(date, -1));
    } else if (view === 'week') {
      setDate(addWeeks(date, -1));
    } else if (view === 'day') {
      setDate(addDays(date, -1));
    }
  }, [date, view]);

  // Navigate Next based on current view
  const handleNext = useCallback(() => {
    if (view === 'month') {
      setDate(addMonths(date, 1));
    } else if (view === 'week') {
      setDate(addWeeks(date, 1));
    } else if (view === 'day') {
      setDate(addDays(date, 1));
    }
  }, [date, view]);

  const calendarFormats = useMemo(
    () => (isMobile ? getMobileCalendarFormats() : getDesktopCalendarFormats()),
    [isMobile]
  );

  if (minimized) {
    return (
      <div 
        onClick={onToggleMinimize}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Follow-Up Calendar</h3>
              <p className="text-sm text-gray-500">Click to expand</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white ${hideHeader ? '' : 'rounded-xl shadow-sm border border-gray-200'} overflow-hidden`}>
      {/* Calendar Header - conditionally shown */}
      {!hideHeader && (
      <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6 md:py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 md:h-10 md:w-10">
            <svg className="h-5 w-5 text-blue-600 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 md:text-base">Follow-Up Calendar</h3>
            <p className="text-xs text-gray-500 md:text-sm">{events.length} follow-ups scheduled</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <CalendarLegendModal
            sections={followUpLegend}
            triggerPrefix="📋"
            triggerLabel="Lead Stage"
            triggerDots={[
              { color: 'bg-blue-500' },
              { color: 'bg-red-500' },
              { color: 'bg-amber-500' },
              { color: 'bg-green-500' },
            ]}
            hoverBgClass="hover:bg-blue-50"
          />
          {onToggleMinimize && (
            <button
              onClick={onToggleMinimize}
              className="hidden rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 md:block"
              title="Minimize calendar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
      )}

      <CalendarNavigationBar
        view={view}
        date={date}
        accent="teal"
        onPrevious={handlePrevious}
        onNext={handleNext}
        onViewChange={handleViewChange}
        onMonthChange={handleMonthChange}
        onYearChange={handleYearChange}
        onToday={() => handleNavigate(new Date())}
      />

      <BigCalendarViewport compact={compact}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          date={date}
          onNavigate={handleNavigate}
          onView={handleViewChange}
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
