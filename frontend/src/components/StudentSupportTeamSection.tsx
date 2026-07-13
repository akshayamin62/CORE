'use client';

import { getFullName } from '@/utils/nameHelpers';

export interface StudentSupportTeamMember {
  role: string;
  name: string;
  email?: string;
  phone?: string;
  accent?: 'default' | 'blue';
}

interface StudentSupportTeamSectionProps {
  members: StudentSupportTeamMember[];
  title?: string;
  className?: string;
}

export function buildRegistrationSupportTeamMembers(input: {
  adminId?: {
    companyName?: string;
    userId?: { firstName?: string; middleName?: string; lastName?: string; email?: string };
    mobileNumber?: string;
  } | null;
  counselorId?: {
    userId?: { firstName?: string; middleName?: string; lastName?: string; email?: string };
    mobileNumber?: string;
  } | null;
  advisorId?: {
    companyName?: string;
    userId?: { email?: string };
  } | null;
  opsUser?: {
    userId?: { firstName?: string; middleName?: string; lastName?: string; email?: string };
    mobileNumber?: string;
  } | null;
  opsLabel?: string;
  eduplanCoach?: {
    userId?: { firstName?: string; middleName?: string; lastName?: string; email?: string };
    mobileNumber?: string;
    email?: string;
  } | null;
  intake?: string;
  year?: string;
}): StudentSupportTeamMember[] {
  const members: StudentSupportTeamMember[] = [];

  if (input.adminId) {
    members.push({
      role: 'Admin',
      name: input.adminId.companyName || getFullName(input.adminId.userId),
      email: input.adminId.userId?.email,
      phone: input.adminId.mobileNumber,
    });
  }
  if (input.counselorId) {
    members.push({
      role: 'Counselor',
      name: getFullName(input.counselorId.userId),
      email: input.counselorId.userId?.email,
      phone: input.counselorId.mobileNumber,
    });
  }
  if (input.advisorId) {
    members.push({
      role: 'Advisor',
      name: input.advisorId.companyName || 'Advisor',
      email: input.advisorId.userId?.email,
    });
  }
  if (input.opsUser) {
    members.push({
      role: input.opsLabel || 'OPS',
      name: getFullName(input.opsUser.userId),
      email: input.opsUser.userId?.email,
      phone: input.opsUser.mobileNumber,
    });
  }
  if (input.eduplanCoach) {
    members.push({
      role: 'Eduplan Coach',
      name: getFullName(input.eduplanCoach.userId),
      email: input.eduplanCoach.userId?.email,
      phone: input.eduplanCoach.mobileNumber || input.eduplanCoach.email,
    });
  }
  if (input.intake || input.year) {
    const details = [input.intake, input.year].filter(Boolean).join(' · ');
    members.push({
      role: 'Intake & Year',
      name: details,
      accent: 'blue',
    });
  }

  return members;
}

export function buildIvySupportTeamMembers(serviceData: {
  studentId?: {
    adminId?: { firstName?: string; lastName?: string; email?: string; mobileNumber?: string };
    counselorId?: { firstName?: string; lastName?: string; email?: string; mobileNumber?: string };
    advisorId?: { firstName?: string; lastName?: string; email?: string };
  };
  activeIvyExpertId?: { firstName?: string; lastName?: string; email?: string; mobileNumber?: string };
} | null): StudentSupportTeamMember[] {
  if (!serviceData?.studentId) return [];

  const members: StudentSupportTeamMember[] = [];
  const { studentId, activeIvyExpertId } = serviceData;

  if (studentId.adminId) {
    members.push({
      role: 'Admin',
      name: `${studentId.adminId.firstName || ''} ${studentId.adminId.lastName || ''}`.trim(),
      email: studentId.adminId.email,
      phone: studentId.adminId.mobileNumber,
    });
  }
  if (studentId.counselorId) {
    members.push({
      role: 'Counselor',
      name: `${studentId.counselorId.firstName || ''} ${studentId.counselorId.lastName || ''}`.trim(),
      email: studentId.counselorId.email,
      phone: studentId.counselorId.mobileNumber,
    });
  }
  if (studentId.advisorId) {
    members.push({
      role: 'Advisor',
      name: `${studentId.advisorId.firstName || ''} ${studentId.advisorId.lastName || ''}`.trim(),
      email: studentId.advisorId.email,
    });
  }
  if (activeIvyExpertId) {
    members.push({
      role: 'Ivy Expert',
      name: `${activeIvyExpertId.firstName || ''} ${activeIvyExpertId.lastName || ''}`.trim(),
      email: activeIvyExpertId.email,
      phone: activeIvyExpertId.mobileNumber,
    });
  }

  return members.filter((member) => member.name);
}

/** Desktop-only support team footer. Hidden on mobile viewports. */
export default function StudentSupportTeamSection({
  members,
  title = 'Your Support Team',
  className = '',
}: StudentSupportTeamSectionProps) {
  if (members.length === 0) return null;

  return (
    <div className={`hidden md:block ${className}`.trim()}>
      <h3 className="mb-2 text-xs font-semibold text-gray-900 sm:mb-3 sm:text-sm">{title}</h3>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-2 lg:grid-cols-5 lg:gap-4">
        {members.map((member) => (
          <div
            key={`${member.role}-${member.name}`}
            className={`rounded-lg border p-2.5 sm:p-3 ${
              member.accent === 'blue'
                ? 'border-blue-200 bg-blue-50'
                : 'border-gray-200 bg-gray-50'
            }`}
          >
            <p className="mb-1 text-xs font-medium text-gray-700">{member.role}</p>
            <p className={`text-sm font-semibold ${member.accent === 'blue' ? 'text-blue-700' : 'text-gray-900'}`}>
              {member.name}
            </p>
            {member.email ? <p className="text-xs text-gray-600">{member.email}</p> : null}
            {member.phone ? <p className="text-xs text-gray-600">{member.phone}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
