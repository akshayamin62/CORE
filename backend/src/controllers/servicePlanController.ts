import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import ServicePricing from '../models/ServicePricing';
import SuperAdminServicePricing from '../models/SuperAdminServicePricing';
import Admin from '../models/Admin';
import Student from '../models/Student';
import Service from '../models/Service';
import StudentServiceRegistration, { ServiceRegistrationStatus } from '../models/StudentServiceRegistration';
import User from '../models/User';
import Counselor from '../models/Counselor';
import { USER_ROLE } from '../types/roles';
import { sendServiceRegistrationEmailToSuperAdmin } from '../utils/email';

// Get pricing for the student's admin for a specific service
export const getPricingForStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serviceSlug } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    if (!userId) { res.status(401).json({ success: false, message: 'Not authenticated' }); return; }

    let adminId: any;
    if (userRole === USER_ROLE.COUNSELOR) {
      const counselor = await Counselor.findOne({ userId }).lean();
      if (!counselor || !counselor.adminId) { res.status(404).json({ success: false, message: 'Counselor or admin not found' }); return; }
      // counselor.adminId is the admin's User._id, but ServicePricing uses Admin._id
      const admin = await Admin.findOne({ userId: counselor.adminId }).lean();
      if (!admin) { res.status(404).json({ success: false, message: 'Admin not found' }); return; }
      adminId = admin._id;
    } else {
      const student = await Student.findOne({ userId }).lean();
      if (!student || !student.adminId) { res.status(404).json({ success: false, message: 'Student or admin not found' }); return; }
      adminId = student.adminId;
    }

    const pricing = await ServicePricing.findOne({ adminId, serviceSlug }).lean();
    if (!pricing) {
      res.json({ success: true, data: { pricing: null, message: 'Pricing not set by your admin yet' } });
      return;
    }
    res.json({
      success: true,
      data: { pricing: pricing.prices },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch pricing' });
  }
};

// Register student for a service with chosen plan tier
export const registerServicePlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serviceSlug } = req.params;
    const userId = req.user?.userId;
    const { planTier } = req.body;
    const classTiming = req.body.classTiming || undefined;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    if (!planTier || typeof planTier !== 'string') {
      res.status(400).json({ success: false, message: 'Invalid plan tier.' });
      return;
    }

    const student = await Student.findOne({ userId });
    if (!student) {
      res.status(404).json({ success: false, message: 'Student record not found' });
      return;
    }

    const service = await Service.findOne({ slug: serviceSlug });
    if (!service) {
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }
    if (!service.isActive) {
      res.status(400).json({ success: false, message: 'This service is not currently available' });
      return;
    }

    const isCoaching = serviceSlug === 'coaching-classes';

    if (isCoaching) {
      // For coaching: check if already registered for this specific class (planTier)
      const existingClass = await StudentServiceRegistration.findOne({
        studentId: student._id,
        serviceId: service._id,
        planTier,
      });
      if (existingClass) {
        res.status(400).json({ success: false, message: `You are already registered for ${planTier}` });
        return;
      }
    } else {
      // For other services: one registration per service
      const existing = await StudentServiceRegistration.findOne({
        studentId: student._id,
        serviceId: service._id,
      });
      if (existing) {
        res.status(400).json({ success: false, message: `You are already registered for ${service.name}` });
        return;
      }
    }

    let paymentAmount: number | undefined;
    if (student.adminId) {
      const pricing = await ServicePricing.findOne({ adminId: student.adminId, serviceSlug }).lean();
      if (pricing && pricing.prices) {
        const pricesObj = pricing.prices as unknown as Record<string, number>;
        paymentAmount = pricesObj[planTier];
      }
    }

    const registration = await StudentServiceRegistration.create({
      studentId: student._id,
      serviceId: service._id,
      planTier,
      ...(isCoaching && classTiming ? { classTiming } : {}),
      status: ServiceRegistrationStatus.REGISTERED,
      paymentAmount,
    });

    const populated = await StudentServiceRegistration.findById(registration._id).populate('serviceId');

    // Notify super admin
    try {
      const superAdmin = await User.findOne({ role: USER_ROLE.SUPER_ADMIN });
      if (superAdmin) {
        const studentUser = await User.findById(userId);
        await sendServiceRegistrationEmailToSuperAdmin(
          superAdmin.email,
          [studentUser?.firstName, studentUser?.middleName, studentUser?.lastName].filter(Boolean).join(' ') || 'Unknown Student',
          studentUser?.email || 'Unknown Email',
          `${service.name} (${planTier})`
        );
      }
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
    }

    res.status(201).json({
      success: true,
      message: `Successfully registered for ${service.name} ${planTier} plan`,
      data: { registration: populated },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to register' });
  }
};

