'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState, type ReactNode } from 'react';

interface ActivityCalendarModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** Full-screen calendar on mobile — rendered in a portal so it is not clipped by layout overflow */
export default function ActivityCalendarModal({
  open,
  onClose,
  children,
}: ActivityCalendarModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close calendar"
        className="fixed inset-0 z-[99990] bg-black/45 md:hidden"
        onClick={onClose}
      />
      <div
        className="fixed inset-x-3 z-[99991] flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl md:hidden"
        style={{
          top: 'calc(5rem + env(safe-area-inset-top, 28px) + 0.5rem)',
          bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px) + 0.5rem)',
        }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
          <h3 className="text-sm font-bold text-gray-800">Select a date</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-gray-200"
          >
            Close
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </>,
    document.body,
  );
}
