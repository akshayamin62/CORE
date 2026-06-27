'use client';

import {
  eduPlanNavShellClass,
  registrationNavBtnClass,
  registrationNavClass,
} from '@/components/studentDetailResponsive';

interface NavButton {
  key: string;
  label: string;
}

interface EducationPlanningNavProps {
  buttons: NavButton[];
  activeKey: string;
  onSelect: (key: string) => void;
  activityManagementHref?: string;
  onActivityClick?: () => void;
}

/** Horizontally scrollable EP tab nav — matches super-admin / advisor mobile pattern. */
export default function EducationPlanningNav({
  buttons,
  activeKey,
  onSelect,
  activityManagementHref,
  onActivityClick,
}: EducationPlanningNavProps) {
  return (
    <div className={eduPlanNavShellClass}>
      <div className={registrationNavClass}>
        {buttons.map((btn) => (
          <button
            key={btn.key}
            type="button"
            onClick={() => onSelect(btn.key)}
            className={`${registrationNavBtnClass} ${
              activeKey === btn.key
                ? 'border-blue-600 bg-blue-50 text-blue-600'
                : 'border-transparent text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {btn.label}
          </button>
        ))}
        {activityManagementHref ? (
          <a
            href={activityManagementHref}
            className={`${registrationNavBtnClass} border-transparent text-gray-700 hover:bg-gray-50 hover:text-gray-900`}
          >
            Activity Management
          </a>
        ) : onActivityClick ? (
          <button
            type="button"
            onClick={onActivityClick}
            className={`${registrationNavBtnClass} border-transparent text-gray-700 hover:bg-gray-50 hover:text-gray-900`}
          >
            Activity Management
          </button>
        ) : null}
      </div>
    </div>
  );
}