// ============ Admin Pricing ============

// Get admin's pricing for a service
export const getAdminPricing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serviceSlug } = req.params;
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, message: 'Not authenticated' }); return; }

    const admin = await Admin.findOne({ userId }).lean();
    if (!admin) { res.status(404).json({ success: false, message: 'Admin not found' }); return; }

    const pricing = await ServicePricing.findOne({ adminId: admin._id, serviceSlug }).lean();
    res.json({
      success: true,
      data: {
        pricing: pricing ? pricing.prices : null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch pricing' });
  }
};

// Set/update admin's pricing for a service
export const setAdminPricing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serviceSlug } = req.params;
    const userId = req.user?.userId;
    const { prices } = req.body;

    if (!userId) { res.status(401).json({ success: false, message: 'Not authenticated' }); return; }

    if (!prices || typeof prices !== 'object' || Array.isArray(prices)) {
      res.status(400).json({ success: false, message: 'Prices object is required' });
      return;
    }
    for (const [key, val] of Object.entries(prices)) {
      if (typeof val !== 'number' || val < 0) {
        res.status(400).json({ success: false, message: `Invalid price for ${key}. Must be a non-negative number.` });
        return;
      }
    }

    const admin = await Admin.findOne({ userId }).lean();
    if (!admin) { res.status(404).json({ success: false, message: 'Admin not found' }); return; }

    const pricing = await ServicePricing.findOneAndUpdate(
      { adminId: admin._id, serviceSlug },
      { adminId: admin._id, serviceSlug, prices },
      { upsert: true, new: true, runValidators: true }
    );

    const savedPrices = pricing.prices instanceof Map ? Object.fromEntries(pricing.prices) : pricing.prices;
    res.json({
      success: true,
      message: 'Pricing updated successfully',
      data: { pricing: savedPrices },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update pricing' });
  }
};

// ============ Super Admin Base Pricing ============

// Get super admin's base pricing for a service
export const getSuperAdminPricing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serviceSlug } = req.params;
    const pricing = await SuperAdminServicePricing.findOne({ serviceSlug }).lean();
    res.json({
      success: true,
      data: {
        pricing: pricing ? pricing.prices : null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch super admin pricing' });
  }
};

// Set/update super admin's base pricing for a service
export const setSuperAdminPricing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serviceSlug } = req.params;
    const { prices } = req.body;

    if (!prices || typeof prices !== 'object' || Array.isArray(prices)) {
      res.status(400).json({ success: false, message: 'Prices object is required' });
      return;
    }
    for (const [key, val] of Object.entries(prices)) {
      if (typeof val !== 'number' || val < 0) {
        res.status(400).json({ success: false, message: `Invalid price for ${key}. Must be a non-negative number.` });
        return;
      }
    }

    const pricing = await SuperAdminServicePricing.findOneAndUpdate(
      { serviceSlug },
      { serviceSlug, prices },
      { upsert: true, new: true, runValidators: true }
    );

    const savedPrices = pricing.prices instanceof Map ? Object.fromEntries(pricing.prices) : pricing.prices;
    res.json({
      success: true,
      message: 'Base pricing updated successfully',
      data: { pricing: savedPrices },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update base pricing' });
  }
};

