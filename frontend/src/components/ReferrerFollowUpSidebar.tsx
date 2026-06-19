'use client';

import { ReferrerFollowUp, FOLLOWUP_STATUS, REFERRER_STAGE, MEETING_TYPE } from '@/types';
import { format } from 'date-fns';
import Link from 'next/link';
import { getReferrerDisplayName, getReferrerIdFromFollowUp } from '@/utils/referrerFollowUpHelpers';

interface ReferrerFollowUpSidebarProps {
  today: ReferrerFollowUp[];
  missed: ReferrerFollowUp[];
  upcoming: ReferrerFollowUp[];
  onFollowUpClick: (followUp: ReferrerFollowUp) => void;
  hideHeader?: boolean;
  referrerName?: string;
  showReferrerLink?: boolean;
  basePath?: string;
}

const getStageBadgeColor = (stage: REFERRER_STAGE | string) => {
  switch (stage) {
    case REFERRER_STAGE.NEW:
      return 'bg-blue-100 text-blue-800';
    case REFERRER_STAGE.HOT:
      return 'bg-red-100 text-red-800';
    case REFERRER_STAGE.WARM:
      return 'bg-orange-100 text-orange-800';
    case REFERRER_STAGE.COLD:
      return 'bg-cyan-100 text-cyan-800';
    case REFERRER_STAGE.CONVERTED:
      return 'bg-green-100 text-green-800';
    case REFERRER_STAGE.CLOSED:
      return 'bg-gray-100 text-gray-600';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

interface ReferrerFollowUpItemProps {
  followUp: ReferrerFollowUp;
  onClick: () => void;
  showDate?: boolean;
  isMissed?: boolean;
  referrerName?: string;
  showReferrerLink?: boolean;
  basePath?: string;
}

function ReferrerFollowUpItem({
  followUp,
  onClick,
  showDate = false,
  isMissed = false,
  referrerName,
  showReferrerLink = true,
  basePath = '/admin/referrers',
}: ReferrerFollowUpItemProps) {
  const referrer = typeof followUp.referrerId === 'object' ? followUp.referrerId : undefined;
  const stage = referrer?.stage || followUp.stageAtFollowUp;
  const displayName = referrerName || getReferrerDisplayName(referrer);
  const referrerId = getReferrerIdFromFollowUp(followUp);

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg cursor-pointer transition-all hover:shadow-md ${
        isMissed
          ? 'bg-purple-50 border border-purple-200 hover:bg-purple-100'
          : 'bg-white border border-gray-200 hover:border-indigo-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {showReferrerLink && referrerId ? (
            <Link
              href={`${basePath}/${referrerId}`}
              onClick={(e) => e.stopPropagation()}
              className={`font-medium truncate block hover:underline ${isMissed ? 'text-purple-900' : 'text-gray-900'}`}
            >
              {displayName}
            </Link>
          ) : (
            <p className={`font-medium truncate ${isMissed ? 'text-purple-900' : 'text-gray-900'}`}>
              {displayName}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-medium ${isMissed ? 'text-purple-700' : 'text-gray-600'}`}>
              {followUp.scheduledTime}
            </span>
            {showDate && (
              <span className="text-xs text-gray-500">
                {format(new Date(followUp.scheduledDate), 'd MMM')}
              </span>
            )}
            <span className={`px-1.5 py-0.5 text-xs rounded ${getStageBadgeColor(stage)}`}>
              {stage}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {followUp.meetingType && (
            <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-1 rounded whitespace-nowrap">
              {followUp.meetingType === MEETING_TYPE.ONLINE ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              )}
            </span>
          )}
          <div className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
            isMissed ? 'bg-purple-200 text-purple-800' : 'bg-gray-100 text-gray-600'
          }`}>
            {followUp.duration}m
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReferrerFollowUpSidebar({
  today,
  missed,
  upcoming,
  onFollowUpClick,
  hideHeader = false,
  referrerName,
  showReferrerLink: showReferrerLinkProp,
  basePath = '/admin/referrers',
}: ReferrerFollowUpSidebarProps) {
  const showReferrerLink = showReferrerLinkProp !== undefined ? showReferrerLinkProp : !referrerName;

  return (
    <div className={`bg-white overflow-hidden h-fit ${hideHeader ? '' : 'rounded-xl shadow-sm border border-gray-200'}`}>
      {!hideHeader && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900">Follow-Up Overview</h3>
        </div>
      )}

      <div className="divide-y divide-gray-100">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <h4 className="text-sm font-semibold text-gray-700">Today</h4>
            <span className="ml-auto bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {today.length}
            </span>
          </div>
          {today.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No follow-ups today</p>
          ) : (
            <div className="space-y-2">
              {today.map((followUp) => (
                <ReferrerFollowUpItem
                  key={followUp._id}
                  followUp={followUp}
                  onClick={() => onFollowUpClick(followUp)}
                  referrerName={referrerName}
                  showReferrerLink={showReferrerLink}
                  basePath={basePath}
                />
              ))}
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <h4 className="text-sm font-semibold text-gray-700">Missed</h4>
            <span className="ml-auto bg-purple-100 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {missed.length}
            </span>
          </div>
          {missed.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No missed follow-ups</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {missed.map((followUp) => (
                <ReferrerFollowUpItem
                  key={followUp._id}
                  followUp={followUp}
                  onClick={() => onFollowUpClick(followUp)}
                  showDate
                  isMissed
                  referrerName={referrerName}
                  showReferrerLink={showReferrerLink}
                  basePath={basePath}
                />
              ))}
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <h4 className="text-sm font-semibold text-gray-700">Tomorrow</h4>
            <span className="ml-auto bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {upcoming.length}
            </span>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No follow-ups tomorrow</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {upcoming.map((followUp) => (
                <ReferrerFollowUpItem
                  key={followUp._id}
                  followUp={followUp}
                  onClick={() => onFollowUpClick(followUp)}
                  referrerName={referrerName}
                  showReferrerLink={showReferrerLink}
                  basePath={basePath}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
