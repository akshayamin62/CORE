'use client';

import {
  ivyPointerPageShellClass,
  ivyPointerReadOnlyBannerClass,
  ivyPointerHeaderRowClass,
  ivyPointerTitleClass,
  ivyPointerScoreCardClass,
  ivyPointerScoreLabelClass,
  ivyPointerScoreValueClass,
} from '@/components/studentDetailResponsive';

function ReadOnlyEyeIcon() {
  return (
    <svg className="h-5 w-5 shrink-0 text-amber-600 max-md:h-4 max-md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

export function IvyPointerPageShell({ children }: { children: React.ReactNode }) {
  return <div className={ivyPointerPageShellClass}>{children}</div>;
}

export function IvyPointerReadOnlyBanner() {
  return (
    <div className={ivyPointerReadOnlyBannerClass}>
      <ReadOnlyEyeIcon />
      <span className="text-xs font-bold uppercase tracking-wide text-amber-800 md:text-sm">Read-Only View</span>
    </div>
  );
}

interface IvyPointerPageHeaderProps {
  title: string;
  score?: number | null;
  showScore?: boolean;
}

export function IvyPointerPageHeader({ title, score, showScore = true }: IvyPointerPageHeaderProps) {
  if (!showScore) {
    return (
      <div className={ivyPointerHeaderRowClass}>
        <div className="min-w-0 flex-1">
          <h1 className={ivyPointerTitleClass}>{title}</h1>
        </div>
      </div>
    );
  }

  const displayScore = score !== null && score !== undefined ? score.toFixed(2) : '0.00';

  return (
    <div className={ivyPointerHeaderRowClass}>
      <div className="min-w-0 flex-1">
        <h1 className={ivyPointerTitleClass}>{title}</h1>
      </div>
      <div className={ivyPointerScoreCardClass}>
        <span className={ivyPointerScoreLabelClass}>
          Current Mean <br className="max-md:hidden" /> Score
        </span>
        <div className={ivyPointerScoreValueClass}>{displayScore}</div>
      </div>
    </div>
  );
}
