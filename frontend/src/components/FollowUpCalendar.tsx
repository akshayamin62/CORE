'use client';

import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { FollowUp, LEAD_STAGE, Lead } from '@/types';
import { useState, useCallback, useMemo } from 'react';

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
}: FollowUpCalendarProps) {
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());

  // Convert follow-ups to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    return followUps.map((followUp) => {
      const lead = followUp.leadId as Lead;
      const [hours, minutes] = followUp.scheduledTime.split(':').map(Number);
      const startDate = new Date(followUp.scheduledDate);
      startDate.setHours(hours, minutes, 0, 0);

      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + followUp.duration);

      return {
        id: followUp._id,
        title: `${lead?.name || 'Unknown'} - ${followUp.scheduledTime}`,
        start: startDate,
        end: endDate,
        resource: followUp,
      };
    });
  }, [followUps]);

  // Custom event styling based on lead stage
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const lead = event.resource.leadId as Lead;
    const stage = lead?.stage || event.resource.stageAtFollowUp;
    const colors = getStageColor(stage);
    
    // Check if it's a past event that's still scheduled (missed)
    const isPast = event.start < new Date() && event.resource.status === 'Scheduled';
    
    return {
      style: {
        backgroundColor: isPast ? '#FEE2E2' : colors.bg,
        borderLeft: `4px solid ${isPast ? '#EF4444' : colors.border}`,
        color: isPast ? '#991B1B' : colors.text,
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Calendar Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Follow-Up Calendar</h3>
            <p className="text-sm text-gray-500">{events.length} follow-ups scheduled</p>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded bg-blue-500"></span>
            <span className="text-gray-600">New</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded bg-red-500"></span>
            <span className="text-gray-600">Hot</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded bg-amber-500"></span>
            <span className="text-gray-600">Warm</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded bg-cyan-200 "></span>
            <span className="text-gray-600">Cold</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded bg-green-500"></span>
            <span className="text-gray-600">Converted</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-sm bg-red-100 border border-red-400"></span>
            <span className="text-gray-600">Missed</span>
          </div>
          
          {onToggleMinimize && (
            <button
              onClick={onToggleMinimize}
              className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Minimize calendar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Calendar */}
      <div className="p-4" style={{ height: '600px' }}>
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
          formats={{
            timeGutterFormat: 'HH:mm',
            eventTimeRangeFormat: ({ start, end }) =>
              `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`,
          }}
        />
      </div>
    </div>
  );
}
