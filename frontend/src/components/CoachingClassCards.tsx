'use client';

import { PlanConfig } from '@/config/servicePlans';
import { ReactNode } from 'react';

function BlueCheck() {
  return (
    <svg className="w-5 h-5 text-blue-600 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  );
}

interface CoachingClassCardsProps {
  plans: PlanConfig[];
  pricing: Record<string, number> | null;
  renderAction?: (plan: PlanConfig) => ReactNode;
  currentPlanKey?: string | null;
}

export default function CoachingClassCards({ plans, pricing, renderAction, currentPlanKey }: CoachingClassCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {plans.map((plan) => {
        const parts = plan.subtitle?.split('\u2022').map(s => s.trim()) || [];
        const sessionInfo = parts[0] || '';
        const mockInfo = parts[1] ? `${parts[1]} Included` : '';
        const price = pricing?.[plan.key];
        const isPopular = plan.key === 'IELTS_PREMIUM';
        const isCurrent = currentPlanKey === plan.key;

        return (
          <div key={plan.key} className={`bg-white p-7 rounded-2xl shadow-sm flex flex-col hover:shadow-md transition-shadow relative ${
            isCurrent ? 'ring-2 ring-green-500 border-2 border-green-200' :
            isPopular ? 'border-2 border-blue-200' : 'border border-slate-100'
          }`}>
            {isCurrent && (
              <div className="absolute top-4 right-4 px-3 py-1 bg-green-500 text-white text-[10px] uppercase font-extrabold rounded-md flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                Current
              </div>
            )}
            {isPopular && !isCurrent && (
              <span className="absolute top-4 right-4 bg-blue-600 text-white text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-md">Popular</span>
            )}
            <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
            {price != null ? (
              <div className="mb-5">
                <p className="text-2xl font-extrabold text-gray-900">₹{price.toLocaleString('en-IN')}</p>
                <p className="text-xs text-gray-400 mt-0.5">One-time payment</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 mb-5">Price not set</p>
            )}
            <ul className="space-y-2.5 flex-grow">
              {sessionInfo && (
                <li className="flex items-center gap-2.5 text-sm text-gray-600">
                  <BlueCheck />{sessionInfo}
                </li>
              )}
              {mockInfo && (
                <li className="flex items-center gap-2.5 text-sm text-gray-600">
                  <BlueCheck />{mockInfo}
                </li>
              )}
              <li className="flex items-center gap-2.5 text-sm text-gray-600">
                <BlueCheck />Study Material
              </li>
              <li className="flex items-center gap-2.5 text-sm text-gray-600">
                <BlueCheck />Session Recordings
              </li>
            </ul>
            {renderAction && <div className="mt-7">{renderAction(plan)}</div>}
          </div>
        );
      })}
    </div>
  );
}
