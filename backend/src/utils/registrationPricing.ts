import { IStudentServiceRegistration } from '../models/StudentServiceRegistration';

export const PLAN_TIER_HIERARCHY: Record<string, number> = {
  PRO: 0,
  PREMIUM: 1,
  PLATINUM: 2,
};

export interface RegistrationPricingFields {
  planTier?: string;
  discountedAmount?: number;
  totalAmount?: number;
  paymentAmount?: number;
  totalPaid?: number;
  paymentComplete?: boolean;
  paymentModel?: string;
  gstRate?: number;
  installmentPlan?: IStudentServiceRegistration['installmentPlan'];
}

export interface PlanDiscountLike {
  calculatedAmount: number;
}

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

export function getLockedNetBase(reg: {
  discountedAmount?: number;
  totalAmount?: number;
  paymentAmount?: number;
}): number {
  return reg.discountedAmount ?? reg.totalAmount ?? reg.paymentAmount ?? 0;
}

export function getLockedGrossDiscount(reg: {
  totalAmount?: number;
  discountedAmount?: number;
}): number {
  const total = reg.totalAmount ?? 0;
  const discounted = reg.discountedAmount;
  if (discounted != null && total > 0 && discounted !== total) {
    return total - discounted;
  }
  return 0;
}

export function calcGstAmount(netBase: number, gstRate: number): number {
  return Math.round(netBase * gstRate / 100);
}

export function calcNetPayable(netBase: number, gstRate: number): number {
  return netBase + calcGstAmount(netBase, gstRate);
}

/** Sum of % for paid regular installments (excludes upgrade line items). */
export function getPercentPaid(reg: RegistrationPricingFields): number {
  const schedule = reg.installmentPlan?.schedule;
  if (schedule?.length) {
    const regularPaid = schedule.filter(
      (s) => s.status === 'paid' && (!s.label || !s.label.startsWith('Upgrade'))
    );
    const fromSchedule = regularPaid.reduce((sum, s) => sum + (s.percentage || 0), 0);
    if (fromSchedule > 0) return fromSchedule;
  }
  if (reg.paymentComplete || (reg.totalPaid && reg.totalPaid > 0)) {
    return 100;
  }
  return 0;
}

function usesInstallmentGapScaling(reg: RegistrationPricingFields, percentPaid: number): boolean {
  return !!(reg.installmentPlan?.schedule?.length && percentPaid > 0 && percentPaid < 100);
}

export function getNewTierNetBase(
  livePrices: Record<string, number>,
  liveDiscounts: Record<string, PlanDiscountLike> | null | undefined,
  planTier: string
): number {
  const base = livePrices[planTier] ?? 0;
  const disc = liveDiscounts?.[planTier]?.calculatedAmount ?? 0;
  return Math.max(0, base - disc);
}

export function buildRegistrationSnapshot(
  reg: RegistrationPricingFields,
  gstRate: number
): RegistrationPricingSnapshot {
  const lockedNetBase = getLockedNetBase(reg);
  const effectiveGst = reg.gstRate ?? gstRate;
  return {
    planTier: reg.planTier || '',
    lockedNetBase,
    lockedGrossDiscount: getLockedGrossDiscount(reg),
    lockedNetPayable: calcNetPayable(lockedNetBase, effectiveGst),
    totalPaid: reg.totalPaid ?? 0,
    paymentComplete: !!reg.paymentComplete,
    paymentModel: reg.paymentModel || 'one-time',
    percentPaid: getPercentPaid(reg),
    gstRate: effectiveGst,
  };
}

export function computeUpgradePreview(
  reg: RegistrationPricingFields,
  livePrices: Record<string, number>,
  liveDiscounts: Record<string, PlanDiscountLike> | null | undefined,
  newPlanTier: string,
  catalogGstRate: number
): UpgradePreviewTier | null {
  const currentTier = reg.planTier;
  if (!currentTier || currentTier === newPlanTier) return null;

  const currentRank = PLAN_TIER_HIERARCHY[currentTier] ?? -1;
  const newRank = PLAN_TIER_HIERARCHY[newPlanTier] ?? -1;
  if (newRank <= currentRank) return null;

  const lockedGstRate = reg.gstRate ?? catalogGstRate;
  const lockedNetBase = getLockedNetBase(reg);
  const lockedNetPayable = calcNetPayable(lockedNetBase, lockedGstRate);
  const newNetBase = getNewTierNetBase(livePrices, liveDiscounts, newPlanTier);
  if (newNetBase <= 0) return null;

  // New plan commitment uses current admin GST; locked side uses registration GST (already paid).
  const newNetPayable = calcNetPayable(newNetBase, catalogGstRate);
  const percentPaid = getPercentPaid(reg);

  const fullBaseDiff = Math.max(0, newNetBase - lockedNetBase);
  const upgradeBaseDiff = usesInstallmentGapScaling(reg, percentPaid)
    ? Math.round(fullBaseDiff * percentPaid / 100)
    : fullBaseDiff;

  // Upgrade payment = base difference + GST on that difference only (old GST already paid).
  const upgradeGstAmount = calcGstAmount(upgradeBaseDiff, catalogGstRate);
  const upgradeCharge = upgradeBaseDiff + upgradeGstAmount;

  return {
    newPlanTier,
    newNetBase,
    newNetPayable,
    upgradeBaseDiff,
    upgradeGstAmount,
    upgradeCharge,
    percentPaid,
    planDifference: newNetPayable - lockedNetPayable,
    upgradeGstRate: catalogGstRate,
  };
}

export function buildUpgradePreviewMap(
  reg: RegistrationPricingFields,
  livePrices: Record<string, number>,
  liveDiscounts: Record<string, PlanDiscountLike> | null | undefined,
  catalogGstRate: number
): Record<string, UpgradePreviewTier> {
  const previews: Record<string, UpgradePreviewTier> = {};
  for (const tier of Object.keys(livePrices)) {
    const preview = computeUpgradePreview(reg, livePrices, liveDiscounts, tier, catalogGstRate);
    if (preview) previews[tier] = preview;
  }
  return previews;
}
