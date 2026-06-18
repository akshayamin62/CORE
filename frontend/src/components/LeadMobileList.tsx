'use client';

import { ReactNode } from 'react';
import { LEAD_STAGE, SERVICE_TYPE } from '@/types';
import MobileRecordCard, { MobileRecordMenuItem } from '@/components/MobileRecordCard';
import { FilterOption } from '@/components/ListPageFilters';

export interface LeadListItem {
  _id: string;
  name: string;
  email: string;
  mobileNumber: string;
  stage: string;
  serviceTypes: string[];
  createdAt: string;
  conversionStatus?: string;
  assignedCounselorId?: {
    userId?: {
      name?: string;
      firstName?: string;
      middleName?: string;
      lastName?: string;
    };
  };
  adminId?: unknown;
}

export const LEAD_STAGE_FILTER_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Stages', mobileLabel: 'All' },
  { value: LEAD_STAGE.NEW, label: LEAD_STAGE.NEW, mobileLabel: 'New' },
  { value: LEAD_STAGE.HOT, label: LEAD_STAGE.HOT, mobileLabel: 'Hot' },
  { value: LEAD_STAGE.WARM, label: LEAD_STAGE.WARM, mobileLabel: 'Warm' },
  { value: LEAD_STAGE.COLD, label: LEAD_STAGE.COLD, mobileLabel: 'Cold' },
  { value: LEAD_STAGE.CONVERTED, label: LEAD_STAGE.CONVERTED, mobileLabel: 'Converted' },
  { value: LEAD_STAGE.CLOSED, label: LEAD_STAGE.CLOSED, mobileLabel: 'Closed' },
];

export const LEAD_SERVICE_FILTER_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Services', mobileLabel: 'All' },
  { value: SERVICE_TYPE.CAREER_FOCUS_STUDY_ABROAD, label: 'Career Focus Study Abroad', mobileLabel: 'Study Abroad' },
  { value: SERVICE_TYPE.IVY_LEAGUE_ADMISSION, label: 'Ivy League Admission', mobileLabel: 'Ivy' },
  { value: SERVICE_TYPE.EDUCATION_PLANNING, label: 'Education Planning', mobileLabel: 'Edu Plan' },
  { value: SERVICE_TYPE.COACHING_CLASSES, label: 'Coaching Classes', mobileLabel: 'Coaching' },
];

export function getLeadStageColor(stage: string): string {
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
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getLeadServiceColor(service: string): string {
  switch (service) {
    case SERVICE_TYPE.CAREER_FOCUS_STUDY_ABROAD:
      return 'bg-indigo-100 text-indigo-800';
    case SERVICE_TYPE.IVY_LEAGUE_ADMISSION:
      return 'bg-amber-100 text-amber-800';
    case SERVICE_TYPE.EDUCATION_PLANNING:
      return 'bg-teal-100 text-teal-800';
    case SERVICE_TYPE.COACHING_CLASSES:
      return 'bg-rose-100 text-rose-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export interface LeadMobileField {
  label: string;
  value: ReactNode;
  colSpan?: 1 | 2 | 3;
}

interface LeadMobileListProps<T extends LeadListItem = LeadListItem> {
  leads: T[];
  getMenuItems: (lead: T) => MobileRecordMenuItem[];
  extraFields?: (lead: T) => LeadMobileField[];
  getStageColor?: (stage: string) => string;
  getServiceColor?: (service: string) => string;
}

function renderServiceTags(
  serviceTypes: string[],
  getServiceColor: (service: string) => string,
) {
  if (!serviceTypes || serviceTypes.length === 0) {
    return (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
        No services
      </span>
    );
  }
  return serviceTypes.map((service, idx) => (
    <span
      key={`${service}-${idx}`}
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getServiceColor(service)}`}
    >
      {service}
    </span>
  ));
}

export default function LeadMobileList<T extends LeadListItem = LeadListItem>({
  leads,
  getMenuItems,
  extraFields,
  getStageColor = getLeadStageColor,
  getServiceColor = getLeadServiceColor,
}: LeadMobileListProps<T>) {
  return (
    <div className="divide-y divide-gray-200 md:hidden">
      {leads.map((lead) => {
        const badges = (
          <>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStageColor(lead.stage)}`}>
              {lead.stage}
            </span>
            {lead.conversionStatus === 'PENDING' && (
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-800">
                Conversion Pending
              </span>
            )}
          </>
        );

        return (
          <MobileRecordCard
            key={lead._id}
            title={lead.name}
            subtitle={lead.email}
            badges={badges}
            tags={renderServiceTags(lead.serviceTypes, getServiceColor)}
            fields={[
              { label: 'Phone', value: lead.mobileNumber, colSpan: 2 },
              { label: 'Created', value: new Date(lead.createdAt).toLocaleDateString('en-GB') },
              ...(extraFields?.(lead) ?? []),
            ]}
            menuItems={getMenuItems(lead)}
          />
        );
      })}
    </div>
  );
}
