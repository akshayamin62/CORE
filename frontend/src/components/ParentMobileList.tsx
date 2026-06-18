'use client';

import AuthImage from '@/components/AuthImage';
import MobileRecordCard, { MobileRecordMenuItem } from '@/components/MobileRecordCard';
import { getFullName, getInitials } from '@/utils/nameHelpers';

export interface ParentListItem {
  _id: string;
  userId: {
    _id: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email: string;
    profilePicture?: string;
    isActive?: boolean;
  };
  studentIds: {
    _id: string;
    userId: {
      firstName?: string;
      middleName?: string;
      lastName?: string;
      email: string;
    };
  }[];
  relationship?: string;
  mobileNumber?: string;
}

interface ParentMobileListProps {
  parents: ParentListItem[];
  getMenuItems: (parent: ParentListItem) => MobileRecordMenuItem[];
}

export default function ParentMobileList({ parents, getMenuItems }: ParentMobileListProps) {
  return (
    <div className="divide-y divide-gray-200 md:hidden">
      {parents.map((parent) => (
        <MobileRecordCard
          key={parent._id}
          avatar={
            <AuthImage
              path={parent.userId.profilePicture}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full object-cover"
              fallback={
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100">
                  <span className="text-sm font-semibold text-purple-600">{getInitials(parent.userId)}</span>
                </div>
              }
            />
          }
          title={getFullName(parent.userId)}
          subtitle={parent.relationship}
          badges={
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                parent.userId.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {parent.userId.isActive !== false ? 'Active' : 'Inactive'}
            </span>
          }
          tags={
            <div className="flex flex-wrap gap-1">
              {parent.studentIds.map((student) => (
                <span
                  key={student._id}
                  className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800"
                >
                  {getFullName(student.userId)}
                </span>
              ))}
            </div>
          }
          fields={[
            { label: 'Email', value: parent.userId.email, colSpan: 2 },
            { label: 'Mobile', value: parent.mobileNumber || '-' },
          ]}
          menuItems={getMenuItems(parent)}
        />
      ))}
    </div>
  );
}
