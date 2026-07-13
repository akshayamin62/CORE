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

/** Ivy League student portal — mobile-only overrides; desktop keeps original sizing */
export const ivyStudentPageShellClass =
  'mx-auto min-w-0 max-w-6xl px-6 pb-12 pt-6 md:pt-8 max-md:px-3 max-md:pt-2 max-md:pb-0';

export const ivyStudentPageTitleClass =
  'text-5xl font-black tracking-tight text-gray-900 max-md:text-2xl';

export const ivyStudentPageHeaderRowClass =
  'mb-8 flex items-start justify-between max-md:mb-6 max-md:flex-col max-md:gap-4';

/** Ivy League pointer pages — shared compact mobile chrome */
export const ivyPointerPageShellClass = ivyStudentPageShellClass;

export const ivyPointerReadOnlyBannerClass =
  'mb-4 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 max-md:mb-2 md:rounded-2xl md:border-2 md:p-4';

export const ivyPointerConversationOverlayClass =
  'max-md:fixed max-md:inset-x-0 max-md:top-[calc(4rem+env(safe-area-inset-top,0px))] max-md:bottom-0 max-md:z-[55] max-md:flex max-md:min-h-0 max-md:w-full max-md:flex-col max-md:overflow-hidden max-md:bg-white max-md:pb-[max(0.5rem,env(safe-area-inset-bottom))]';

export const ivyPointerConversationShellClass =
  'flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-white';

export const ivyPointerConversationGridClass =
  'grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden';

export const ivyPointerConversationMessagesClass =
  'min-h-0 space-y-4 overflow-y-auto bg-gray-50 px-6 py-4 max-md:px-3 max-md:py-2';

export const ivyPointerConversationInputClass =
  'shrink-0 border-t border-gray-200 bg-white px-6 py-4 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] max-md:px-3 max-md:py-2';

export const ivyPointerConversationTabsClass =
  'mb-3 flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] max-md:mb-2 max-md:flex-nowrap max-md:gap-1.5 [&::-webkit-scrollbar]:hidden';

export const ivyPointerConversationTabBtnClass =
  'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all max-md:px-2.5 max-md:py-1 max-md:text-[11px] md:px-4 md:py-2 md:text-sm';

export const ivyPointerConversationComposerClass =
  'flex items-end gap-2 max-md:gap-1.5 md:gap-3';

export const ivyPointerConversationHeaderClass =
  'shrink-0 border-b border-gray-200 bg-white';

export const ivyPointerConversationMobileBarClass =
  'flex items-center gap-2 border-b border-gray-100 px-3 py-2.5 md:hidden';

export const ivyPointerConversationBackBtnClass =
  'inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-semibold text-brand-600 active:bg-brand-50';

export const ivyPointerHeaderRowClass =
  'mb-2 flex flex-col gap-3 border-b border-gray-100 pb-2 max-md:mb-3 max-md:gap-2 max-md:pb-3 md:mb-2 md:flex-row md:items-center md:justify-between md:pb-2';

export const ivyPointerTitleClass =
  'text-5xl font-black uppercase leading-tight tracking-tight text-gray-900 max-md:text-base max-md:leading-snug';

export const ivyPointerScoreCardClass =
  'flex shrink-0 flex-col items-center justify-center rounded-xl border-2 border-brand-100 bg-white px-5 py-3 text-center shadow-sm max-md:w-full max-md:px-4 max-md:py-2.5 md:rounded-2xl md:p-6 md:shadow-md md:scale-110 md:mr-10';

export const ivyPointerScoreLabelClass =
  'mb-0.5 text-[10px] font-black uppercase leading-tight tracking-widest text-gray-400 md:mb-2 md:text-xs';

export const ivyPointerScoreValueClass =
  'text-5xl font-black leading-none text-brand-600 max-md:text-2xl';

export const ivyPointerInfoPanelClass =
  'mb-12 rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-8 shadow-lg max-md:mb-4 max-md:rounded-xl max-md:border max-md:p-3 max-md:shadow-sm';

export const ivyPointerInfoSubtitleClass =
  'text-lg font-bold text-gray-700 max-md:text-sm max-md:leading-snug';

export const ivyPointerInfoSectionClass =
  'rounded-lg border border-blue-100 bg-white p-6 max-md:p-3';

