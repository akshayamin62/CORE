'use client';

import { FormSection } from '@/types';
import FormSubSectionRenderer from './FormSubSectionRenderer';
import TestSubSectionRenderer from './TestSubSectionRenderer';

interface FormSectionRendererProps {
  section: FormSection;
  values: any;
  onChange: (subSectionId: string, index: number, key: string, value: any) => void;
  onAddInstance: (subSectionId: string) => void;
  onRemoveInstance: (subSectionId: string, index: number) => void;
  errors?: { [subSectionId: string]: { [key: string]: string }[] };
}

export default function FormSectionRenderer({
  section,
  values,
  onChange,
  onAddInstance,
  onRemoveInstance,
  errors = {},
}: FormSectionRendererProps) {
  // Check if this is a test section (Standardized Tests)
  const isTestSection = section.title.toLowerCase().includes('test');

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Section Header */}
      <div className="bg-blue-600 px-6 py-4 border-b border-blue-700">
        <h3 className="text-xl font-semibold text-white">{section.title}</h3>
        {section.description && (
          <p className="text-blue-100 text-sm mt-1">{section.description}</p>
        )}
      </div>

      {/* SubSections */}
      <div className="p-6 space-y-6 bg-white">
        
        {section.subSections
          .sort((a, b) => a.order - b.order)
          .map((subSection, idx) => {
            const subSectionValues = values[subSection._id] || [{}];
            
            // Use TestSubSectionRenderer for test sections
            if (isTestSection) {
              return (
                <TestSubSectionRenderer
                  key={subSection._id}
                  subSection={subSection}
                  values={subSectionValues}
                  onChange={(index, key, value) =>
                    onChange(subSection._id, index, key, value)
                  }
                  errors={errors[subSection._id]}
                />
              );
            }
            
            // Add visual separator between Mailing and Permanent Address
            const isPermanentAddress = subSection.title.includes('Permanent Address');
            
            // Use regular FormSubSectionRenderer for other sections
            return (
              <div key={subSection._id}>
                {isPermanentAddress && idx > 0 && (
                  <div className="my-6 border-t-2 border-gray-200"></div>
                )}
                <FormSubSectionRenderer
                  subSection={subSection}
                  values={subSectionValues}
                  onChange={(index, key, value) =>
                    onChange(subSection._id, index, key, value)
                  }
                  onAdd={() => onAddInstance(subSection._id)}
                  onRemove={(index) => onRemoveInstance(subSection._id, index)}
                  errors={errors[subSection._id]}
                />
              </div>
            );
          })}
      </div>
    </div>
  );
}

