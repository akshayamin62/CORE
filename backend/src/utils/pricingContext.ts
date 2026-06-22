import mongoose from 'mongoose';
import StudentServiceRegistration from '../models/StudentServiceRegistration';

/** Normalize Mongoose Map or plain object prices into a string-keyed record. */
export function normalizePricesMap(prices: unknown): Record<string, number> {
  if (!prices) return {};
  if (prices instanceof Map) {
    return Object.fromEntries(prices.entries());
  }
  if (typeof prices === 'object') {
    return prices as Record<string, number>;
  }
  return {};
}

/**
 * Resolve whether to load ServicePricing from admin or advisor for a student+service.
 * Matches getPricingForStudent: transferred students keep advisor pricing for advisor-registered services.
 */
export async function resolveServicePricingOwner(
  student: {
    _id: mongoose.Types.ObjectId;
    adminId?: mongoose.Types.ObjectId | null;
    advisorId?: mongoose.Types.ObjectId | null;
  },
  serviceId: mongoose.Types.ObjectId
): Promise<{ adminId?: mongoose.Types.ObjectId; advisorId?: mongoose.Types.ObjectId } | null> {
  let adminId = student.adminId ?? undefined;
  let advisorId = student.advisorId ?? undefined;

  if (adminId && advisorId) {
    const advisorReg = await StudentServiceRegistration.findOne({
      studentId: student._id,
      serviceId,
      registeredViaAdvisorId: { $exists: true, $ne: null },
    })
      .select('_id')
      .lean();

    if (advisorReg) {
      adminId = undefined;
    } else {
      advisorId = undefined;
    }
  }

  if (adminId) return { adminId };
  if (advisorId) return { advisorId };
  return null;
}
