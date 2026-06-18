'use client';

import { ReactNode } from 'react';

interface SuperAdminRoleDetailFrameProps {
  children: ReactNode;
  backLabel?: string;
  onBack: () => void;
}

/** Responsive padding + compact back link for super-admin role detail pages (mobile-first). */
export default function SuperAdminRoleDetailFrame({
  children,
  backLabel = 'Go back',
  onBack,
}: SuperAdminRoleDetailFrameProps) {
  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6 lg:p-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
      >
        <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {backLabel}
      </button>
      {children}
    </div>
  );
}

export function DetailPageHeader({
  avatar,
  title,
  subtitle,
}: {
  avatar?: ReactNode;
  title: string;
  subtitle?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:gap-4">
      {avatar}
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl lg:text-3xl">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-gray-500">{subtitle}</div>}
      </div>
    </div>
  );
}

export function DetailInfoCard({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:mb-6 sm:p-5">
      <div className="flex flex-wrap gap-3 text-sm sm:gap-6">{children}</div>
    </div>
  );
}

export function ListPageStatGrid({
  children,
  columns = 2,
}: {
  children: ReactNode;
  columns?: 2 | 3;
}) {
  const gridClass =
    columns === 3
      ? 'mb-4 grid grid-cols-3 gap-1.5 sm:gap-3 md:mb-6 md:gap-4'
      : 'mb-4 grid grid-cols-2 gap-3 sm:gap-4 md:mb-6';
  return <div className={gridClass}>{children}</div>;
}

export function DetailStatGrid({ children }: { children: ReactNode }) {
  return <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:mb-8 lg:grid-cols-4 lg:gap-6">{children}</div>;
}

export function DetailActionGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{children}</div>
  );
}
