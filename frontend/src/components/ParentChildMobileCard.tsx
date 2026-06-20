'use client';

import AuthImage from '@/components/AuthImage';
import { getFullName, getInitials } from '@/utils/nameHelpers';

interface ParentChildMobileCardProps {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  profilePicture?: string;
  isActive?: boolean;
  registrationCount?: number;
  adminCompany?: string;
  advisorCompany?: string;
  isTransferred?: boolean;
  joinedDate?: string;
  onView: () => void;
}

/** Mobile list card — matches Student Service Providers card layout */
export default function ParentChildMobileCard({
  firstName,
  middleName,
  lastName,
  email,
  profilePicture,
  isActive = true,
  registrationCount = 0,
  adminCompany,
  advisorCompany,
  isTransferred,
  joinedDate,
  onView,
}: ParentChildMobileCardProps) {
  const name = getFullName({ firstName, middleName, lastName }) || 'N/A';
  const adminAdvisor =
    adminCompany && advisorCompany
      ? `${adminCompany} · ${advisorCompany}`
      : adminCompany || advisorCompany || 'Not assigned';

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-md sm:border-2">
      <div className="p-3 sm:p-6">
        <div className="mb-3 flex items-center gap-2.5 sm:mb-4 sm:gap-3">
          <AuthImage
            path={profilePicture}
            alt={name}
            className="h-10 w-10 shrink-0 rounded-full border border-gray-200 object-cover sm:h-12 sm:w-12"
            fallback={
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 sm:h-12 sm:w-12">
                <span className="text-sm font-bold text-blue-600">{getInitials({ firstName, middleName, lastName })}</span>
              </div>
            }
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900 sm:text-base">{name}</p>
            {email && <p className="truncate text-xs text-gray-500">{email}</p>}
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold sm:text-xs ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
          {registrationCount > 0 && (
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-semibold text-blue-800 sm:text-xs">
              {registrationCount} service(s)
            </span>
          )}
          {isTransferred && (
            <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-semibold text-orange-800 sm:text-xs">
              Transferred
            </span>
          )}
        </div>

        <div className="mb-3 rounded-lg bg-gray-50 px-3 py-2.5 sm:mb-4">
          <p className="text-xs font-medium text-gray-400">Admin / Advisor</p>
          <p className="mt-0.5 text-sm text-gray-700">{adminAdvisor}</p>
          {joinedDate && (
            <p className="mt-1 text-xs text-gray-500">Joined {joinedDate}</p>
          )}
        </div>

        <button
          type="button"
          onClick={onView}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 sm:py-2.5 sm:text-sm"
        >
          View Details
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