// Get base pricing for admin to see (admin views super admin's base price)
export const getBasePricingForAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serviceSlug } = req.params;
    const pricing = await SuperAdminServicePricing.findOne({ serviceSlug }).lean();
    res.json({
      success: true,
      data: {
        basePricing: pricing ? pricing.prices : null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch base pricing' });
  }
};

// Get admin's selling price for any authenticated role (for viewing plans)
// Note: adminId param may be either the Admin model _id or the User._id of the admin
export const getAdminPricingByAdminId = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serviceSlug, adminId } = req.params;

    // Try directly as Admin._id first (used by student detail pages)
    let pricing = await ServicePricing.findOne({ adminId, serviceSlug }).lean();

    // If not found, adminId might be a User._id (used by super admin pages)
    if (!pricing) {
      const admin = await Admin.findOne({ userId: adminId }).lean();
      if (admin) {
        pricing = await ServicePricing.findOne({ adminId: admin._id, serviceSlug }).lean();
      }
    }

    res.json({
      success: true,
      data: {
        pricing: pricing ? pricing.prices : null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch admin pricing' });
  }
};

// ============ Plan Upgrade ============

// Student upgrades their plan tier for a service
export const upgradePlanTier = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serviceSlug } = req.params;
    const userId = req.user?.userId;
    const { newPlanTier } = req.body;

    if (!userId) { res.status(401).json({ success: false, message: 'Not authenticated' }); return; }
    if (!newPlanTier || typeof newPlanTier !== 'string') {
      res.status(400).json({ success: false, message: 'Invalid plan tier.' }); return;
    }

    const student = await Student.findOne({ userId });
    if (!student) { res.status(404).json({ success: false, message: 'Student record not found' }); return; }

    const service = await Service.findOne({ slug: serviceSlug });
    if (!service) { res.status(404).json({ success: false, message: 'Service not found' }); return; }

    const registration = await StudentServiceRegistration.findOne({
      studentId: student._id,
      serviceId: service._id,
    });
    if (!registration) {
      res.status(404).json({ success: false, message: 'No existing registration found for this service' }); return;
    }
    if (registration.planTier === newPlanTier) {
      res.status(400).json({ success: false, message: 'You are already on this plan' }); return;
    }

    const oldPlanTier = registration.planTier;
    registration.planTier = newPlanTier;

    // Update payment amount based on new tier pricing
    if (student.adminId) {
      const pricing = await ServicePricing.findOne({ adminId: student.adminId, serviceSlug }).lean();
      if (pricing && pricing.prices) {
        const pricesObj = pricing.prices as unknown as Record<string, number>;
        registration.paymentAmount = pricesObj[newPlanTier];
      }
    }

    await registration.save();

    const populated = await StudentServiceRegistration.findById(registration._id).populate('serviceId');

    res.json({
      success: true,
      message: `Successfully upgraded from ${oldPlanTier} to ${newPlanTier}`,
      data: { registration: populated },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to upgrade plan' });
  }
};

// Get a student's current plan tiers for all services (for admin/staff viewing)
export const getStudentPlanTiers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;
    const [registrations, student] = await Promise.all([
      StudentServiceRegistration.find({ studentId })
        .populate('serviceId', 'name slug')
        .select('planTier serviceId classTiming')
        .lean(),
      Student.findById(studentId).populate('userId', 'firstName middleName lastName').lean(),
    ]);

    const planTiers: Record<string, string> = {};
    const coachingPlanTiers: Record<string, { batchDate?: string; timeFrom?: string; timeTo?: string } | null> = {};
    for (const reg of registrations) {
      const svc = reg.serviceId as any;
      if (svc?.slug && reg.planTier) {
        if (svc.slug === 'coaching-classes') {
          coachingPlanTiers[reg.planTier] = (reg as any).classTiming || null;
        } else {
          planTiers[svc.slug] = reg.planTier;
        }
      }
    }

    const u = student?.userId as any;
    const studentName = u ? [u.firstName, u.middleName, u.lastName].filter(Boolean).join(' ') : '';
    const adminId = student?.adminId?.toString() || '';

    res.json({ success: true, data: { planTiers, coachingPlanTiers, studentName, adminId } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch student plan tiers' });
  }
};
