'use client';

import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, setMonth, setYear, addMonths, addWeeks, addDays } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { TeamMeet, TEAMMEET_STATUS, ReferrerFollowUp, REFERRER_STAGE, FOLLOWUP_STATUS } from '@/types';
import { useState, useCallback, useMemo } from 'react';
import { getFullName } from '@/utils/nameHelpers';
import { getReferrerDisplayName } from '@/utils/referrerFollowUpHelpers';
import { useIsMobile } from '@/hooks/useIsMobile';
import CalendarNavigationBar from '@/components/calendar/CalendarNavigationBar';
import BigCalendarViewport from '@/components/calendar/BigCalendarViewport';
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
  type: 'teammeet' | 'referrerFollowUp';
  resource: TeamMeet | ReferrerFollowUp;
}

interface TeamMeetCalendarProps {
  teamMeets: TeamMeet[];
  referrerFollowUps?: ReferrerFollowUp[];
  onTeamMeetSelect: (teamMeet: TeamMeet) => void;
  onReferrerFollowUpSelect?: (followUp: ReferrerFollowUp) => void;
  onDateSelect?: (date: Date) => void;
  minimized?: boolean;
  onToggleMinimize?: () => void;
  hideHeader?: boolean;
  compact?: boolean;
  currentUserId?: string;
}

