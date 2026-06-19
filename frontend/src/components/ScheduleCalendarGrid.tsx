'use client';

import ScheduleCalendar from '@/components/ScheduleCalendar';
import ScheduleOverview from '@/components/ScheduleOverview';
import MobileCollapsibleCalendarSection from '@/components/MobileCollapsibleCalendarSection';
import { FollowUp, TeamMeet } from '@/types';

interface ScheduleCalendarGridProps {
  title?: string;
  subtitle?: string;
  summary?: string;
  followUps: FollowUp[];
  teamMeets: TeamMeet[];
  currentUserId?: string;
  onFollowUpSelect: (followUp: FollowUp) => void;
  onTeamMeetSelect: (teamMeet: TeamMeet) => void;
  onDateSelect?: (date: Date) => void;
  onFollowUpClick?: (followUp: FollowUp) => void;
  onTeamMeetClick?: (teamMeet: TeamMeet) => void;
  onScheduleClick?: () => void;
  showLeadLink?: boolean;
  readOnly?: boolean;
  basePath?: string;
  className?: string;
}

export default function ScheduleCalendarGrid({
  title = 'Schedule Calendar',
  subtitle = 'Follow-ups and team meetings',
  summary,
  followUps,
  teamMeets,
  currentUserId,
  onFollowUpSelect,
  onTeamMeetSelect,
  onDateSelect,
  onFollowUpClick,
  onTeamMeetClick,
  onScheduleClick,
  showLeadLink = true,
  readOnly = false,
  basePath,
  className = '',
}: ScheduleCalendarGridProps) {
  const scheduleSummary =
    summary ??
    `${followUps.length} follow-up${followUps.length === 1 ? '' : 's'} • ${teamMeets.length} team meet${teamMeets.length === 1 ? '' : 's'}`;

  return (
    <MobileCollapsibleCalendarSection
      title={title}
      subtitle={subtitle}
      summary={scheduleSummary}
      className={className}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 lg:gap-6">
        <div className="lg:col-span-3">
          <ScheduleCalendar
            followUps={followUps}
            teamMeets={teamMeets}
            onFollowUpSelect={onFollowUpSelect}
            onTeamMeetSelect={onTeamMeetSelect}
            onDateSelect={onDateSelect}
            minimized={false}
            currentUserId={currentUserId}
            readOnly={readOnly}
          />
        </div>
        <div className="lg:col-span-1">
          <ScheduleOverview
            followUps={followUps}
            teamMeets={teamMeets}
            onFollowUpClick={onFollowUpClick ?? onFollowUpSelect}
            onTeamMeetClick={onTeamMeetClick ?? onTeamMeetSelect}
            onScheduleClick={onScheduleClick}
            currentUserId={currentUserId}
            showLeadLink={showLeadLink}
            basePath={basePath}
            readOnly={readOnly}
          />
        </div>
      </div>
    </MobileCollapsibleCalendarSection>
  );
}
