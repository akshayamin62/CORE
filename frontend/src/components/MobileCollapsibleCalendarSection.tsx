'use client';

import { useState } from 'react';

export interface MobileCollapsibleCalendarSectionProps {
  title: string;
  subtitle?: string;
  summary?: string;
  children: React.ReactNode;
  className?: string;
}

/** On mobile: collapsed by default; tap to expand. Desktop (md+): always visible. */
export default function MobileCollapsibleCalendarSection({
  title,
  subtitle,
  summary,
  children,
  className = '',
}: MobileCollapsibleCalendarSectionProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={className}>
      {/* Mobile collapsed trigger */}
      {!mobileOpen && (
        <div className="mb-4 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">{title}</p>
              {summary ? (
                <p className="text-xs text-gray-500">{summary}</p>
              ) : subtitle ? (
                <p className="text-xs text-gray-500">{subtitle}</p>
              ) : null}
            </div>
            <svg className="h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}

      {/* Calendar content — hidden on mobile until expanded; always on md+ */}
      <div className={mobileOpen ? 'block' : 'hidden md:block'}>
        <div className="mb-3 flex items-center justify-between gap-2 md:mb-4 md:gap-3">
          {/* Mobile expanded header */}
          <div className="flex min-w-0 flex-1 items-center gap-2 md:hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
              <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-gray-900">{title}</h2>
              {subtitle && <p className="truncate text-xs text-gray-500">{subtitle}</p>}
            </div>
          </div>
          <div className="hidden min-w-0 flex-1 items-center gap-3 md:flex">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              {(summary || subtitle) && (
                <p className="text-sm text-gray-500">{summary || subtitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="ml-auto shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 md:hidden"
          >
            Hide calendar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
