'use client';

import { View } from 'react-big-calendar';
import { format, getMonth, getYear } from 'date-fns';
import {
  CALENDAR_MONTHS,
  CALENDAR_MONTHS_SHORT,
  CALENDAR_YEARS,
  CalendarAccent,
  getCalendarAccentStyles,
} from './calendarConstants';

interface CalendarNavigationBarProps {
  view: View;
  date: Date;
  accent: CalendarAccent;
  onPrevious: () => void;
  onNext: () => void;
  onViewChange: (view: View) => void;
  onMonthChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onYearChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onToday: () => void;
}

function ViewSwitcher({
  view,
  accent,
  onViewChange,
  compact = false,
}: {
  view: View;
  accent: CalendarAccent;
  onViewChange: (view: View) => void;
  compact?: boolean;
}) {
  const { activeView } = getCalendarAccentStyles(accent);
  const inactive = 'text-gray-700 hover:bg-gray-100';
  const base = compact
    ? 'flex-1 px-2 py-1.5 text-[11px] font-semibold rounded-md transition-colors'
    : 'px-3 py-1 text-xs font-medium rounded transition-colors';

  const views: { key: View; label: string; short: string }[] = [
    { key: 'month', label: 'Month', short: 'M' },
    { key: 'week', label: 'Week', short: 'W' },
    { key: 'day', label: 'Day', short: 'D' },
  ];

  return (
    <div
      className={`flex items-center bg-white border border-gray-300 rounded-lg p-0.5 ${
        compact ? 'w-full' : 'gap-1 p-1'
      }`}
    >
      {views.map(({ key, label, short }) => (
        <button
          key={key}
          type="button"
          onClick={() => onViewChange(key)}
          className={`${base} ${view === key ? activeView : inactive}`}
        >
          {compact ? short : label}
        </button>
      ))}
    </div>
  );
}

function NavIconButton({
  direction,
  onClick,
  label,
}: {
  direction: 'prev' | 'next';
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {direction === 'prev' ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        )}
      </svg>
    </button>
  );
}

export default function CalendarNavigationBar({
  view,
  date,
  accent,
  onPrevious,
  onNext,
  onViewChange,
  onMonthChange,
  onYearChange,
  onToday,
}: CalendarNavigationBarProps) {
  const currentMonth = getMonth(date);
  const currentYear = getYear(date);
  const { today, selectFocus } = getCalendarAccentStyles(accent);

  return (
    <>
      {/* Mobile — compact two-row toolbar */}
      <div className="space-y-2 border-b border-gray-200 bg-gray-50 px-3 py-2 md:hidden">
        <div className="flex items-center gap-2">
          <NavIconButton direction="prev" onClick={onPrevious} label="Previous period" />
          <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
            <select
              value={currentMonth}
              onChange={onMonthChange}
              aria-label="Month"
              className={`max-w-[5.5rem] rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-semibold text-gray-900 ${selectFocus}`}
            >
              {CALENDAR_MONTHS_SHORT.map((month, index) => (
                <option key={month} value={index}>
                  {month}
                </option>
              ))}
            </select>
            <select
              value={currentYear}
              onChange={onYearChange}
              aria-label="Year"
              className={`w-[4.25rem] rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-semibold text-gray-900 ${selectFocus}`}
            >
              {CALENDAR_YEARS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <NavIconButton direction="next" onClick={onNext} label="Next period" />
          <button
            type="button"
            onClick={onToday}
            className={`shrink-0 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-colors ${today}`}
          >
            Today
          </button>
        </div>
        <ViewSwitcher view={view} accent={accent} onViewChange={onViewChange} compact />
        {view === 'day' && (
          <p className="text-center text-xs font-medium text-gray-600">{format(date, 'EEE, d MMM')}</p>
        )}
      </div>

      {/* Desktop — grouped toolbar */}
      <div className="hidden border-b border-gray-200 bg-gray-50 px-4 py-3 md:block">
        <div className="flex flex-wrap items-center justify-center gap-2 lg:gap-3">
          <button
            type="button"
            onClick={onPrevious}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            ← Previous
          </button>

          <ViewSwitcher view={view} accent={accent} onViewChange={onViewChange} />

          <select
            value={currentMonth}
            onChange={onMonthChange}
            className={`rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 ${selectFocus}`}
          >
            {CALENDAR_MONTHS.map((month, index) => (
              <option key={month} value={index}>
                {month}
              </option>
            ))}
          </select>

          <select
            value={currentYear}
            onChange={onYearChange}
            className={`rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 ${selectFocus}`}
          >
            {CALENDAR_YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onToday}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${today}`}
          >
            Today
          </button>

          {view === 'day' && (
            <div className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-900">
              {format(date, 'EEEE, d')}
            </div>
          )}

          <button
            type="button"
            onClick={onNext}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Next →
          </button>
        </div>
      </div>
    </>
  );
}
