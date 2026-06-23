'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PlanConfig, ServiceFeature } from '@/config/servicePlans';

function isIncluded(val: string): boolean {
  return val === '✓' || val.startsWith('✓ ');
}

function isExcluded(val: string): boolean {
  return val === '✗' || val.startsWith('✗ ');
}

function planValueText(val: string): string {
  if (val.startsWith('✓ ')) return val.slice(2);
  if (val.startsWith('✗ ')) return val.slice(2);
  if (val === '✓') return 'Included';
  if (val === '✗') return 'Not included';
  if (val === '—' || !val) return '—';
  return val;
}

function PlanValueBadge({ val }: { val: string }) {
  const text = planValueText(val);
  if (isIncluded(val)) {
    return (
      <span className="inline-flex max-w-full items-start gap-1 text-[10px] font-semibold text-blue-700 sm:text-[11px]">
        <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-blue-100 sm:h-4 sm:w-4">
          <svg className="h-2 w-2 text-blue-600 sm:h-2.5 sm:w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <span className="min-w-0 break-words text-left leading-tight">{text}</span>
      </span>
    );
  }
  if (isExcluded(val)) {
    return (
      <span className="inline-flex max-w-full items-start gap-1 text-[10px] text-gray-400 sm:text-[11px]">
        <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-red-50 sm:h-4 sm:w-4">
          <svg className="h-2 w-2 text-red-400 sm:h-2.5 sm:w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </span>
        <span className="min-w-0 break-words text-left leading-tight">{text}</span>
      </span>
    );
  }
  return <span className="max-w-full break-words text-[10px] font-medium leading-snug text-gray-800 sm:text-[11px]">{text}</span>;
}

function useViewOnlyProtection(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const blockContext = (e: MouseEvent) => e.preventDefault();
    const blockKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 's', 'p', 'a', 'x'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', blockContext);
    document.addEventListener('keydown', blockKeys);
    return () => {
      document.removeEventListener('contextmenu', blockContext);
      document.removeEventListener('keydown', blockKeys);
    };
  }, [enabled]);
}

interface ServicePlanFeaturesDocumentProps {
  features: ServiceFeature[];
  plans: PlanConfig[];
  serviceName: string;
  currentPlanTier?: string | null;
  className?: string;
}

/** Mobile-only fullscreen plan comparison — all features, readable HTML document. */
export default function ServicePlanFeaturesDocument({
  features,
  plans,
  serviceName,
  currentPlanTier,
  className = '',
}: ServicePlanFeaturesDocumentProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useViewOnlyProtection(open);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (features.length === 0) return null;

  const modal = open ? (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-white"
      onContextMenu={(e) => e.preventDefault()}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      <div className="app-modal-safe-header shrink-0 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 px-3 pb-3 pt-3 sm:px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-snug text-white sm:text-base">{serviceName} Plan Comparison</p>
            <p className="mt-0.5 text-[10px] text-blue-100 sm:text-xs">{features.length} features · scroll to read</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-0.5 shrink-0 rounded-lg bg-white/20 px-3 py-2 text-xs font-semibold text-white hover:bg-white/30"
          >
            Close
          </button>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {plans.map((plan) => (
            <span
              key={plan.key}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                currentPlanTier === plan.key ? 'bg-white text-blue-700' : 'bg-white/20 text-white'
              }`}
            >
              {plan.name}
              {currentPlanTier === plan.key ? ' · Yours' : ''}
            </span>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 px-2.5 py-3 pb-4 sm:px-3">
        <div className="space-y-2.5">
          {features.map((feat, idx) => (
            <article
              key={`${feat.area}-${idx}`}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="border-b border-gray-100 bg-gray-50/80 px-2.5 py-2 sm:px-3">
                <h3 className="text-xs font-bold leading-snug text-gray-900 sm:text-sm">{feat.area}</h3>
                {feat.description && (
                  <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500 sm:text-xs">{feat.description}</p>
                )}
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-100">
                {plans.map((plan) => (
                  <div key={plan.key} className="min-w-0 px-1.5 py-2 sm:px-2 sm:py-2.5">
                    <p className={`mb-1 truncate text-center text-[8px] font-bold uppercase tracking-wide sm:text-[9px] ${
                      currentPlanTier === plan.key ? 'text-blue-600' : 'text-gray-400'
                    }`}>
                      {plan.name}
                    </p>
                    <div className="flex justify-center text-center">
                      <PlanValueBadge val={feat.values?.[plan.key] || '—'} />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        {serviceName === 'Study Abroad' && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2.5 text-[10px] leading-relaxed text-amber-900 sm:px-3">
            <strong>Note:</strong> Additional fees apply for extra country searches (₹7,500), university searches (₹500), and applications (₹3,500) beyond plan limits.
          </p>
        )}
      </div>

      <div className="app-modal-safe-footer shrink-0 border-t border-gray-200 bg-white px-3 py-2 text-center">
        <p className="text-[10px] font-medium text-gray-500 sm:text-xs">View only — for your reference while choosing a plan</p>
      </div>
    </div>
  ) : null;

  return (
    <div className={`md:hidden ${className}`}>
      <div className="mb-2">
        <h2 className="text-lg font-bold text-gray-900">What&apos;s Included</h2>
        <p className="text-xs text-gray-500">Compare all plan benefits</p>
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-3 rounded-xl border border-blue-200 bg-white p-3.5 text-left shadow-sm transition-all hover:border-blue-400 hover:shadow-md active:scale-[0.99]"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 transition-colors group-hover:bg-blue-200">
          <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">View Full Plan Comparison</p>
          <p className="mt-0.5 text-xs text-gray-600">
            {features.length} features · {plans.map((p) => p.name).join(' · ')}
          </p>
        </div>
        <svg className="h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {mounted && modal ? createPortal(modal, document.body) : null}
    </div>
  );
}
