'use client';

import { ReactNode } from 'react';

interface BigCalendarViewportProps {
  compact?: boolean;
  children: ReactNode;
}

export default function BigCalendarViewport({ compact = false, children }: BigCalendarViewportProps) {
  return (
    <div
      className={`big-calendar-shell ${
        compact
          ? 'h-[280px] p-1.5 sm:h-[320px] md:h-[350px] md:p-2'
          : 'h-[min(420px,58vh)] p-2 md:h-[600px] md:p-4'
      }`}
    >
      {children}
    </div>
  );
}
