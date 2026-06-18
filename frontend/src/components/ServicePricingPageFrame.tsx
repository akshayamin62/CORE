'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface ServicePricingPageFrameProps {
  title: string;
  description: string;
  backHref: string;
  backLabel?: string;
  children: ReactNode;
}

export function ServicePricingPageFrame({
  title,
  description,
  backHref,
  backLabel = 'Back to Service Pricing',
  children,
}: ServicePricingPageFrameProps) {
  const router = useRouter();

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-gray-900 sm:mb-4 sm:text-sm"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {backLabel}
        </button>
        <h1 className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl lg:text-3xl">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-500 sm:text-base">{description}</p>
      </div>
      <div className="space-y-4 px-4 pb-6 sm:space-y-6 sm:px-6 sm:pb-8 lg:px-8">{children}</div>
    </div>
  );
}

interface ServicePricingIndexCardProps {
  icon: string;
  name: string;
  description: string;
  onClick: () => void;
  actionLabel?: string;
}

export function ServicePricingIndexCard({ icon, name, description, onClick, actionLabel = 'Set Base Pricing' }: ServicePricingIndexCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-xl border border-gray-100 bg-white text-left shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl sm:rounded-2xl"
    >
      <div className="h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500" />
      <div className="p-4 sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 shadow-sm transition-transform duration-300 group-hover:scale-110 sm:h-14 sm:w-14 sm:rounded-2xl">
            <span className="text-2xl sm:text-3xl">{icon}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-gray-900 transition-colors group-hover:text-blue-600 sm:text-lg">
              {name}
            </h3>
            <p className="mt-1 line-clamp-2 text-xs text-gray-500 sm:text-sm">{description}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 sm:mt-5 sm:pt-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 group-hover:text-blue-700 sm:text-sm">
            {actionLabel}
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
          <div className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-400" />
            <span className="h-2 w-2 rounded-full bg-purple-400" />
            <span className="h-2 w-2 rounded-full bg-amber-400" />
          </div>
        </div>
      </div>
    </button>
  );
}
