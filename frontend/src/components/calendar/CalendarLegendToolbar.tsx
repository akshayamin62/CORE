'use client';

/** Compact legend row shown when calendar main header is hidden (e.g. grid layouts). */
export default function CalendarLegendToolbar({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-center justify-end gap-2 border-b border-gray-200 bg-gray-50/80 px-3 py-2 sm:px-4 ${className}`}
    >
      {children}
    </div>
  );
}
