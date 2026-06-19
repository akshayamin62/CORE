'use client';

import FollowUpCalendar from '@/components/FollowUpCalendar';
import FollowUpSidebar from '@/components/FollowUpSidebar';
import MobileCollapsibleCalendarSection from '@/components/MobileCollapsibleCalendarSection';
import { FollowUp } from '@/types';

interface FollowUpCalendarGridProps {
  title?: string;
  subtitle?: string;
  summary?: string;
  followUps: FollowUp[];
  today: FollowUp[];
  missed: FollowUp[];
  upcoming: FollowUp[];
  onFollowUpSelect: (followUp: FollowUp) => void;
  leadName?: string;
  basePath?: string;
  showLeadLink?: boolean;
  className?: string;
}

export default function FollowUpCalendarGrid({
  title = 'Follow-Up Calendar',
  subtitle = 'Scheduled follow-ups and meetings',
  summary,
  followUps,
  today,
  missed,
  upcoming,
  onFollowUpSelect,
  leadName,
  basePath,
  showLeadLink,
  className = '',
}: FollowUpCalendarGridProps) {
  const scheduleSummary =
    summary ??
    `${followUps.length} scheduled • ${missed.length} missed • ${today.length} today`;

  return (
    <MobileCollapsibleCalendarSection
      title={title}
      subtitle={subtitle}
      summary={scheduleSummary}
      className={className}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 lg:gap-6">
        <div className="lg:col-span-3">
          <FollowUpCalendar
            followUps={followUps}
            onFollowUpSelect={onFollowUpSelect}
            leadName={leadName}
          />
        </div>
        <div className="lg:col-span-1">
          <FollowUpSidebar
            today={today}
            missed={missed}
            upcoming={upcoming}
            onFollowUpClick={onFollowUpSelect}
            leadName={leadName}
            basePath={basePath}
            showLeadLink={showLeadLink}
          />
        </div>
      </div>
    </MobileCollapsibleCalendarSection>
  );
}
