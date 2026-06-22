'use client';

import {
  RegistrationPricingSnapshot,
  UpgradePreviewTier,
  getPlanDisplayNetBase,
  getUpgradeBaseDiffDisplay,
} from '@/utils/registrationPricing';

interface PlanPriceBlockProps {
  planKey: string;
  isCurrent: boolean;
  canUpgrade: boolean;
  pricing: Record<string, number> | null | undefined;
  discounts?: Record<string, { type: string; value: number; calculatedAmount: number; reason?: string }> | null;
  gstPercentage: number;
  registration?: RegistrationPricingSnapshot | null;
  upgradePreview?: Record<string, UpgradePreviewTier> | null;
  variant?: 'light' | 'dark';
  priceSize?: 'md' | 'lg';
}

export default function PlanPriceBlock({
  planKey,
  isCurrent,
  canUpgrade,
  pricing,
  discounts,
  gstPercentage,
  registration,
  upgradePreview,
  variant = 'light',
  priceSize = 'lg',
}: PlanPriceBlockProps) {
  const displayNetBase = getPlanDisplayNetBase(planKey, pricing, discounts, registration);
  const upgradeBaseDiff = getUpgradeBaseDiffDisplay(planKey, upgradePreview);
  const preview = upgradePreview?.[planKey];
  const effectiveGst = registration?.gstRate ?? gstPercentage;

  const isDark = variant === 'dark' || isCurrent;
  const priceClass = priceSize === 'lg' ? 'text-4xl' : 'text-2xl sm:text-4xl';
  const mutedClass = isDark ? 'text-blue-200' : 'text-gray-400';
  const bodyClass = isDark ? 'text-white' : 'text-gray-900';
  const accentClass = isDark ? 'text-blue-200' : 'text-gray-600';

  if (displayNetBase == null) {
    return (
      <div className="mb-5">
        <p className={`text-lg font-medium ${mutedClass}`}>Price not set</p>
      </div>
    );
  }

  const catalogBase = pricing?.[planKey];
  const catalogDiscount = discounts?.[planKey];
  const showCatalogDiscount = !isCurrent && catalogDiscount && catalogBase != null;
  const showLockedDiscount = isCurrent && registration && registration.lockedGrossDiscount > 0;

  return (
    <div className="mb-5">
      {showLockedDiscount && (
        <p className={`text-lg line-through ${mutedClass}`}>
          ₹{(displayNetBase + registration!.lockedGrossDiscount).toLocaleString('en-IN')}
        </p>
      )}
      {showCatalogDiscount && (
        <>
          <p className={`text-lg line-through ${mutedClass}`}>₹{catalogBase!.toLocaleString('en-IN')}</p>
          <p className={`text-xs font-semibold mt-0.5 ${accentClass}`}>
            {catalogDiscount!.type === 'percentage'
              ? `${catalogDiscount!.value}% off`
              : `₹${catalogDiscount!.calculatedAmount.toLocaleString('en-IN')} off`}
          </p>
          {catalogDiscount!.reason && (
            <p className={`text-xs mt-0.5 italic ${mutedClass}`}>&ldquo;{catalogDiscount!.reason}&rdquo;</p>
          )}
        </>
      )}
      <p className={`${priceClass} font-extrabold ${bodyClass}`}>
        ₹{displayNetBase.toLocaleString('en-IN')}
      </p>
      {isCurrent && registration && (
        <p className={`text-xs font-medium mt-1 ${accentClass}`}>
          Your agreed price
          {registration.paymentComplete ? ' · Fully paid' : ` · ${registration.percentPaid}% paid`}
        </p>
      )}
      <p className={`text-xs mt-1 ${mutedClass}`}>
        {effectiveGst > 0 ? `+ ${effectiveGst}% GST applicable` : 'No GST applicable'}
      </p>
      {canUpgrade && upgradeBaseDiff != null && upgradeBaseDiff > 0 && (
        <p className="text-sm text-emerald-600 font-semibold mt-2">
          +₹{upgradeBaseDiff.toLocaleString('en-IN')} upgrade difference
          {preview && preview.percentPaid > 0 && preview.percentPaid < 100 && (
            <span className="block text-xs font-normal text-emerald-700/80 mt-0.5">
              ({preview.percentPaid}% of plan gap)
            </span>
          )}
          {preview && preview.upgradeGstAmount > 0 && (
            <span className="block text-xs font-normal text-emerald-700/80 mt-0.5">
              + ₹{preview.upgradeGstAmount.toLocaleString('en-IN')} GST ({preview.upgradeGstRate ?? gstPercentage}%)
              {' · '}Pay ₹{preview.upgradeCharge.toLocaleString('en-IN')}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
