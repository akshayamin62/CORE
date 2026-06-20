'use client';

import TeamMeetCalendar from '@/components/TeamMeetCalendar';
import TeamMeetSidebar from '@/components/TeamMeetSidebar';
import MobileCollapsibleCalendarSection from '@/components/MobileCollapsibleCalendarSection';
import { TeamMeet, ReferrerFollowUp } from '@/types';

interface TeamMeetCalendarGridProps {
  title?: string;
  subtitle?: string;
  summary?: string;
  teamMeets: TeamMeet[];
  referrerFollowUps?: ReferrerFollowUp[];
  referrerFollowUpsToday?: ReferrerFollowUp[];
  referrerFollowUpsMissed?: ReferrerFollowUp[];
  referrerFollowUpsUpcoming?: ReferrerFollowUp[];
  currentUserId?: string;
  onTeamMeetSelect: (teamMeet: TeamMeet) => void;
  onReferrerFollowUpSelect?: (followUp: ReferrerFollowUp) => void;
  onDateSelect?: (date: Date) => void;
  onScheduleClick?: () => void;
  referrerBasePath?: string;
  className?: string;
}

export default function TeamMeetCalendarGrid({
  title = 'Team Meet Calendar',
  subtitle = 'Schedule and manage team meetings',
  summary,
  teamMeets,
  referrerFollowUps = [],
  referrerFollowUpsToday = [],
  referrerFollowUpsMissed = [],
  referrerFollowUpsUpcoming = [],
  currentUserId,
  onTeamMeetSelect,
  onReferrerFollowUpSelect,
  onDateSelect,
  onScheduleClick,
  referrerBasePath = '/admin/referrers',
  className = '',
}: TeamMeetCalendarGridProps) {
  const scheduleSummary =
    summary ??
    `${teamMeets.length} meeting${teamMeets.length === 1 ? '' : 's'}${
      referrerFollowUps.length > 0
        ? ` • ${referrerFollowUps.length} referrer follow-up${referrerFollowUps.length === 1 ? '' : 's'}`
        : ''
    }`;

  return (
    <MobileCollapsibleCalendarSection
      title={title}
      subtitle={subtitle}
      summary={scheduleSummary}
      className={className}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 lg:items-start lg:gap-6">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-3">
          <TeamMeetCalendar
            teamMeets={teamMeets}
            referrerFollowUps={referrerFollowUps}
            onTeamMeetSelect={onTeamMeetSelect}
            onReferrerFollowUpSelect={onReferrerFollowUpSelect}
            onDateSelect={onDateSelect}
            currentUserId={currentUserId}
            hideHeader
          />
        </div>
        <div className="lg:col-span-1">
          <TeamMeetSidebar
            teamMeets={teamMeets}
            onTeamMeetClick={onTeamMeetSelect}
            onScheduleClick={onScheduleClick}
            currentUserId={currentUserId}
            referrerFollowUpsToday={referrerFollowUpsToday}
            referrerFollowUpsMissed={referrerFollowUpsMissed}
            referrerFollowUpsUpcoming={referrerFollowUpsUpcoming}
            onReferrerFollowUpClick={onReferrerFollowUpSelect}
            referrerBasePath={referrerBasePath}
          />
        </div>
      </div>
    </MobileCollapsibleCalendarSection>
  );
}
