'use client';

import { ReactNode } from 'react';
import AuthImage from '@/components/AuthImage';
import MobileUserRecordCard from '@/components/MobileUserRecordCard';
import { MobileRecordMenuItem } from '@/components/MobileRecordCard';
import { getFullName, getInitials } from '@/utils/nameHelpers';

const DEFAULT_SERVICE_COLORS: Record<string, string> = {
  'Study Abroad': 'bg-indigo-100 text-indigo-800',
  'Ivy League Preparation': 'bg-amber-100 text-amber-800',
  'Ivy League Admission': 'bg-amber-100 text-amber-800',
  'Education Planning': 'bg-teal-100 text-teal-800',
  'Coaching Classes': 'bg-rose-100 text-rose-800',
};

export interface StudentListItem {
  _id: string;
  createdAt?: string;
  user?: {
    _id?: string;
    email?: string;
    profilePicture?: string;
    isActive?: boolean;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    createdAt?: string;
  };
  userId?: {
    _id?: string;
    email?: string;
    profilePicture?: string;
    isActive?: boolean;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    createdAt?: string;
  };
  adminId?: { companyName?: string; userId?: { firstName?: string; middleName?: string; lastName?: string } } | string;
  advisorId?: { companyName?: string };
  serviceNames?: string[];
  registrationCount?: number;
  hasPendingAssignment?: boolean;
}

export function normalizeStudentListItem(student: StudentListItem): StudentListItem & { user: NonNullable<StudentListItem['user']> } {
  const user = student.user ?? student.userId ?? {};
  return { ...student, user };
}

interface StudentMobileRecordCardProps {
  student: StudentListItem;
  menuItems: MobileRecordMenuItem[];
  getServiceColor?: (service: string) => string;
  badges?: ReactNode;
}

function getAdminAdvisorDisplay(student: StudentListItem): ReactNode {
  if (typeof student.adminId === 'string') {
    return 'Transferred';
  }
  const adminLabel =
    student.adminId?.companyName ||
    (student.adminId?.userId ? getFullName(student.adminId.userId) : undefined);
  const advisorLabel = student.advisorId?.companyName;

  if (adminLabel && advisorLabel) {
    return (
      <div className="space-y-0.5">
        <div>{adminLabel}</div>
        <div>{advisorLabel}</div>
      </div>
    );
  }
  return adminLabel || advisorLabel || 'N/A';
}

function renderServiceTags(
  student: StudentListItem,
  getServiceColor: (service: string) => string,
) {
  const { serviceNames, registrationCount } = student;
  if (serviceNames && serviceNames.length > 0) {
    return serviceNames.map((service, idx) => (
      <span
        key={`${service}-${idx}`}
        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getServiceColor(service)}`}
      >
        {service}
      </span>
    ));
  }
  if (registrationCount != null && registrationCount > 0) {
    return (
      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800">
        {registrationCount} service(s)
      </span>
    );
  }
  return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
      No services
    </span>
  );
}

export default function StudentMobileRecordCard({
  student: rawStudent,
  menuItems,
  getServiceColor = (service) => DEFAULT_SERVICE_COLORS[service] || 'bg-gray-100 text-gray-800',
  badges,
}: StudentMobileRecordCardProps) {
  const student = normalizeStudentListItem(rawStudent);
  const joinedDate = student.createdAt || student.user?.createdAt;

  return (
    <MobileUserRecordCard
      avatar={
        <AuthImage
          path={student.user?.profilePicture}
          alt=""
          className="h-10 w-10 shrink-0 rounded-full object-cover"
          fallback={
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
              <span className="text-sm font-semibold text-blue-600">{getInitials(student.user)}</span>
            </div>
          }
        />
      }
      title={getFullName(student.user) || 'N/A'}
      subtitle={student.user?.email}
      badges={
        badges ?? (
        <>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              student.user?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {student.user?.isActive ? 'Active' : 'Inactive'}
          </span>
          {student.hasPendingAssignment && (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-800">
              Pending Assignment
            </span>
          )}
          {typeof student.adminId === 'object' && student.adminId?.companyName && student.advisorId?.companyName && (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-800">
              Transferred
            </span>
          )}
        </>
        )
      }
      tags={renderServiceTags(student, getServiceColor)}
      detailsLabel="Admin / Advisor"
      details={getAdminAdvisorDisplay(student)}
      joined={joinedDate ? new Date(joinedDate).toLocaleDateString('en-GB') : 'N/A'}
      menuItems={menuItems}
    />
  );
}

export function StudentMobileList({
  students,
  getMenuItems,
  getServiceColor,
  renderBadges,
}: {
  students: StudentListItem[];
  getMenuItems: (student: StudentListItem) => MobileRecordMenuItem[];
  getServiceColor?: (service: string) => string;
  renderBadges?: (student: StudentListItem) => ReactNode;
}) {
  return (
    <div className="divide-y divide-gray-200 md:hidden">
      {students.map((student) => {
        const normalized = normalizeStudentListItem(student);
        return (
          <StudentMobileRecordCard
            key={student._id}
            student={normalized}
            menuItems={getMenuItems(student)}
            getServiceColor={getServiceColor}
            badges={renderBadges?.(student)}
          />
        );
      })}
    </div>
  );
}