export const ivyPointerInfoSectionTitleClass =
  'mb-3 text-lg font-bold text-gray-900 max-md:mb-2 max-md:text-sm';

export const ivyPointerInfoItemClass =
  'text-base leading-relaxed text-gray-700 max-md:text-xs max-md:leading-relaxed';

export const ivyPointerActivityCardClass =
  'relative overflow-hidden rounded-lg border border-gray-200 p-6 max-md:rounded-xl max-md:p-3';

export const ivyPointerActivityTitleRowClass =
  'mb-2 grid grid-cols-[1fr_auto] items-start gap-x-2 gap-y-1.5 max-md:gap-x-1.5';

export const ivyPointerActivityTitleClass =
  'min-w-0 text-lg font-semibold text-gray-900 max-md:break-words max-md:text-base max-md:leading-snug';

export const ivyPointerActivityWeightageBadgeClass =
  'shrink-0 justify-self-end rounded-lg border-2 border-orange-400 bg-gradient-to-r from-orange-100 to-amber-100 px-2 py-1 max-md:px-1.5 max-md:py-0.5';

/** Activities pages — shell, tabs, deadline countdown, evaluate cards (student + ivy-expert) */
export const ivyPointerActivitiesShellClass =
  'mx-auto max-w-6xl rounded-lg bg-white p-8 shadow-md max-md:rounded-xl max-md:p-3';

export const ivyPointerActivitiesOuterPadClass =
  'px-4 py-12 sm:px-6 lg:px-8 max-md:px-3 max-md:py-4 max-md:pb-24';

export const ivyPointerActivitiesPageTitleClass =
  'flex items-center gap-3 text-2xl font-bold text-gray-900 max-md:text-base max-md:leading-snug';

export const ivyPointerActivitiesTabsClass =
  'mb-6 flex space-x-4 overflow-x-auto border-b border-gray-200 scrollbar-none max-md:mb-4 max-md:space-x-2';

export const ivyPointerActivitiesTabBtnClass =
  'shrink-0 px-4 py-2 font-medium max-md:px-3 max-md:py-1.5 max-md:text-sm';

export const ivyPointerAssignedActivityCardClass =
  'rounded-lg border border-brand-500 bg-brand-50 p-4 transition-all max-md:p-3';

export const ivyPointerActivityMetaRowClass =
  'mt-2 flex flex-col gap-2 text-sm max-md:gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4';

export const ivyPointerActivityDeadlineTextClass =
  'min-w-0 break-words text-gray-600 max-md:text-xs';

export const ivyPointerActivityEvaluateTitleRowClass =
  'mb-2 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center';

export const ivyPointerActivityProgressTrackClass =
  'flex w-full min-w-0 items-center gap-2 sm:w-auto';

export const ivyPointerActivityProgressBarClass =
  'h-2.5 min-w-[72px] flex-1 overflow-hidden rounded-full bg-gray-200 sm:w-32 sm:flex-none';

export const ivyPointerDeadlinePanelClass =
  'mb-4 rounded-lg border border-brand-200 bg-brand-50 p-4 max-md:p-3';

export const ivyPointerCountdownBlockClass =
  'flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3';

export const ivyPointerCountdownRowClass =
  'grid w-full grid-cols-4 gap-1.5 max-[380px]:gap-1 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-2';

export const ivyPointerCountdownUnitClass =
  'flex min-w-0 flex-col items-center rounded-lg border border-brand-300 bg-brand-100 px-1.5 py-1.5 sm:min-w-[48px] sm:px-3';

export const ivyPointerCountdownValueClass =
  'text-base font-black leading-none text-brand-700 sm:text-lg';

export const ivyPointerDeadlineUpdateRowClass =
  'mt-3 flex flex-col gap-2 border-t border-brand-200 pt-3 sm:flex-row sm:items-center sm:gap-3';

export const ivyPointerDeadlineInputClass =
  'w-full min-w-0 flex-1 rounded-lg border border-brand-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 sm:py-1.5';

export const ivyPointerDeadlineUpdateBtnClass =
  'w-full shrink-0 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-3 sm:py-1.5 sm:text-xs';

export const ivyPointerActivityTaskRowClass =
  'relative flex cursor-pointer flex-col gap-2 rounded bg-gray-50 p-2 transition-colors hover:bg-gray-100 sm:flex-row sm:items-start';

