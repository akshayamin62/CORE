'use client';

import { SectionConfig } from '@/config/formConfig';

function formatFieldValue(value: unknown, fieldType?: string): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (fieldType === 'date' && typeof value === 'string') {
    try {
      return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function isFieldVisible(
  fieldKey: string,
  instanceValues: Record<string, unknown>,
): boolean {
  const eduLevel = instanceValues?.educationLevel;
  const board = instanceValues?.board;
  if (fieldKey === 'board' || fieldKey === 'boardFullName') {
    if (eduLevel !== 'secondary_school' && eduLevel !== 'higher_secondary_school') return false;
  }
  if (fieldKey === 'boardFullName') {
    if (board !== 'State Board' && board !== 'Other') return false;
  }
  if (fieldKey === 'fieldOfStudy' && eduLevel === 'secondary_school') return false;
  return true;
}

function hasInstanceData(instance: Record<string, unknown>): boolean {
  return Object.values(instance).some((v) => v != null && v !== '' && v !== false);
}

interface ProfileSectionViewDisplayProps {
  section: SectionConfig;
  values: Record<string, Record<string, unknown>[]>;
}

export default function ProfileSectionViewDisplay({ section, values }: ProfileSectionViewDisplayProps) {
  const isTestSection = section.title.toLowerCase().includes('test');

  return (
    <div className="space-y-3 sm:space-y-4">
      {section.key === 'academicQualification' && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 sm:text-sm">
          Academic qualifications from 10th through your highest degree.
        </div>
      )}

      {section.subSections
        .sort((a, b) => a.order - b.order)
        .map((subSection) => {
          const instances = values[subSection.key]?.length ? values[subSection.key] : [{}];
          const filledInstances = instances.filter((inst) => hasInstanceData(inst as Record<string, unknown>));
          const displayInstances = filledInstances.length > 0 ? filledInstances : instances.slice(0, 1);

          if (isTestSection) {
            const inst = (instances[0] || {}) as Record<string, unknown>;
            const firstField = [...subSection.fields].sort((a, b) => a.order - b.order)[0];
            const taken = firstField ? inst[firstField.key] : null;
            if (!taken || taken === 'no' || taken === false) return null;
          }

          return (
            <div key={subSection.key} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 sm:px-4 sm:py-2.5">
                <h4 className="text-sm font-semibold text-gray-900">{subSection.title}</h4>
                {subSection.description && (
                  <p className="mt-0.5 text-xs text-gray-500">{subSection.description}</p>
                )}
              </div>

              <div className="divide-y divide-gray-100">
                {displayInstances.map((instance, idx) => {
                  const inst = instance as Record<string, unknown>;
                  const visibleFields = subSection.fields
                    .sort((a, b) => a.order - b.order)
                    .filter((f) => isFieldVisible(f.key, inst));

                  const hasData = hasInstanceData(inst);

                  return (
                    <div key={idx} className="px-3 py-3 sm:px-4 sm:py-3">
                      {subSection.isRepeatable && displayInstances.length > 1 && (
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-600">
                          {subSection.title} #{idx + 1}
                        </p>
                      )}
                      {!hasData ? (
                        <p className="text-sm italic text-gray-400">No information added yet</p>
                      ) : (
                        <div className={`grid grid-cols-1 gap-2 sm:gap-3 ${section.key === 'workExperience' ? '' : 'sm:grid-cols-2'}`}>
                          {visibleFields.map((field) => {
                            const raw = inst[field.key];
                            if (raw == null || raw === '') return null;
                            return (
                              <div key={field.key} className="min-w-0 rounded-md bg-gray-50 px-2.5 py-2">
                                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 sm:text-xs">
                                  {field.label}
                                </p>
                                <p className="mt-0.5 break-words text-sm font-medium text-gray-900">
                                  {formatFieldValue(raw, field.type)}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
    </div>
  );
}
