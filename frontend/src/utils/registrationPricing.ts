export interface RegistrationPricingSnapshot {
  planTier: string;
  lockedNetBase: number;
  lockedGrossDiscount: number;
  lockedNetPayable: number;
  totalPaid: number;
  paymentComplete: boolean;
  paymentModel: string;
  percentPaid: number;
  gstRate: number;
}

export interface UpgradePreviewTier {
  newPlanTier: string;
  newNetBase: number;
  newNetPayable: number;
  upgradeBaseDiff: number;
  upgradeGstAmount: number;
  upgradeCharge: number;
  percentPaid: number;
  planDifference: number;
  upgradeGstRate: number;
}

export interface ServicePricingContext {
  pricing: Record<string, number> | null;
  discounts?: Record<string, { type: string; value: number; calculatedAmount: number; reason?: string }> | null;
  gstPercentage: number;
  registration?: RegistrationPricingSnapshot | null;
  upgradePreview?: Record<string, UpgradePreviewTier> | null;
}

/** Display price for a plan card — locked for current tier when registered. */
export function getPlanDisplayNetBase(
  planKey: string,
  pricing: Record<string, number> | null | undefined,
  discounts: Record<string, { calculatedAmount: number }> | null | undefined,
  registration: RegistrationPricingSnapshot | null | undefined
): number | null {
  if (registration && registration.planTier === planKey) {
    return registration.lockedNetBase;
  }
  if (!pricing || pricing[planKey] == null) return null;
  const disc = discounts?.[planKey]?.calculatedAmount ?? 0;
  return pricing[planKey] - disc;
}

/** Base upgrade difference to show on plan cards (pre-GST). */
export function getUpgradeBaseDiffDisplay(
  planKey: string,
  upgradePreview: Record<string, UpgradePreviewTier> | null | undefined
): number | null {
  const preview = upgradePreview?.[planKey];
  if (!preview || preview.upgradeBaseDiff <= 0) return null;
  return preview.upgradeBaseDiff;
}

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}