export const ivyPointerActivityTaskSelectClass = 'w-full shrink-0 sm:w-auto';

export const ivyPointerOverdueRibbonClass =
  'pointer-events-none absolute left-0 top-0 z-10 hidden h-28 w-28 overflow-hidden md:block';

export const ivyPointerOverdueBadgeClass =
  'mb-2 inline-block rounded bg-red-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white md:hidden';

export const ivyPointerRefreshRowClass = 'flex justify-end max-md:justify-stretch';

export const ivyPointerRefreshBtnClass =
  'rounded-md bg-brand-600 px-4 py-2 text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50 max-md:w-full';

export const ivyPointerSelectActivitiesBtnClass =
  'flex w-full items-center justify-center gap-3 rounded-xl bg-brand-600 px-6 py-4 text-base font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 max-md:px-4 max-md:py-3 max-md:text-sm';

export const ivyPointerActivityTaskChatBtnClass =
  'inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700 active:bg-brand-800 sm:w-auto md:hidden';

/** Pointer 1 — subject rows and section cards (mobile stack, desktop grid) */
export const ivyPointerSubjectRowClass =
  'grid grid-cols-1 gap-3 rounded-xl bg-gray-50 p-4 md:grid-cols-6 md:items-start';

export const ivyPointerSubSectionFiltersClass =
  'grid flex-1 grid-cols-1 gap-4 md:grid-cols-3';

export const ivyPointerSubSectionHeaderClass =
  'mb-6 flex flex-col gap-4 max-md:mb-4 md:flex-row md:items-start';

export const ivyPointerSectionCardClass =
  'rounded-3xl border-2 border-brand-200 bg-brand-50 p-6 shadow-lg max-md:rounded-2xl max-md:p-3';

export const ivyPointerSectionHeaderClass =
  'mb-6 flex flex-col gap-3 max-md:mb-4 md:flex-row md:items-center md:justify-between';

export const ivyPointerSectionTitleClass =
  'text-2xl font-black uppercase text-gray-900 max-md:text-lg';

export const ivyPointerInlineActionsClass =
  'flex flex-col gap-2 max-md:w-full sm:flex-row sm:flex-wrap sm:gap-3';

export const ivyPointerProjectGridClass =
  'grid grid-cols-1 gap-3 p-4 md:grid-cols-2';

/** Pointer 5 — response + words learned (stack on mobile, 70/30 on desktop) */
export const ivyPointer5ResponseGridClass =
  'grid grid-cols-1 gap-4 md:grid-cols-10';

export const ivyPointer5ResponseMainClass = 'md:col-span-7';

export const ivyPointer5WordsLearnedClass = 'md:col-span-3';

export const ivyPointerTaskCardClass =
  'overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm max-md:rounded-2xl';

export const ivyPointerTaskHeaderClass =
  'flex flex-col gap-3 max-md:gap-2 md:flex-row md:items-center md:justify-between';

export const ivyPointerTaskHeaderPaddingClass = 'p-6 max-md:p-3';

export const ivyPointerTaskExpandedClass =
  'space-y-6 border-t border-gray-100 p-6 max-md:space-y-4 max-md:p-3';

export const ivyPointerTaskPanelClass =
  'rounded-2xl border-2 border-gray-200 bg-white p-6 max-md:p-3';

export const ivyPointerEvaluationRowClass =
  'flex flex-col gap-4 max-md:gap-3 md:flex-row md:items-start md:gap-6';

export const ivyPointerFileViewerIframeClass =
  'h-[min(50vh,420px)] w-full border-0 md:h-[600px]';

/** Pointer 6 — course row fields */
export const ivyPointer6CourseRowClass =
  'flex items-start gap-3 max-md:gap-2 md:gap-4';

export const ivyPointer6CourseGridClass =
  'grid min-w-0 flex-1 grid-cols-2 gap-3 md:grid-cols-6 md:gap-4';

export const ivyPointer6CourseNameClass = 'col-span-2';

export const ivyPointer6CountdownRowClass =
  'flex flex-col gap-3 max-md:gap-2 md:flex-row md:items-center md:justify-between';

export const ivyPointer6DateRowClass =
  'flex flex-col gap-3 max-md:gap-2 sm:flex-row sm:items-end sm:gap-4';

export const ivyPointer6FileRowClass =
  'flex flex-col gap-3 rounded-lg bg-gray-50 p-4 max-md:gap-2 md:flex-row md:items-center md:justify-between';

