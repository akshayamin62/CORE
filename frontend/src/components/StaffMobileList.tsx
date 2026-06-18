'use client';

import AuthImage from '@/components/AuthImage';
import MobileUserRecordCard from '@/components/MobileUserRecordCard';
import { MobileRecordMenuItem } from '@/components/MobileRecordCard';
import { getFullName, getInitials } from '@/utils/nameHelpers';

export interface StaffListItem {
  _id: string;
  email?: string;
  mobileNumber?: string;
  createdAt: string;
  userId?: {
    _id?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email?: string;
    profilePicture?: string;
    isActive?: boolean;
    isVerified?: boolean;
  };
}

interface StaffMobileListProps {
  staff: StaffListItem[];
  getMenuItems: (item: StaffListItem) => MobileRecordMenuItem[];
  detailsLabel?: string;
  getDetails?: (item: StaffListItem) => string;
}

export default function StaffMobileList({
  staff,
  getMenuItems,
  detailsLabel = 'Phone',
  getDetails = (item) => item.mobileNumber || 'N/A',
}: StaffMobileListProps) {
  return (
    <div className="divide-y divide-gray-200 md:hidden">
      {staff.map((item) => {
        const user = item.userId;
        const email = item.email || user?.email;

        return (
          <MobileUserRecordCard
            key={item._id}
            avatar={
              <AuthImage
                path={user?.profilePicture}
                alt={getFullName(user)}
                className="h-10 w-10 shrink-0 rounded-full object-cover"
                fallback={
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <span className="text-sm font-semibold text-blue-600">{getInitials(user)}</span>
                  </div>
                }
              />
            }
            title={getFullName(user) || 'N/A'}
            subtitle={email}
            badges={
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  user?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {user?.isActive ? 'Active' : 'Inactive'}
              </span>
            }
            detailsLabel={detailsLabel}
            details={getDetails(item)}
            joined={new Date(item.createdAt).toLocaleDateString('en-GB')}
            menuItems={getMenuItems(item)}
          />
        );
      })}
    </div>
  );
}
