'use client';

import {
  registrationApplicationBodyClass,
  registrationApplicationDescriptionClass,
  registrationApplicationDescriptionIndigoClass,
  registrationApplicationHeaderClass,
  registrationApplicationHeaderIndigoClass,
  registrationApplicationShellClass,
  registrationApplicationTitleClass,
} from '@/components/studentDetailResponsive';

type HeaderTone = 'blue' | 'indigo';

interface RegistrationApplicationSectionProps {
  title: string;
  description?: string;
  headerTone?: HeaderTone;
  children: React.ReactNode;
}

/** Shared Apply / Applied Program shell — mobile-safe chat layout, desktop styling preserved at md+. */
export default function RegistrationApplicationSection({
  title,
  description,
  headerTone = 'blue',
  children,
}: RegistrationApplicationSectionProps) {
  const headerClass =
    headerTone === 'indigo' ? registrationApplicationHeaderIndigoClass : registrationApplicationHeaderClass;
  const descriptionClass =
    headerTone === 'indigo'
      ? registrationApplicationDescriptionIndigoClass
      : registrationApplicationDescriptionClass;

  return (
    <div className={registrationApplicationShellClass}>
      <div className={headerClass}>
        <h3 className={registrationApplicationTitleClass}>{title}</h3>
        {description ? <p className={descriptionClass}>{description}</p> : null}
      </div>
      <div className={registrationApplicationBodyClass}>{children}</div>
    </div>
  );
}
