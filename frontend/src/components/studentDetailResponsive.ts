import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { serviceAPI } from '@/lib/api';

/** Shared responsive class strings for student detail pages (mobile-first, desktop unchanged). */

export const studentPagePadding = 'px-4 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:py-6 md:pb-8 lg:p-8';

export const studentCardClass =
  'mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:mb-6 sm:p-6';

export const studentHeaderRowClass =
  'mb-4 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-start sm:justify-between';

export const studentIdentityRowClass = 'flex min-w-0 items-center';

export const studentAvatarClass =
  'mr-3 h-14 w-14 shrink-0 rounded-full object-cover sm:mr-4 sm:h-16 sm:w-16';

export const studentAvatarFallbackClass =
  'mr-3 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mr-4 sm:h-16 sm:w-16';

export const studentTitleClass = 'text-xl font-bold text-gray-900 sm:text-2xl';

export const studentBadgeRowClass = 'flex flex-wrap items-center gap-2';

export const studentMetaGridClass =
  'grid grid-cols-1 gap-3 border-t border-gray-200 pt-4 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-5';

export const studentMetaStripClass =
  'mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6';

export const registrationCardClass =
  'rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 sm:p-4';

export const registrationCardRowClass =
  'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between';

export const registrationMetaRowClass =
  'flex flex-col gap-2 text-sm text-gray-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4';

export const registrationActionBtnClass =
  'w-full shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 sm:ml-4 sm:w-auto';

export const assignRowClass = 'flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3';

export const leadPagePadding = studentPagePadding;

export const leadTitleClass = 'text-xl font-bold text-gray-900 sm:text-2xl lg:text-3xl';

export const leadContactGridClass = 'grid grid-cols-1 gap-4 sm:grid-cols-2';

export const leadQuickActionsClass = 'flex flex-wrap gap-2';

export const eduPlanStatGridClass =
  'grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5';

export const eduPlanStatCardClass =
  'rounded-xl border-2 border-gray-200 bg-white p-3.5 shadow-sm sm:p-5';

export const eduPlanNavShellClass =
  'mb-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm sm:mb-6';

export const eduPlanDashboardSectionClass = 'mb-4 space-y-6 sm:mb-6 sm:space-y-8';

export const eduPlanOverviewHeadingClass =
  'mb-3 text-lg font-semibold text-gray-900 sm:mb-4 sm:text-xl';

export const brainographyShellClass =
  'mb-4 rounded-xl border border-blue-200 bg-white p-4 shadow-sm sm:mb-6 sm:p-6';

export const brainographyHeaderRowClass =
  'mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between';

export const brainographyFileRowClass =
  'flex flex-col gap-3 border border-gray-200 rounded-lg bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4';

export const brainographyFileInfoClass = 'flex min-w-0 items-center gap-3';

export const brainographyFileMetaClass =
  'min-w-0 break-all text-sm font-medium text-gray-900 sm:truncate';

export const brainographyFileActionsClass =
  'grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:shrink-0 [&>button]:w-full [&>label]:w-full sm:[&>button]:w-auto sm:[&>label]:w-auto [&>button]:justify-center [&>label]:justify-center [&>label]:inline-flex [&>label]:items-center';

export const brainographyActionBtnClass =
  'rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 sm:py-1.5';

export const eduPlanPortfolioRowClass = 'w-full min-w-0 sm:flex-1 sm:min-w-[260px]';

/** Activity planner accomplishments — card stack on mobile, grid on md+ */
export const activityPlannerHeaderClass =
  'hidden gap-1.5 px-0.5 text-xs font-semibold uppercase text-gray-400 md:grid md:grid-cols-[80px_1fr_100px_1fr]';

export const activityPlannerRowClass =
  'rounded-lg border border-gray-100 bg-gray-50/80 p-3 md:grid md:grid-cols-[80px_1fr_100px_1fr] md:gap-1.5 md:border-0 md:bg-transparent md:p-0';

export const activityPlannerMobileLabelClass =
  'mb-1 block text-xs font-semibold uppercase text-gray-400 md:hidden';

export const registrationNavClass =
  'flex overflow-x-auto border-b border-gray-200 scrollbar-none';

export const registrationNavBtnClass =
  'shrink-0 flex items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-xs font-semibold transition-colors sm:px-4 sm:py-4 sm:text-sm';

/** Study Abroad application sections (Apply / Applied Program) */
export const registrationApplicationShellClass =
  'w-full min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white max-md:rounded-none max-md:border-x-0 md:rounded-lg';

export const registrationApplicationHeaderClass =
  'border-b border-blue-700 bg-blue-600 px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-4';

export const registrationApplicationHeaderIndigoClass =
  'border-b border-indigo-700 bg-indigo-600 px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-4';

export const registrationApplicationTitleClass =
  'text-base font-semibold text-white sm:text-xl';

export const registrationApplicationDescriptionClass =
  'mt-1 text-xs text-blue-100 sm:text-sm';

export const registrationApplicationDescriptionIndigoClass =
  'mt-1 text-xs text-indigo-100 sm:text-sm';

export const registrationApplicationBodyClass = 'w-full min-w-0 px-0 py-2 sm:p-4 md:p-6';