// TeamMeet theme colors (Updated theme)
const getStatusColor = (status: TEAMMEET_STATUS) => {
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

const STATUS_LEGEND = [
  { color: 'bg-amber-400', label: 'Pending Confirmation' },
  { color: 'bg-pink-500', label: 'Confirmed' },
  { color: 'bg-red-800', label: 'Reschedule Requested' },
  { color: 'bg-slate-400', label: 'Cancelled' },
  { color: 'bg-teal-500', label: 'Completed' },
  { color: '', label: 'Invited', style: { backgroundColor: '#D97706' } as const },
  { color: 'bg-indigo-500', label: 'Referrer Follow-Up' },
];

const getReferrerStageColor = (stage: REFERRER_STAGE | string) => {
  switch (stage) {
    case REFERRER_STAGE.NEW:
      return { bg: '#E0E7FF', border: '#6366F1', text: '#3730A3' };
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
      return { bg: '#E0E7FF', border: '#6366F1', text: '#3730A3' };
  }
};

function StatusLegendContent() {
  return (
    <div className="space-y-1.5">
      {STATUS_LEGEND.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span
            className={`h-3 w-3 rounded ${item.color}`}
            style={item.style}
          />
          <span className="text-xs text-gray-600">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function TeamMeetCalendar({
  teamMeets,
  referrerFollowUps = [],
  onTeamMeetSelect,
  onReferrerFollowUpSelect,
  onDateSelect,
  minimized = false,
  onToggleMinimize,
  hideHeader = false,
  compact = false,
  currentUserId,
}: TeamMeetCalendarProps) {
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());
  const [showLegendModal, setShowLegendModal] = useState(false);
  const isMobile = useIsMobile();

  const events: CalendarEvent[] = useMemo(() => {
    const teamMeetEvents: CalendarEvent[] = teamMeets.map((teamMeet) => {
      const otherParty = teamMeet.requestedBy._id === currentUserId
        ? getFullName(teamMeet.requestedTo)
        : getFullName(teamMeet.requestedBy);

      const [hours, minutes] = teamMeet.scheduledTime.split(':').map(Number);
      const startDate = new Date(teamMeet.scheduledDate);
      startDate.setHours(hours, minutes, 0, 0);

      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + teamMeet.duration);

      return {
        id: `tm-${teamMeet._id}`,
        title: `${otherParty} - ${teamMeet.scheduledTime}`,
        start: startDate,
        end: endDate,
        type: 'teammeet' as const,
        resource: teamMeet,
      };
    });

    const referrerEvents: CalendarEvent[] = referrerFollowUps.map((followUp) => {
      const displayName = getReferrerDisplayName(
        typeof followUp.referrerId === 'object' ? followUp.referrerId : undefined
      );
      const [hours, minutes] = followUp.scheduledTime.split(':').map(Number);
      const startDate = new Date(followUp.scheduledDate);
      startDate.setHours(hours, minutes, 0, 0);

      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + followUp.duration);

      return {
        id: `rf-${followUp._id}`,
        title: `📞 ${displayName} - ${followUp.scheduledTime}`,
        start: startDate,
        end: endDate,
        type: 'referrerFollowUp' as const,
        resource: followUp,
      };
    });

    return [...teamMeetEvents, ...referrerEvents];
  }, [teamMeets, referrerFollowUps, currentUserId]);

  // Check if user is an invited participant (not sender or receiver)
  const isInvitedOnly = useCallback((teamMeet: TeamMeet) => {
    if (!currentUserId) return false;
    const isSender = teamMeet.requestedBy._id === currentUserId;
    const isReceiver = teamMeet.requestedTo._id === currentUserId;
    if (isSender || isReceiver) return false;
    return teamMeet.invitedUsers?.some((u) => u._id === currentUserId) || false;
  }, [currentUserId]);

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    if (event.type === 'referrerFollowUp') {
      const followUp = event.resource as ReferrerFollowUp;
      const referrer = typeof followUp.referrerId === 'object' ? followUp.referrerId : undefined;
      const stage = referrer?.stage || followUp.stageAtFollowUp;
      const colors = getReferrerStageColor(stage);
      const isMissed =
        event.start < new Date() && followUp.status === FOLLOWUP_STATUS.SCHEDULED;

      return {
        style: {
          backgroundColor: isMissed ? '#F3E8FF' : colors.bg,
          borderLeft: `4px solid ${isMissed ? '#9333EA' : colors.border}`,
          color: isMissed ? '#6B21A8' : colors.text,
          borderRadius: '4px',
          padding: '2px 6px',
          fontSize: '12px',
          fontWeight: 500,
          cursor: 'pointer',
        },
      };
    }

    const teamMeet = event.resource as TeamMeet;
    const status = teamMeet.status;

    if (isInvitedOnly(teamMeet)) {
      return {
        style: {
          backgroundColor: '#FDE8CD',
          borderLeft: '4px solid #D97706',
          color: '#92400E',
          borderRadius: '4px',
          padding: '2px 6px',
          fontSize: '12px',
          fontWeight: 500,
          cursor: 'pointer',
        },
      };
    }

    const colors = getStatusColor(status);
    
    return {
      style: {
        backgroundColor: colors.bg,
        borderLeft: `4px solid ${colors.border}`,
        color: colors.text,
        borderRadius: '4px',
        padding: '2px 6px',
        fontSize: '12px',
        fontWeight: 500,
        cursor: 'pointer',
      },
    };
  }, [isInvitedOnly]);

  const handleEventSelect = useCallback((event: CalendarEvent) => {
    if (event.type === 'referrerFollowUp') {
      onReferrerFollowUpSelect?.(event.resource as ReferrerFollowUp);
    } else {
      onTeamMeetSelect(event.resource as TeamMeet);
    }
  }, [onTeamMeetSelect, onReferrerFollowUpSelect]);

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

  // Handle slot selection (for creating new meetings)
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
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Team Meet Calendar</h3>
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
              <h3 className="text-sm font-semibold text-gray-900 md:text-base">Team Meet Calendar</h3>
              <p className="text-xs text-gray-500 md:text-sm">
                {teamMeets.length} meeting{teamMeets.length === 1 ? '' : 's'}
                {referrerFollowUps.length > 0 && (
                  <> • {referrerFollowUps.length} referrer follow-up{referrerFollowUps.length === 1 ? '' : 's'}</>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative group">
              <button
                type="button"
                onClick={() => {
                  if (isMobile) setShowLegendModal(true);
                }}
                className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 transition-colors hover:bg-pink-50 md:cursor-help"
                aria-label="Team Meet status colors"
              >
                <span className="text-xs text-gray-500">👥</span>
                {STATUS_LEGEND.map((item) => (
                  <span
                    key={item.label}
                    className={`h-2 w-2 rounded ${item.color}`}
                    style={item.style}
                  />
                ))}
                <span className="text-xs text-gray-500">Team Meet</span>
              </button>
              {/* Desktop hover tooltip */}
              <div className="absolute right-0 top-full z-50 mt-2 hidden w-48 rounded-lg border border-gray-200 bg-white p-3 opacity-0 shadow-lg transition-all duration-200 invisible group-hover:visible group-hover:opacity-100 md:block">
                <p className="mb-2 text-xs font-semibold text-gray-700">Team Meet Status Colors</p>
                <StatusLegendContent />
              </div>
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
      )}

      <CalendarNavigationBar
        view={view}
        date={date}
        accent="blue"
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
          onSelectSlot={handleSelectSlot}
          onDrillDown={isMobile && onDateSelect ? handleDrillDown : undefined}
          selectable={!!onDateSelect}
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

      {showLegendModal && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[60] bg-black/30 md:hidden"
            aria-label="Close legend"
            onClick={() => setShowLegendModal(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-[61] w-[calc(100%-2rem)] max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 bg-white p-4 shadow-xl md:hidden">
            <p className="mb-3 text-sm font-semibold text-gray-800">Team Meet Status Colors</p>
            <StatusLegendContent />
            <button
              type="button"
              onClick={() => setShowLegendModal(false)}
              className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </>
      )}
    </div>
  );
}
