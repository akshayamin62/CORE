'use client';

import { useState } from 'react';

export interface CalendarLegendItem {
  color: string;
  label: string;
  style?: React.CSSProperties;
}

export interface CalendarLegendSection {
  title: string;
  items: CalendarLegendItem[];
}

interface CalendarLegendModalProps {
  sections: CalendarLegendSection[];
  /** Short label beside color dots in the trigger */
  triggerLabel: string;
  /** Emoji or icon prefix */
  triggerPrefix?: string;
  /** Color dots shown in the compact trigger */
  triggerDots: { color: string; style?: React.CSSProperties }[];
  hoverBgClass?: string;
}

function LegendSections({ sections }: { sections: CalendarLegendSection[] }) {
  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="mb-1.5 text-xs font-semibold text-gray-700">{section.title}</p>
          <div className="space-y-1.5">
            {section.items.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span
                  className={`h-3 w-3 shrink-0 rounded ${item.color}`}
                  style={item.style}
                />
                <span className="text-xs text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Desktop hover tooltip + mobile tap modal for calendar color legends. */
export default function CalendarLegendModal({
  sections,
  triggerLabel,
  triggerPrefix,
  triggerDots,
  hoverBgClass = 'hover:bg-gray-100',
}: CalendarLegendModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="relative group shrink-0">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 transition-colors md:cursor-help md:px-3 ${hoverBgClass}`}
          aria-label={`${triggerLabel} color legend`}
        >
          {triggerPrefix && <span className="text-xs text-gray-500">{triggerPrefix}</span>}
          {triggerDots.map((dot, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded ${dot.color}`}
              style={dot.style}
            />
          ))}
          <span className="text-[11px] text-gray-500 sm:text-xs">{triggerLabel}</span>
        </button>
        <div className="pointer-events-none absolute right-0 top-full z-50 mt-2 hidden w-52 rounded-lg border border-gray-200 bg-white p-3 opacity-0 shadow-lg transition-all duration-200 invisible group-hover:visible group-hover:opacity-100 md:block">
          <LegendSections sections={sections} />
        </div>
      </div>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[60] bg-black/30 md:hidden"
            aria-label="Close legend"
            onClick={() => setOpen(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-[61] max-h-[min(80vh,28rem)] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 shadow-xl md:hidden">
            <LegendSections sections={sections} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </>
      )}
    </>
  );
}
