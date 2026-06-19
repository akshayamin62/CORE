'use client';

import TeamMeetCalendar from '@/components/TeamMeetCalendar';
import TeamMeetSidebar from '@/components/TeamMeetSidebar';
import MobileCollapsibleCalendarSection from '@/components/MobileCollapsibleCalendarSection';
import { TeamMeet } from '@/types';

interface TeamMeetCalendarGridProps {
  title?: string;
  subtitle?: string;
  summary?: string;
  teamMeets: TeamMeet[];
  currentUserId?: string;
  onTeamMeetSelect: (teamMeet: TeamMeet) => void;
  onDateSelect?: (date: Date) => void;
  onScheduleClick?: () => void;
  className?: string;
}

export default function TeamMeetCalendarGrid({
  title = 'Team Meet Calendar',
  subtitle = 'Schedule and manage team meetings',
  summary,
  teamMeets,
  currentUserId,
  onTeamMeetSelect,
  onDateSelect,
  onScheduleClick,
  className = '',
}: TeamMeetCalendarGridProps) {
  const scheduleSummary =
    summary ?? `${teamMeets.length} meeting${teamMeets.length === 1 ? '' : 's'} scheduled`;

  return (
    <MobileCollapsibleCalendarSection
      title={title}
      subtitle={subtitle}
      summary={scheduleSummary}
      className={className}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 lg:gap-6">
        <div className="lg:col-span-3">
          <TeamMeetCalendar
            teamMeets={teamMeets}
            onTeamMeetSelect={onTeamMeetSelect}
            onDateSelect={onDateSelect}
            currentUserId={currentUserId}
          />
        </div>
        <div className="lg:col-span-1">
          <TeamMeetSidebar
            teamMeets={teamMeets}
            onTeamMeetClick={onTeamMeetSelect}
            onScheduleClick={onScheduleClick}
            currentUserId={currentUserId}
          />
        </div>
      </div>
    </MobileCollapsibleCalendarSection>
  );
}
