'use client';

import { useEffect, useRef, useState } from 'react';

export interface MobileRecordMenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  hidden?: boolean;
  variant?: 'default' | 'danger' | 'warning' | 'success';
}

interface MobileRecordActionsMenuProps {
  items: MobileRecordMenuItem[];
}

const variantClasses: Record<NonNullable<MobileRecordMenuItem['variant']>, string> = {
  default: 'text-gray-700 hover:bg-gray-50',
  danger: 'text-red-600 hover:bg-red-50',
  warning: 'text-amber-700 hover:bg-amber-50',
  success: 'text-green-700 hover:bg-green-50',
};

export default function MobileRecordActionsMenu({ items }: MobileRecordActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const visibleItems = items.filter((item) => !item.hidden);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (visibleItems.length === 0) return null;

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        aria-label="Actions"
        aria-expanded={open}
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 4a2 2 0 110-4 2 2 0 010 4zm0 4a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[9.5rem] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {visibleItems.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;
                setOpen(false);
                item.onClick();
              }}
              className={`block w-full px-3 py-2 text-left text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                variantClasses[item.variant || 'default']
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
