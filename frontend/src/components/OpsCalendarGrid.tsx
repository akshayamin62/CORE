'use client';

import OpsScheduleCalendar from '@/components/OpsScheduleCalendar';
import OpsScheduleOverview from '@/components/OpsScheduleOverview';
import TeamMeetSidebar from '@/components/TeamMeetSidebar';
import MobileCollapsibleCalendarSection from '@/components/MobileCollapsibleCalendarSection';
import { OpsSchedule, TeamMeet } from '@/types';

interface OpsCalendarGridProps {
  title?: string;
  subtitle?: string;
  summary?: string;
  schedules: OpsSchedule[];
  teamMeets: TeamMeet[];
  currentUserId: string;
  onScheduleSelect: (schedule: OpsSchedule) => void;
  onDateSelect: (date: Date) => void;
  onTeamMeetSelect: (teamMeet: TeamMeet) => void;
  /** Dashboard uses OpsScheduleOverview; registration page uses TeamMeetSidebar */
  sidebar?: 'overview' | 'teamMeet';
  onScheduleClick?: () => void;
  onScheduleTeamMeet?: () => void;
  onTeamMeetClick?: (teamMeet: TeamMeet) => void;
  onTaskClick?: (schedule: OpsSchedule) => void;
}

export default function OpsCalendarGrid({
  title = 'Schedule',
  subtitle = 'Meetings and tasks',
  summary,
  schedules,
  teamMeets,
  currentUserId,
  onScheduleSelect,
  onDateSelect,
  onTeamMeetSelect,
  sidebar = 'overview',
  onScheduleClick,
  onScheduleTeamMeet,
  onTeamMeetClick,
  onTaskClick,
}: OpsCalendarGridProps) {
  const scheduleSummary =
    summary ??
    `${schedules.length} task${schedules.length === 1 ? '' : 's'} • ${teamMeets.length} meeting${teamMeets.length === 1 ? '' : 's'}`;

  return (
    <MobileCollapsibleCalendarSection
      title={title}
      subtitle={subtitle}
      summary={scheduleSummary}
      className="mb-6 md:mb-8"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 lg:gap-6">
        <div className="lg:col-span-3">
          <OpsScheduleCalendar
            schedules={schedules}
            onScheduleSelect={onScheduleSelect}
            onDateSelect={onDateSelect}
            teamMeets={teamMeets}
            onTeamMeetSelect={onTeamMeetSelect}
            currentUserId={currentUserId}
          />
        </div>
        <div className="lg:col-span-1">
          {sidebar === 'overview' ? (
            <OpsScheduleOverview
              opsTasks={schedules}
              teamMeets={teamMeets}
              onTaskClick={onTaskClick ?? onScheduleSelect}
              onTeamMeetClick={onTeamMeetClick ?? onTeamMeetSelect}
              onScheduleClick={onScheduleClick}
              onScheduleTeamMeet={onScheduleTeamMeet}
              currentUserId={currentUserId}
            />
          ) : (
            <TeamMeetSidebar
              teamMeets={teamMeets}
              onTeamMeetClick={onTeamMeetClick ?? onTeamMeetSelect}
              onScheduleClick={onScheduleTeamMeet}
              currentUserId={currentUserId}
            />
          )}
        </div>
      </div>
    </MobileCollapsibleCalendarSection>
  );
}
