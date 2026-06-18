'use client';

import { ReactNode } from 'react';
import MobileRecordActionsMenu, { MobileRecordMenuItem } from '@/components/MobileRecordActionsMenu';

export type { MobileRecordMenuItem };

export interface MobileRecordField {
  label: string;
  value: ReactNode;
  fullWidth?: boolean;
  colSpan?: 1 | 2 | 3;
  multiline?: boolean;
}

interface MobileRecordCardProps {
  avatar?: ReactNode;
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  tags?: ReactNode;
  fields?: MobileRecordField[];
  actions?: ReactNode;
  headerAction?: ReactNode;
  menuItems?: MobileRecordMenuItem[];
  compact?: boolean;
}

export default function MobileRecordCard({
  avatar,
  title,
  subtitle,
  badges,
  tags,
  fields,
  actions,
  headerAction,
  menuItems,
  compact = true,
}: MobileRecordCardProps) {
  const getFieldColSpan = (field: MobileRecordField) => {
    if (field.colSpan) return field.colSpan;
    if (field.fullWidth) return compact ? 3 : 2;
    return 1;
  };

  const topRightAction =
    menuItems && menuItems.length > 0 ? (
      <MobileRecordActionsMenu items={menuItems} />
    ) : (
      headerAction
    );

  return (
    <div className={compact ? 'p-3' : 'p-4'}>
      <div className={`flex items-start gap-2 ${compact ? 'mb-1.5' : 'mb-3'}`}>
        {avatar && (
          <div className={compact ? 'shrink-0 [&_img]:h-9 [&_img]:w-9 [&>div]:h-9 [&>div]:w-9' : 'shrink-0'}>
            {avatar}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">{title}</p>
          {subtitle && (
            <p className="truncate text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
        {topRightAction}
      </div>

      {badges && (
        <div
          className={`flex flex-wrap gap-1 ${
            compact ? 'mb-1.5 [&_span]:px-2 [&_span]:py-0.5 [&_span]:text-[10px]' : 'mb-3'
          }`}
        >
          {badges}
        </div>
      )}

      {tags && (
        <div className={`flex flex-wrap gap-1 ${compact ? 'mb-1.5' : 'mb-3'}`}>
          {tags}
        </div>
      )}

      {fields && fields.length > 0 && (
        <div
          className={
            compact
              ? 'grid grid-cols-3 gap-x-2 gap-y-1 rounded-md border border-gray-100 bg-gray-50 px-2 py-1.5'
              : 'mb-3 grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-lg border border-gray-100 bg-gray-50 p-3'
          }
        >
          {fields.map((field, index) => (
            <div
              key={`${field.label}-${index}`}
              className={`min-w-0 ${
                getFieldColSpan(field) === 3
                  ? 'col-span-3'
                  : getFieldColSpan(field) === 2
                  ? 'col-span-2'
                  : 'col-span-1'
              }`}
            >
              <p className={`font-semibold uppercase tracking-wide text-gray-400 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
                {field.label}
              </p>
              <div className={`font-medium text-gray-900 ${compact ? 'text-[11px]' : 'text-xs'} ${field.multiline ? 'whitespace-normal break-words' : 'truncate'}`}>
                {field.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {actions && !menuItems?.length && (
        <div className={`flex flex-wrap gap-2 ${compact ? 'pt-1.5' : 'border-t border-gray-100 pt-3'}`}>
          {actions}
        </div>
      )}
    </div>
  );
}
