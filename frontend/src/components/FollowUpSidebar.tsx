'use client';

import { FollowUp, FOLLOWUP_STATUS, Lead, LEAD_STAGE } from '@/types';
import { format } from 'date-fns';

interface FollowUpSidebarProps {
  today: FollowUp[];
  missed: FollowUp[];
  upcoming: FollowUp[];
  onFollowUpClick: (followUp: FollowUp) => void;
}

// Helper to get stage badge color - matching the standard color mapping
const getStageBadgeColor = (stage: LEAD_STAGE) => {
  switch (stage) {
    case LEAD_STAGE.NEW:
      return 'bg-blue-100 text-blue-800';
    case LEAD_STAGE.HOT:
      return 'bg-red-100 text-red-800';
    case LEAD_STAGE.WARM:
      return 'bg-orange-100 text-orange-800';
    case LEAD_STAGE.COLD:
      return 'bg-cyan-100 text-cyan-800';
    case LEAD_STAGE.CONVERTED:
      return 'bg-green-100 text-green-800';
    case LEAD_STAGE.CLOSED:
      return 'bg-gray-100 text-gray-600';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

interface FollowUpItemProps {
  followUp: FollowUp;
  onClick: () => void;
  showDate?: boolean;
  isMissed?: boolean;
}

function FollowUpItem({ followUp, onClick, showDate = false, isMissed = false }: FollowUpItemProps) {
  const lead = followUp.leadId as Lead;
  const stage = lead?.stage || followUp.stageAtFollowUp;

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg cursor-pointer transition-all hover:shadow-md ${
        isMissed 
          ? 'bg-red-50 border border-red-200 hover:bg-red-100' 
          : 'bg-white border border-gray-200 hover:border-blue-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={`font-medium truncate ${isMissed ? 'text-red-900' : 'text-gray-900'}`}>
            {lead?.name || 'Unknown Lead'}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-medium ${isMissed ? 'text-red-700' : 'text-gray-600'}`}>
              {followUp.scheduledTime}
            </span>
            {showDate && (
              <span className="text-xs text-gray-500">
                {format(new Date(followUp.scheduledDate), 'MMM d')}
              </span>
            )}
            <span className={`px-1.5 py-0.5 text-xs rounded ${getStageBadgeColor(stage)}`}>
              {stage}
            </span>
          </div>
        </div>
        <div className={`text-xs px-2 py-1 rounded ${
          isMissed 
            ? 'bg-red-200 text-red-800' 
            : 'bg-gray-100 text-gray-600'
        }`}>
          {followUp.duration}m
        </div>
      </div>
    </div>
  );
}

export default function FollowUpSidebar({
  today,
  missed,
  upcoming,
  onFollowUpClick,
}: FollowUpSidebarProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-fit">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-900">Follow-Up Overview</h3>
      </div>

      <div className="divide-y divide-gray-100">
        {/* Today Section */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
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
                <FollowUpItem
                  key={followUp._id}
                  followUp={followUp}
                  onClick={() => onFollowUpClick(followUp)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Missed Section */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <h4 className="text-sm font-semibold text-gray-700">Missed</h4>
            <span className="ml-auto bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {missed.length}
            </span>
          </div>
          
          {missed.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No missed follow-ups</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {missed.map((followUp) => (
                <FollowUpItem
                  key={followUp._id}
                  followUp={followUp}
                  onClick={() => onFollowUpClick(followUp)}
                  showDate
                  isMissed
                />
              ))}
            </div>
          )}
        </div>

        {/* Upcoming (Tomorrow) Section */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
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
                <FollowUpItem
                  key={followUp._id}
                  followUp={followUp}
                  onClick={() => onFollowUpClick(followUp)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
