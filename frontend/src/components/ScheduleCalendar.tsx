'use client';

import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, setMonth, setYear, addMonths, addWeeks, addDays } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { FollowUp, LEAD_STAGE, Lead, TeamMeet, TEAMMEET_STATUS } from '@/types';
import { useState, useCallback, useMemo } from 'react';
import { getFullName } from '@/utils/nameHelpers';
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

// Type for calendar events - supports both FollowUp and TeamMeet
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'followup' | 'teammeet';
  resource: FollowUp | TeamMeet;
}

interface ScheduleCalendarProps {
  followUps: FollowUp[];
  teamMeets: TeamMeet[];
  onFollowUpSelect: (followUp: FollowUp) => void;
  onTeamMeetSelect: (teamMeet: TeamMeet) => void;
  onDateSelect?: (date: Date) => void;
  minimized?: boolean;
  onToggleMinimize?: () => void;
  hideHeader?: boolean;
  compact?: boolean;
  currentUserId?: string;
  leadName?: string;
  readOnly?: boolean;
}

// Stage colors for FollowUp events (Lead-based coloring)
const getStageColor = (stage: LEAD_STAGE) => {
  switch (stage) {
    case LEAD_STAGE.NEW:
      return { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' }; // Blue
    case LEAD_STAGE.HOT:
      return { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' }; // Red
    case LEAD_STAGE.WARM:
      return { bg: '#FFEDD5', border: '#F97316', text: '#9A3412' }; // Orange
    case LEAD_STAGE.COLD:
      return { bg: '#CFFAFE', border: '#06B6D4', text: '#155E75' }; // Cyan
    case LEAD_STAGE.CONVERTED:
      return { bg: '#DCFCE7', border: '#22C55E', text: '#166534' }; // Green
    case LEAD_STAGE.CLOSED:
      return { bg: '#F3F4F6', border: '#9CA3AF', text: '#4B5563' }; // Gray
    default:
      return { bg: '#F3F4F6', border: '#9CA3AF', text: '#374151' };
  }
};

// TeamMeet status colors (Updated theme)
const getTeamMeetStatusColor = (status: TEAMMEET_STATUS) => {
  switch (status) {
    case TEAMMEET_STATUS.PENDING_CONFIRMATION:
      return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' }; // Yellow/Amber
    case TEAMMEET_STATUS.CONFIRMED:
      return { bg: '#FCE7F3', border: '#EC4899', text: '#9D174D' }; // Pink
    case TEAMMEET_STATUS.REJECTED:
      return { bg: '#FEE2E2', border: '#991B1B', text: '#7F1D1D' }; // Dark Red
    case TEAMMEET_STATUS.CANCELLED:
      return { bg: '#F1F5F9', border: '#64748B', text: '#475569' }; // Slate (same)
    case TEAMMEET_STATUS.COMPLETED:
      return { bg: '#CCFBF1', border: '#14B8A6', text: '#115E59' }; // Teal
    default:
      return { bg: '#F3F4F6', border: '#9CA3AF', text: '#374151' };
  }
};

export default function ScheduleCalendar({
  followUps,
  teamMeets,
  onFollowUpSelect,
  onTeamMeetSelect,
  onDateSelect,
  minimized = false,
  onToggleMinimize,
  hideHeader = false,
  compact = false,
  currentUserId,
  leadName,
  readOnly = false,
}: ScheduleCalendarProps) {
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
          { color: 'bg-orange-500', label: 'Warm Lead' },
          { color: 'bg-cyan-400', label: 'Cold Lead' },
          { color: 'bg-green-500', label: 'Converted Lead' },
          { color: 'bg-purple-400', label: 'Missed Follow-up' },
        ],
      },
    ],
    []
  );

  const teamMeetLegend = useMemo(
    () => [
      {
        title: 'Team Meet Colors (Status)',
        items: [
          { color: 'bg-amber-400', label: 'Pending Confirmation' },
          { color: 'bg-pink-500', label: 'Confirmed' },
          { color: 'bg-red-800', label: 'Rejected' },
          { color: 'bg-slate-400', label: 'Cancelled' },
          { color: 'bg-teal-500', label: 'Completed' },
        ],
      },
    ],
    []
  );

  // Convert follow-ups to calendar events
  const followUpEvents: CalendarEvent[] = useMemo(() => {
    return followUps.map((followUp) => {
      const lead = followUp.leadId as Lead;
      const displayName = leadName || lead?.name || 'Unknown';
      const [hours, minutes] = followUp.scheduledTime.split(':').map(Number);
      const startDate = new Date(followUp.scheduledDate);
      startDate.setHours(hours, minutes, 0, 0);

      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + followUp.duration);

      return {
        id: `followup-${followUp._id}`,
        title: `📋 ${displayName} - ${followUp.scheduledTime}`,
        start: startDate,
        end: endDate,
        type: 'followup' as const,
        resource: followUp,
      };
    });
  }, [followUps, leadName]);

  // Convert team meets to calendar events
  const teamMeetEvents: CalendarEvent[] = useMemo(() => {
    return teamMeets.map((teamMeet) => {
      const otherParty = teamMeet.requestedBy._id === currentUserId
        ? getFullName(teamMeet.requestedTo)
        : getFullName(teamMeet.requestedBy);
      
      const [hours, minutes] = teamMeet.scheduledTime.split(':').map(Number);
      const startDate = new Date(teamMeet.scheduledDate);
      startDate.setHours(hours, minutes, 0, 0);

      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + teamMeet.duration);

      return {
        id: `teammeet-${teamMeet._id}`,
        title: `👥 ${otherParty} - ${teamMeet.scheduledTime}`,
        start: startDate,
        end: endDate,
        type: 'teammeet' as const,
        resource: teamMeet,
      };
    });
  }, [teamMeets, currentUserId]);

  // Combine all events
  const events = useMemo(() => [...followUpEvents, ...teamMeetEvents], [followUpEvents, teamMeetEvents]);

  // Custom event styling based on type and status
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    if (event.type === 'followup') {
      const followUp = event.resource as FollowUp;
      const lead = followUp.leadId as Lead;
      const stage = lead?.stage || followUp.stageAtFollowUp;
      const colors = getStageColor(stage);
      
      // Check if it's a past event that's still scheduled (missed)
      const isPast = event.start < new Date() && followUp.status === 'Scheduled';
      
      return {
        style: {
          backgroundColor: isPast ? '#F3E8FF' : colors.bg,
          borderLeft: `4px solid ${isPast ? '#9333EA' : colors.border}`,
          color: isPast ? '#6B21A8' : colors.text,
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: '11px',
          fontWeight: 500,
          cursor: 'pointer',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minHeight: '22px',
          lineHeight: '1.3',
        },
      };
    } else {
      // TeamMeet
      const teamMeet = event.resource as TeamMeet;

      // If user is only an invited participant, show in light brown
      const isSender = teamMeet.requestedBy._id === currentUserId;
      const isReceiver = teamMeet.requestedTo._id === currentUserId;
      const isOnlyInvited = !isSender && !isReceiver && teamMeet.invitedUsers?.some((u) => u._id === currentUserId);

      if (isOnlyInvited) {
        return {
          style: {
            backgroundColor: '#FDE8CD',
            borderLeft: '4px solid #D97706',
            color: '#92400E',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: 500,
            cursor: 'pointer',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minHeight: '22px',
            lineHeight: '1.3',
          },
        };
      }

      const colors = getTeamMeetStatusColor(teamMeet.status);
      
      return {
        style: {
          backgroundColor: colors.bg,
          borderLeft: `4px solid ${colors.border}`,
          color: colors.text,
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: '11px',
          fontWeight: 500,
          cursor: 'pointer',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minHeight: '22px',
          lineHeight: '1.3',
        },
      };
    }
  }, [currentUserId]);

  const handleEventSelect = useCallback((event: CalendarEvent) => {
    if (event.type === 'followup') {
      onFollowUpSelect(event.resource as FollowUp);
    } else {
      onTeamMeetSelect(event.resource as TeamMeet);
    }
  }, [onFollowUpSelect, onTeamMeetSelect]);

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

  // Handle slot selection (for creating new TeamMeets)
  const handleSelectSlot = useCallback(({ start }: { start: Date }) => {
    if (onDateSelect) {
      onDateSelect(start);
    }
  }, [onDateSelect]);

  const handleDrillDown = useCallback(
    (drillDate: Date) => {
      if (onDateSelect) {
        onDateSelect(drillDate);
      }
    },
    [onDateSelect]
  );

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
            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Combined Calendar</h3>
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
      {/* Calendar Header */}
      {!hideHeader && (
        <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between md:px-6 md:py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-100 md:h-10 md:w-10">
              <svg className="h-5 w-5 text-teal-600 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 md:text-base">Schedule Calendar</h3>
              <p className="text-xs text-gray-500 md:text-sm">
                {followUpEvents.length} follow-ups • {teamMeetEvents.length} team meets
                {readOnly && <span className="ml-2 italic text-amber-600">(Read-only view)</span>}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 self-end lg:self-auto">
            <CalendarLegendModal
              sections={followUpLegend}
              triggerPrefix="📋"
              triggerLabel="Follow-ups"
              triggerDots={[
                { color: 'bg-blue-500' },
                { color: 'bg-red-500' },
                { color: 'bg-orange-500' },
                { color: 'bg-green-500' },
              ]}
              hoverBgClass="hover:bg-blue-50"
            />
            <CalendarLegendModal
              sections={teamMeetLegend}
              triggerPrefix="👥"
              triggerLabel="Team Meets"
              triggerDots={[
                { color: 'bg-amber-400' },
                { color: 'bg-pink-500' },
                { color: 'bg-teal-500' },
              ]}
              hoverBgClass="hover:bg-pink-50"
            />
            {onToggleMinimize && (
              <button
                onClick={onToggleMinimize}
                className="hidden rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 lg:block"
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
          onSelectSlot={!readOnly ? handleSelectSlot : undefined}
          onDrillDown={isMobile && !readOnly && onDateSelect ? handleDrillDown : undefined}
          selectable={!readOnly && !!onDateSelect}
          longPressThreshold={isMobile ? 1 : 250}
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
