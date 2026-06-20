'use client';

import StudentLayout from '@/components/StudentLayout';

interface StudentOuterPageLayoutProps {
  children: React.ReactNode;
  user?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email: string;
    profilePicture?: string;
  } | null;
}

/** Sidebar + mobile bottom nav for student pages outside registration (parents, payment, etc.). */
export default function StudentOuterPageLayout({ children, user }: StudentOuterPageLayoutProps) {
  return (
    <StudentLayout
      isOuterNav
      user={user}
      formStructure={[]}
      showDashboard={false}
      currentPartIndex={0}
      currentSectionIndex={0}
      onPartChange={() => {}}
      onSectionChange={() => {}}
    >
      {children}
    </StudentLayout>
  );
}
