'use client';

import RoleUserListPage from '@/components/RoleUserListPage';
import { USER_ROLE } from '@/types';

export default function IvyExpertUsersPage() {
  return (
    <RoleUserListPage
      role="ivy-expert"
      roleDisplayName="Ivy Expert"
      roleEnum={USER_ROLE.IVY_EXPERT}
      canAddUser={true}
    />
  );
}