/** Applied programs + chat — flush horizontal padding on mobile */
export const programSectionAppliedShellClass =
  'rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-6';

export const programSectionAppliedShellChatOpenClass =
  'max-md:rounded-none max-md:border-0 max-md:p-0 max-md:shadow-none md:rounded-xl md:border md:border-gray-200 md:bg-white md:p-6 md:shadow-sm';

export const programChatPanelClass = 'w-full min-w-0 max-w-full overflow-hidden md:w-1/2';

export const programChatListWhenOpenClass =
  'max-md:max-h-[26vh] max-md:overflow-y-auto max-md:overscroll-contain max-md:border-b max-md:border-gray-200';

/** Program chat panel root — overflow-safe on mobile, fixed height on desktop */
export const programChatRootClass =
  'relative grid w-full min-w-0 max-w-full grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-none bg-white shadow-sm ring-1 ring-gray-200 max-md:border-y max-md:border-gray-200 md:h-[600px] md:rounded-lg md:shadow-lg md:ring-0';

export const programChatRootMobileExpandedClass =
  'h-[min(calc(100dvh-9rem),520px)] max-md:h-[min(calc(100dvh-9rem),520px)]';

export const programChatRootMobileDefaultClass =
  'h-[min(calc(100dvh-10rem),480px)] max-md:h-[min(calc(100dvh-10rem),480px)]';

export const programChatMessagesClass =
  'min-h-0 space-y-2 overflow-x-hidden overflow-y-auto overscroll-contain bg-gray-50 px-2 py-3 sm:space-y-3 sm:px-3 md:space-y-4 md:p-6';

export const programChatBubbleMaxClass = 'max-w-[88%] min-w-0 sm:max-w-[85%] md:max-w-md';

export const activityCalendarDropdownClass =
  'absolute right-0 top-full z-50 mt-2 w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl animate-fadeIn';

export const activityCalendarPopupClass =
  'absolute right-0 top-full z-50 mt-2 w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl animate-fadeIn max-md:fixed max-md:inset-x-3 max-md:left-3 max-md:right-3 max-md:top-[calc(5rem+env(safe-area-inset-top,28px)+0.5rem)] max-md:bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px)+0.5rem)] max-md:mt-0 max-md:flex max-md:w-auto max-md:max-w-none max-md:flex-col';

/** Parent detail pages — compact 2-col meta on mobile */
export const parentMetaGridClass =
  'grid grid-cols-2 gap-x-3 gap-y-3 border-t border-gray-200 pt-3 sm:grid-cols-3 sm:gap-4 sm:pt-4 lg:grid-cols-5';

export const parentMetaItemClass = 'min-w-0';

export const parentMetaLabelClass = 'mb-0.5 text-xs text-gray-500 sm:text-sm';

export const parentMetaValueClass = 'truncate text-sm font-medium text-gray-900';

export const parentLinkedSectionClass =
  'rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-6';

export const parentLinkedStudentRowClass =
  'flex flex-col gap-3 border-b border-gray-100 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between';

export const parentLinkedStudentBtnClass =
  'w-full shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-center text-xs font-medium text-white transition-colors hover:bg-blue-700 sm:w-auto sm:py-1.5';

/** List / browse pages for student & parent roles */
export const roleListPagePadding = studentPagePadding;

export const roleListTitleClass = 'text-xl font-bold text-gray-900 sm:text-2xl lg:text-3xl';

export const roleListSubtitleClass = 'mt-1 text-sm text-gray-600 sm:text-base';

export const roleListBackBtnClass =
  'mb-3 inline-flex items-center text-sm text-gray-600 transition-colors hover:text-gray-900 sm:mb-4';

export const roleListStatGridClass = 'mb-4 grid grid-cols-2 gap-2 sm:gap-3 md:mb-6 md:grid-cols-4 md:gap-4';

/** Single stat card row — matches admin/super-admin parents list pages */
export const roleListSingleStatGridClass =
  'mb-4 grid grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4 md:gap-6';

/** Tab-style stat cards (Browse / Enquiries, etc.) */
export const roleListTabStatGridClass =
  'mb-4 grid grid-cols-2 gap-3 sm:mb-6 sm:gap-4';

export const roleListTabRowClass = 'mb-4 flex gap-2 sm:mb-6';

export function formatSpServicePrice(priceType?: string, price?: number): string {
  if (!priceType || priceType === 'Contact for Price') return 'Contact for Price';
  const amount = price != null ? price.toLocaleString('en-IN') : '0';
  return `${priceType}: ₹${amount}`;
}

/** Return to the student's registration dashboard (Application Overview), not the service picker. */
export async function navigateToStudentApplicationDashboard(router: AppRouterInstance) {
  if (typeof window !== 'undefined') {
    const activeId = sessionStorage.getItem('activeRegistrationId');
    if (activeId) {
      router.push(`/student/registration/${activeId}`);
      return;
    }
  }
  try {
    const res = await serviceAPI.getMyServices();
    const regs = res.data.data.registrations || [];
    if (regs.length > 0) {
      const regId = regs[0]._id;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('activeRegistrationId', regId);
      }
      router.push(`/student/registration/${regId}`);
      return;
    }
  } catch {
    /* fall through */
  }
  router.push('/dashboard');
}
