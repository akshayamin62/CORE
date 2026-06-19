'use client';

import ReferrerFollowUpCalendar from '@/components/ReferrerFollowUpCalendar';
import ReferrerFollowUpSidebar from '@/components/ReferrerFollowUpSidebar';
import MobileCollapsibleCalendarSection from '@/components/MobileCollapsibleCalendarSection';
import { ReferrerFollowUp } from '@/types';

interface ReferrerFollowUpCalendarGridProps {
  title?: string;
  subtitle?: string;
  summary?: string;
  followUps: ReferrerFollowUp[];
  today: ReferrerFollowUp[];
  missed: ReferrerFollowUp[];
  upcoming: ReferrerFollowUp[];
  onFollowUpSelect: (followUp: ReferrerFollowUp) => void;
  referrerName?: string;
  basePath?: string;
  showReferrerLink?: boolean;
  className?: string;
  headerAction?: React.ReactNode;
}

export default function ReferrerFollowUpCalendarGrid({
  title = 'Referrer Follow-Up Calendar',
  subtitle = 'Scheduled follow-ups with referrers',
  summary,
  followUps,
  today,
  missed,
  upcoming,
  onFollowUpSelect,
  referrerName,
  basePath,
  showReferrerLink,
  className = '',
  headerAction,
}: ReferrerFollowUpCalendarGridProps) {
  const scheduleSummary =
    summary ??
    `${followUps.length} scheduled • ${missed.length} missed • ${today.length} today`;

  return (
    <div className={className}>
      {headerAction && (
        <div className="mb-4 flex justify-end">{headerAction}</div>
      )}
      <MobileCollapsibleCalendarSection
        title={title}
        subtitle={subtitle}
        summary={scheduleSummary}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 lg:gap-6">
          <div className="lg:col-span-3">
            <ReferrerFollowUpCalendar
              followUps={followUps}
              onFollowUpSelect={onFollowUpSelect}
              referrerName={referrerName}
            />
          </div>
          <div className="lg:col-span-1">
            <ReferrerFollowUpSidebar
              today={today}
              missed={missed}
              upcoming={upcoming}
              onFollowUpClick={onFollowUpSelect}
              referrerName={referrerName}
              basePath={basePath}
              showReferrerLink={showReferrerLink}
            />
          </div>
        </div>
      </MobileCollapsibleCalendarSection>
    </div>
  );
}
