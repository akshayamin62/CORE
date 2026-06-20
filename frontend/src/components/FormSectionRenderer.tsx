'use client';

import { ReactNode } from 'react';
import { SectionConfig, PROFILE_PAGE_SECTIONS } from '@/config/formConfig';
import FormSubSectionRenderer from './FormSubSectionRenderer';
import TestSubSectionRenderer from './TestSubSectionRenderer';
import DocumentUploadSection from './DocumentUploadSection';
import ProfileSectionViewDisplay from './ProfileSectionViewDisplay';

const PROFILE_SECTION_KEYS = new Set([...PROFILE_PAGE_SECTIONS, 'tests']);

interface FormSectionRendererProps {
  section: SectionConfig;
  values: any;
  onChange: (subSectionId: string, index: number, key: string, value: any) => void;
  onAddInstance: (subSectionId: string) => void;
  onRemoveInstance: (subSectionId: string, index: number) => void;
  errors?: { [subSectionId: string]: { [key: string]: string }[] };
  isAdminEdit?: boolean;
  registrationId?: string;
  studentId?: string;
  userRole?: 'STUDENT' | 'OPS' | 'SUPER_ADMIN' | 'ADMIN' | 'COUNSELOR' | 'EDUPLAN_COACH' | 'IVY_EXPERT' | 'PARENT';
  readOnly?: boolean;
  readOnlyKeys?: string[];
  noDelete?: boolean;
  readOnlyInstances?: number[];
  headerActions?: ReactNode;
  compact?: boolean;
}

export default function FormSectionRenderer({
  section,
  values,
  onChange,
  onAddInstance,
  onRemoveInstance,
  errors = {},
  isAdminEdit = false,
  registrationId,
  studentId,
  userRole,
  readOnly = false,
  readOnlyKeys,
  noDelete = false,
  readOnlyInstances = [],
  headerActions,
  compact = false,
}: FormSectionRendererProps) {
  // Check if this is a document section
  const isDocumentSection = section.title.toLowerCase().includes('document');
  
  // Check if this is a test section (Standardized Tests)
  const isTestSection = section.title.toLowerCase().includes('test');

  const headerPad = compact ? 'px-3 py-2.5 sm:px-6 sm:py-4' : 'px-6 py-4';
  const titleClass = compact ? 'text-base font-semibold text-white sm:text-xl' : 'text-xl font-semibold text-white';
  const bodyPad = compact ? 'space-y-3 bg-white p-3 sm:space-y-6 sm:p-6' : 'space-y-6 bg-white p-6';

  // Read-only profile sections: view display (matches student registration), no edit button
  if (readOnly && PROFILE_SECTION_KEYS.has(section.key)) {
    return (
      <div className="relative z-10 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className={`border-b border-blue-700 bg-blue-600 ${headerPad}`}>
          <div className="min-w-0">
            <h3 className={titleClass}>{section.title}</h3>
            {section.description && (
              <p className="mt-0.5 text-xs text-blue-100 sm:text-sm">{section.description}</p>
            )}
          </div>
        </div>
        <div className={compact ? 'p-3 sm:p-4' : 'p-4 sm:p-6'}>
          <ProfileSectionViewDisplay section={section} values={values} />
        </div>
      </div>
    );
  }

  // Render document upload section for document sections
  if (isDocumentSection && registrationId && studentId && userRole) {
    return (
      <div className="relative z-10 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className={`border-b border-blue-700 bg-blue-600 ${headerPad}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className={titleClass}>{section.title}</h3>
              {section.description && (
                <p className="mt-0.5 text-xs text-blue-100 sm:text-sm">{section.description}</p>
              )}
            </div>
            {headerActions}
          </div>
        </div>
        <div className={compact ? 'p-3 sm:p-6' : 'p-6'}>
          <DocumentUploadSection
            registrationId={registrationId}
            studentId={studentId}
            userRole={userRole}
            sectionTitle={section.title}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className={`border-b border-blue-700 bg-blue-600 ${headerPad}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className={titleClass}>{section.title}</h3>
            {section.description && (
              <p className="mt-0.5 text-xs text-blue-100 sm:text-sm">{section.description}</p>
            )}
          </div>
          {headerActions}
        </div>
      </div>

      <div className={bodyPad}>
        {section.key === 'academicQualification' && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 sm:text-sm">
            <strong>Note:</strong> Please add all your academic qualifications starting from 10th (Secondary School), 12th (Higher Secondary), and up to your highest degree.
          </div>
        )}

        {section.subSections
          .sort((a, b) => a.order - b.order)
          .map((subSection, idx) => {
            const subSectionValues = values[subSection.key] || [{}];
            
            // Use TestSubSectionRenderer for test sections
            if (isTestSection) {
              return (
                <TestSubSectionRenderer
                  key={subSection.key}
                  subSection={subSection}
                  values={subSectionValues}
                  onChange={(index, key, value) =>
                    onChange(subSection.key, index, key, value)
                  }
                  errors={errors[subSection.key]}
                  isAdminEdit={isAdminEdit}
                  readOnly={readOnly}
                  compact={compact}
                />
              );
            }
            
            // Add visual separator between Mailing and Permanent Address
            const isPermanentAddress = subSection.title.includes('Permanent Address');
            
            // Use regular FormSubSectionRenderer for other sections
            return (
              <div key={subSection.key}>
                {isPermanentAddress && idx > 0 && (
                  <div className="my-6 border-t-2 border-gray-200"></div>
                )}
                <FormSubSectionRenderer
                  subSection={subSection}
                  values={subSectionValues}
                  onChange={(index, key, value) =>
                    onChange(subSection.key, index, key, value)
                  }
                  onAdd={() => onAddInstance(subSection.key)}
                  onRemove={(index) => onRemoveInstance(subSection.key, index)}
                  errors={errors[subSection.key]}
                  isAdminEdit={isAdminEdit}
                  readOnly={readOnly}
                  readOnlyKeys={readOnlyKeys}
                  noDelete={noDelete}
                  readOnlyInstances={readOnlyInstances}
                  compact={compact}
                />
              </div>
            );
          })}
      </div>
    </div>
  );
}


