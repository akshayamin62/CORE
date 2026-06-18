'use client';

import { ReactNode } from 'react';
import MobileRecordCard, { MobileRecordMenuItem } from '@/components/MobileRecordCard';

export interface MobileUserRecordCardProps {
  avatar?: ReactNode;
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  tags?: ReactNode;
  detailsLabel?: string;
  details?: ReactNode;
  joined: ReactNode;
  menuItems?: MobileRecordMenuItem[];
}

/** Archive-style user card: avatar + name + menu, badges, Details | Joined row */
export default function MobileUserRecordCard({
  avatar,
  title,
  subtitle,
  badges,
  tags,
  detailsLabel = 'Details',
  details,
  joined,
  menuItems,
}: MobileUserRecordCardProps) {
  const hasDetails = details !== undefined && details !== null && details !== '';

  return (
    <MobileRecordCard
      avatar={avatar}
      title={title}
      subtitle={subtitle}
      badges={badges}
      tags={tags}
      fields={[
        ...(hasDetails
          ? [{ label: detailsLabel, value: details, colSpan: 2 as const, multiline: true as const }]
          : []),
        {
          label: 'Joined',
          value: joined,
          colSpan: (hasDetails ? 1 : 3) as 1 | 3,
        },
      ]}
      menuItems={menuItems}
    />
  );
}
