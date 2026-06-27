'use client';

import { eduPlanStatCardClass, eduPlanStatGridClass } from '@/components/studentDetailResponsive';

export interface EducationPlanningStats {
  streak: { current: number; longest: number; totalDays: number };
  wordCount: { total: number; thisMonth: number };
  domainBalance?: Record<string, { planned: number; completed: number }>;
}

interface EducationPlanningStatCardsProps {
  stats: EducationPlanningStats | null;
}

/** Shared Activity Overview stat grid — 2-col mobile, desktop unchanged at md+. */
export default function EducationPlanningStatCards({ stats }: EducationPlanningStatCardsProps) {
  const entries = stats ? Object.values(stats.domainBalance || {}) : [];
  const totalPlanned = entries.reduce((s, e) => s + e.planned, 0);
  const totalCompleted = entries.reduce((s, e) => s + e.completed, 0);
  const overall = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 50) / 10 : 0;

  return (
    <div className={eduPlanStatGridClass}>
      <div className={eduPlanStatCardClass}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-lg text-orange-600 sm:h-10 sm:w-10">
            🔥
          </div>
          <h3 className="text-xl font-extrabold text-gray-900 sm:text-3xl">{stats?.streak.current ?? 0}</h3>
        </div>
        <p className="mt-2 text-xs font-semibold text-gray-700 sm:mt-3 sm:text-sm">Current Streak (days)</p>
      </div>
      <div className={eduPlanStatCardClass}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-100 text-lg text-yellow-600 sm:h-10 sm:w-10">
            🏆
          </div>
          <h3 className="text-xl font-extrabold text-gray-900 sm:text-3xl">{stats?.streak.longest ?? 0}</h3>
        </div>
        <p className="mt-2 text-xs font-semibold text-gray-700 sm:mt-3 sm:text-sm">Longest Streak (days)</p>
      </div>
      <div className={eduPlanStatCardClass}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-lg text-blue-600 sm:h-10 sm:w-10">
            📅
          </div>
          <h3 className="text-xl font-extrabold text-gray-900 sm:text-3xl">{stats?.streak.totalDays ?? 0}</h3>
        </div>
        <p className="mt-2 text-xs font-semibold text-gray-700 sm:mt-3 sm:text-sm">Total Days</p>
      </div>
      <div className={eduPlanStatCardClass}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 text-lg text-green-600 sm:h-10 sm:w-10">
            📝
          </div>
          <h3 className="text-xl font-extrabold text-gray-900 sm:text-3xl">{stats?.wordCount.total ?? 0}</h3>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 sm:mt-3">
          <p className="text-xs font-semibold text-gray-700 sm:text-sm">New Words</p>
          <p className="text-[10px] text-gray-500 sm:text-xs">{stats?.wordCount.thisMonth ?? 0} this month</p>
        </div>
      </div>
      <div className={`${eduPlanStatCardClass} col-span-2 md:col-span-1`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-lg text-purple-600 sm:h-10 sm:w-10">
            ⭐
          </div>
          <h3 className="text-xl font-extrabold text-gray-900 sm:text-3xl">{overall} / 5</h3>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 sm:mt-3">
          <p className="text-xs font-semibold text-gray-700 sm:text-sm">Overall Performance</p>
          <p className="text-[10px] text-gray-500 sm:text-xs">
            {totalCompleted}/{totalPlanned}
          </p>
        </div>
      </div>
    </div>
  );
}