export const ivyPointer6ScoringRowClass =
  'flex flex-col gap-3 max-md:gap-2 md:flex-row md:items-start md:gap-2';

export const ivyPointer6ScoringInputsClass =
  'flex flex-col gap-3 max-md:gap-2 sm:flex-row sm:items-start sm:gap-2';

/** Ivy League instructions + test pages */
export const ivyLeagueFlowPageClass =
  'min-h-screen overflow-x-hidden bg-gradient-to-br from-blue-50 via-white to-cyan-50';

export const ivyLeagueFlowContainerClass =
  'relative mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8';

export const ivyLeagueFlowStepCardClass =
  'flex items-stretch max-md:flex-col';

export const ivyLeagueFlowStepAsideClass =
  'flex w-24 shrink-0 flex-col items-center justify-center gap-2 bg-gradient-to-b from-[#2959ba] to-[#1e3f8a] p-4 max-md:w-full max-md:flex-row max-md:justify-center max-md:py-3 sm:w-28';

export const ivyLeagueTestHeaderClass =
  'sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur max-md:px-3 max-md:py-2 sm:px-6';

export const ivyLeagueTestSummaryGridClass =
  'mb-8 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-5';

export const ivyLeagueTestSectionRowClass =
  'flex flex-col gap-4 px-4 py-4 max-md:gap-3 sm:px-6 sm:py-5 md:flex-row md:items-center';

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

/** Ivy Expert — select activities (master/detail) */
export const ivySelectActivitiesPageClass =
  'flex min-h-screen flex-col bg-gray-50 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-0';

export const ivySelectActivitiesHeaderClass =
  'sticky top-0 z-10 border-b border-gray-200 bg-white';

export const ivySelectActivitiesHeaderInnerClass =
  'mx-auto max-w-[1600px] px-3 py-3 sm:px-6 sm:py-4';

export const ivySelectActivitiesHeaderRowClass =
  'flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4';

export const ivySelectActivitiesTitleRowClass =
  'flex min-w-0 items-center gap-3';

export const ivySelectActivitiesMainClass =
  'mx-auto w-full max-w-[1600px] flex-1 px-3 py-4 sm:px-6 sm:py-6';

export const ivySelectActivitiesSplitClass =
  'flex flex-col gap-4 md:h-[calc(100vh-180px)] md:flex-row md:gap-6';

export const ivySelectActivitiesListPanelClass =
  'flex max-h-[min(42vh,380px)] w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:max-h-none md:w-[380px] md:shrink-0';

export const ivySelectActivitiesDetailPanelClass =
  'flex min-w-0 flex-1 flex-col gap-4 md:gap-6';

export const ivySelectActivitiesListItemTitleClass =
  'text-sm font-semibold leading-tight text-gray-900 max-md:break-words md:truncate';

export const ivySelectActivitiesSummaryRowClass =
  'flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 sm:flex-row sm:items-center sm:gap-4';

export const ivySelectActivitiesSummaryFieldRowClass =
  'flex flex-wrap items-center gap-2 sm:shrink-0';

export const ivySelectActivitiesDetailTitleClass =
  'text-xl font-bold text-gray-900 max-md:break-words sm:text-2xl';

export const ivySelectActivitiesDocViewerWrapClass =
  'max-md:max-h-[min(50vh,420px)] max-md:overflow-auto';

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

/** Ivy Expert student report — scrollable question lists on mobile only */
export const ivyStudentReportQuestionsScrollClass =
  'max-md:max-h-[min(58dvh,480px)] max-md:overflow-y-auto max-md:overscroll-contain max-md:rounded-lg max-md:border max-md:border-gray-100 max-md:bg-gray-50/40 max-md:p-1 max-md:[scrollbar-width:thin] max-md:[-webkit-overflow-scrolling:touch]';

export const ivyStudentReportSectionQuestionsScrollClass =
  'divide-y divide-gray-100 max-md:max-h-[min(42dvh,360px)] max-md:overflow-y-auto max-md:overscroll-contain max-md:[scrollbar-width:thin] max-md:[-webkit-overflow-scrolling:touch]';

export const ivyStudentReportMobileScrollHintClass =
  'mb-2 text-[11px] font-medium text-gray-400 md:hidden';

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
