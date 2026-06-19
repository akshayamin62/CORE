'use client';

import { FormSection } from '@/types';

interface FormSectionsNavigationProps {
  sections: FormSection[];
  currentSectionIndex: number;
  onSectionChange: (index: number) => void;
}

export default function FormSectionsNavigation({
  sections,
  currentSectionIndex,
  onSectionChange,
}: FormSectionsNavigationProps) {
  if (!sections || sections.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
      <div className="flex gap-2 overflow-x-auto scrollbar-none">
        {sections.map((section, index) => (
          <button
            key={section.key}
            onClick={() => onSectionChange(index)}
            className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
              currentSectionIndex === index
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {section.title}
          </button>
        ))}
      </div>
    </div>
  );
}


