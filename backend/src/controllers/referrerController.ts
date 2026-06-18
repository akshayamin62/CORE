import { Response, Request } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../types/auth";
import User from "../models/User";
import Admin from "../models/Admin";
import Referrer, { REFERRER_STAGE } from "../models/Referrer";
import Lead, { LEAD_STAGE, SERVICE_TYPE } from "../models/Lead";
import Student from "../models/Student";
import StudentServiceRegistration from "../models/StudentServiceRegistration";
import StudentFormAnswer from "../models/StudentFormAnswer";
import LeadStudentConversion from "../models/LeadStudentConversion";
import { USER_ROLE } from "../types/roles";
import { generateSlug } from "./leadController";
import { sendWhatsAppEnquiryWelcome, sendWhatsAppGeneralNotification, sendWhatsAppGeneral4LineNotification } from "../utils/whatsapp";
import { sendEmail } from "../utils/email";

/**
 * Generate a unique referral slug (checks Referrer collection)
 */
const getUniqueReferralSlug = async (baseSlug: string): Promise<string> => {
  let slug = baseSlug;
  let counter = 1;

  while (await Referrer.findOne({ referralSlug: slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

/** Old referrer documents may not have notes field — Mongoose default only applies on create */
function getReferrerNotes(referrer: { notes?: unknown }) {
  return Array.isArray(referrer.notes) ? referrer.notes : [];
}

const REFERRER_PHONE_REGEX = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,5}[-\s.]?[0-9]{1,5}$/;

async function getNoteCreatorName(userId?: string): Promise<string> {
  if (!userId) return '';
  const creatorUser = await User.findById(userId).select('firstName middleName lastName');
  return creatorUser
    ? [creatorUser.firstName, creatorUser.middleName, creatorUser.lastName].filter(Boolean).join(' ')
    : '';
}

function buildReferrerProfileUpdates(
  body: Record<string, unknown>,
  options?: { allowAdminId?: boolean }
): { updates: Record<string, unknown>; error?: string } {
  const updates: Record<string, unknown> = {};

  if (body.email !== undefined) {
    const email = String(body.email).trim().toLowerCase();
    if (!email) return { updates: {}, error: 'Email is required' };
    updates.email = email;
  }
  if (body.mobileNumber !== undefined) {
    const mobile = String(body.mobileNumber).trim();
    if (!mobile) return { updates: {}, error: 'Mobile number is required' };
    if (!REFERRER_PHONE_REGEX.test(mobile)) {
      return { updates: {}, error: 'Invalid phone number format' };
    }
    updates.mobileNumber = mobile;
  }
  if (body.country !== undefined) updates.country = String(body.country).trim();
  if (body.state !== undefined) updates.state = String(body.state).trim();
  if (body.city !== undefined) updates.city = String(body.city).trim();
  if (body.qualification !== undefined) updates.qualification = String(body.qualification).trim();
  if (body.currentRole !== undefined) updates.currentRole = String(body.currentRole).trim();
  if (options?.allowAdminId && body.adminId !== undefined) {
    if (!body.adminId) return { updates: {}, error: 'Admin selection is required' };
    updates.adminId = body.adminId;
  }

  if (Object.keys(updates).length === 0) {
    return { updates: {}, error: 'No fields to update' };
  }

  return { updates };
}

function mapReferrerProfile(re: any) {
  return {
    _id: re._id,
    userId: re.userId,
    adminId: re.adminId,
    email: re.email,
    mobileNumber: re.mobileNumber,
    country: re.country,
    state: re.state,
    city: re.city,
    qualification: re.qualification,
    currentRole: re.currentRole,
    stage: re.stage || REFERRER_STAGE.NEW,
    referralSlug: re.referralSlug,
    createdAt: re.createdAt,
  };
}

// ============= ADMIN ENDPOINTS (manage referrers) =============

/**
 * Create a new Referrer (Admin only)
 */
export const createReferrer = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { firstName, middleName, lastName, email, mobileNumber, country, state, city, qualification, currentRole } = req.body;
    const adminUserId = req.user?.userId;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, and email are required",
      });
    }

    if (!mobileNumber || !mobileNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required",
      });
    }

    if (!country?.trim() || !state?.trim() || !city?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Country, state, and city are required",
      });
    }

    if (!qualification?.trim() || !currentRole?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Qualification and current role are required",
      });
    }

    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,5}[-\s.]?[0-9]{1,5}$/;
    if (!phoneRegex.test(mobileNumber.trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number format",
      });
    }

    if (!adminUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Create user with REFERRER role
    const newUser = new User({
      firstName: firstName.trim(),
      middleName: middleName?.trim() || undefined,
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      role: USER_ROLE.REFERRER,
      isVerified: true,
      isActive: true,
      mobileNumber: mobileNumber?.trim() || undefined,
    });
    await newUser.save();

    // Create referrer first, then generate slug with ObjectId for guaranteed uniqueness
    const newReferrer = new Referrer({
      userId: newUser._id,
      adminId: adminUserId,
      email: email.toLowerCase().trim(),
      mobileNumber: mobileNumber?.trim() || undefined,
      country: country.trim(),
      state: state.trim(),
      city: city.trim(),
      qualification: qualification.trim(),
      currentRole: currentRole.trim(),
      stage: REFERRER_STAGE.NEW,
      referralSlug: 'temp', // placeholder
    });
    await newReferrer.save();

    // Generate unique referral slug: name-referrerId
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    const baseSlug = generateSlug(fullName);
    const referralSlug = `${baseSlug}-${newReferrer._id}`;
    newReferrer.referralSlug = referralSlug;
    await newReferrer.save();

    return res.status(201).json({
      success: true,
      message: "Referrer created successfully",
      data: {
        referrer: {
          _id: newReferrer._id,
          userId: newUser._id,
          firstName: newUser.firstName,
          middleName: newUser.middleName,
          lastName: newUser.lastName,
          email: newUser.email,
          mobileNumber: newReferrer.mobileNumber,
          country: newReferrer.country,
          state: newReferrer.state,
          city: newReferrer.city,
          qualification: newReferrer.qualification,
          currentRole: newReferrer.currentRole,
          stage: newReferrer.stage,
          referralSlug: newReferrer.referralSlug,
        },
      },
    });
  } catch (error: any) {
    console.error("Create referrer error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create referrer",
    });
  }
};

/**
 * Get all referrers created by the logged-in admin
 */
export const getReferrers = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const adminUserId = req.user?.userId;

    if (!adminUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const referrers = await Referrer.find({ adminId: adminUserId })
      .populate("userId", "firstName middleName lastName email profilePicture isActive isVerified")
      .sort({ createdAt: -1 });

    // Get lead counts for each referrer
    const referrerIds = referrers.map((r) => r._id);
    const leadCounts = await Lead.aggregate([
      { $match: { referrerId: { $in: referrerIds } } },
      { $group: { _id: "$referrerId", total: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    leadCounts.forEach((lc: any) => {
      countMap[lc._id.toString()] = lc.total;
    });

    // Get overall lead stage breakdown across all referrers for this admin
    const stageCountsArr = await Lead.aggregate([
      { $match: { referrerId: { $in: referrerIds } } },
      { $group: { _id: "$stage", total: { $sum: 1 } } },
    ]);
    const overallStageCounts: Record<string, number> = {};
    let totalLeadsOverall = 0;
    stageCountsArr.forEach((sc: any) => {
      overallStageCounts[sc._id] = sc.total;
      totalLeadsOverall += sc.total;
    });

    return res.status(200).json({
      success: true,
      message: "Referrers fetched successfully",
      data: {
        overallLeadStats: {
          total: totalLeadsOverall,
          stageCounts: overallStageCounts,
        },
        referrers: referrers.map((r: any) => ({
          _id: r._id,
          userId: r.userId,
          email: r.email,
          mobileNumber: r.mobileNumber,
          country: r.country,
          state: r.state,
          city: r.city,
          qualification: r.qualification,
          currentRole: r.currentRole,
          stage: r.stage || REFERRER_STAGE.NEW,
          referralSlug: r.referralSlug,
          leadCount: countMap[r._id.toString()] || 0,
          createdAt: r.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error("Get referrers error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch referrers",
    });
  }
};

/**
 * Toggle referrer active status (Admin only)
 */
export const toggleReferrerStatus = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { referrerId } = req.params;
    const adminUserId = req.user?.userId;

    if (!adminUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const referrer = await Referrer.findOne({
      _id: referrerId,
      adminId: adminUserId,
    });

    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: "Referrer not found or unauthorized",
      });
    }

    const user = await User.findById(referrer.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // If the referrer is in Closed stage — just reactivate and reset stage to New
    // (do NOT run the verification flow, do NOT change isVerified)
    if (referrer.stage === REFERRER_STAGE.CLOSED) {
      user.isActive = true;
      await Referrer.findByIdAndUpdate(referrer._id, { $set: { stage: REFERRER_STAGE.NEW } }, { runValidators: false });
      referrer.stage = REFERRER_STAGE.NEW;
    } else if (!user.isVerified) {
      // First-time activation: verify, activate, set stage to Converted
      user.isVerified = true;
      user.isActive = true;
      await Referrer.findByIdAndUpdate(referrer._id, { $set: { stage: REFERRER_STAGE.CONVERTED } }, { runValidators: false });
      referrer.stage = REFERRER_STAGE.CONVERTED;

      // Send activation email
      const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ');
      const referralLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/referral/${referrer.referralSlug}`;
      try {
        await sendEmail({
          to: referrer.email,
          subject: 'Your Kareer Studio Referrer Account is Now Active!',
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937">
              <div style="background:#7c3aed;padding:24px;border-radius:12px 12px 0 0;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:24px">Account Activated!</h1>
              </div>
              <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb">
                <p style="font-size:16px;margin-top:0">Hi <strong>${fullName}</strong>,</p>
                <p style="font-size:15px;color:#374151">Congratulations! Your referrer account on the <strong>Kareer Studio</strong> platform has been verified and activated.</p>
                <p style="font-size:15px;color:#374151">Use the referral link below to generate leads and connect people with our services.</p>
                <div style="background:#ede9fe;border:1px solid #ddd6fe;border-radius:8px;padding:16px;margin:24px 0">
                  <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#6d28d9;text-transform:uppercase">Your Referral Link</p>
                  <a href="${referralLink}" style="color:#7c3aed;word-break:break-all;font-size:14px">${referralLink}</a>
                </div>
                <a href="${referralLink}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Open Referral Link</a>
                <p style="font-size:13px;color:#6b7280;margin-top:32px">If you have any questions, please reach out to your coordinator.</p>
                <p style="font-size:13px;color:#6b7280;margin:0">– The Kareer Studio Team</p>
              </div>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('Failed to send referrer activation email:', emailErr);
      }

      // Send WhatsApp notification
      if (referrer.mobileNumber) {
        try {
          await sendWhatsAppGeneralNotification(
            referrer.mobileNumber,
            fullName,
            'Your Kareer Studio referrer account is now active!',
            `Use your referral link to create leads: ${referralLink}`
          );
        } catch (waErr) {
          console.error('Failed to send referrer activation WhatsApp:', waErr);
        }
      }
    } else {
      // Already verified: just toggle active state
      user.isActive = !user.isActive;
    }
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Referrer ${user.isActive ? "activated" : "deactivated"} successfully`,
      data: { isActive: user.isActive, isVerified: user.isVerified },
    });
  } catch (error: any) {
    console.error("Toggle referrer status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle referrer status",
    });
  }
};

// ============= SUPER ADMIN ENDPOINTS =============

/**
 * Get all referrers across all admins (Super Admin)
 */
export const getAllReferrersForSuperAdmin = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const referrers = await Referrer.find()
      .populate("userId", "firstName middleName lastName email profilePicture isActive isVerified")
      .populate("adminId", "firstName middleName lastName email")
      .sort({ createdAt: -1 });

    // Get companyName for each admin from Admin model
    const adminUserIds = [...new Set(referrers.map((r: any) => r.adminId?._id?.toString()).filter(Boolean))];
    const adminProfiles = await Admin.find({ userId: { $in: adminUserIds } }).select('userId companyName');
    const companyMap: Record<string, string> = {};
    adminProfiles.forEach((ap: any) => {
      companyMap[ap.userId.toString()] = ap.companyName;
    });

    const referrerIds = referrers.map((r) => r._id);
    const leadCounts = await Lead.aggregate([
      { $match: { referrerId: { $in: referrerIds } } },
      { $group: { _id: "$referrerId", total: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    leadCounts.forEach((lc: any) => {
      countMap[lc._id.toString()] = lc.total;
    });

    // Get overall lead stage breakdown across all referrers
    const stageCountsArr = await Lead.aggregate([
      { $match: { referrerId: { $in: referrerIds } } },
      { $group: { _id: "$stage", total: { $sum: 1 } } },
    ]);
    const overallStageCounts: Record<string, number> = {};
    let totalLeadsOverall = 0;
    stageCountsArr.forEach((sc: any) => {
      overallStageCounts[sc._id] = sc.total;
      totalLeadsOverall += sc.total;
    });

    return res.status(200).json({
      success: true,
      message: "All referrers fetched successfully",
      data: {
        overallLeadStats: {
          total: totalLeadsOverall,
          stageCounts: overallStageCounts,
        },
        referrers: referrers.map((r: any) => ({
          _id: r._id,
          userId: r.userId,
          adminId: r.adminId,
          adminCompanyName: r.adminId ? companyMap[r.adminId._id.toString()] : undefined,
          email: r.email,
          mobileNumber: r.mobileNumber,
          country: r.country,
          state: r.state,
          city: r.city,
          qualification: r.qualification,
          currentRole: r.currentRole,
          stage: r.stage || REFERRER_STAGE.NEW,
          referralSlug: r.referralSlug,
          leadCount: countMap[r._id.toString()] || 0,
          createdAt: r.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error("Get all referrers for super admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch referrers",
    });
  }
};

/**
 * Create a referrer under a specific admin (Super Admin)
 */
export const createReferrerForSuperAdmin = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { firstName, middleName, lastName, email, mobileNumber, adminId, country, state, city, qualification, currentRole } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, and email are required",
      });
    }

    if (!mobileNumber || !mobileNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required",
      });
    }

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "Admin selection is required",
      });
    }

    if (!country?.trim() || !state?.trim() || !city?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Country, state, and city are required",
      });
    }

    if (!qualification?.trim() || !currentRole?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Qualification and current role are required",
      });
    }

    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,5}[-\s.]?[0-9]{1,5}$/;
    if (!phoneRegex.test(mobileNumber.trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number format",
      });
    }

    // Verify adminId is a valid admin user
    const adminUser = await User.findById(adminId);
    if (!adminUser || adminUser.role !== USER_ROLE.ADMIN) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin selected",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const newUser = new User({
      firstName: firstName.trim(),
      middleName: middleName?.trim() || undefined,
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      role: USER_ROLE.REFERRER,
      isVerified: true,
      isActive: true,
      mobileNumber: mobileNumber?.trim() || undefined,
    });
    await newUser.save();

    // Create referrer first, then generate slug with ObjectId for guaranteed uniqueness
    const newReferrer = new Referrer({
      userId: newUser._id,
      adminId,
      email: email.toLowerCase().trim(),
      mobileNumber: mobileNumber?.trim() || undefined,
      country: country.trim(),
      state: state.trim(),
      city: city.trim(),
      qualification: qualification.trim(),
      currentRole: currentRole.trim(),
      stage: REFERRER_STAGE.NEW,
      referralSlug: 'temp', // placeholder
    });
    await newReferrer.save();

    // Generate unique referral slug: name-referrerId
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    const baseSlug = generateSlug(fullName);
    const referralSlug = `${baseSlug}-${newReferrer._id}`;
    newReferrer.referralSlug = referralSlug;
    await newReferrer.save();

    return res.status(201).json({
      success: true,
      message: "Referrer created successfully",
      data: {
        referrer: {
          _id: newReferrer._id,
          userId: newUser._id,
          firstName: newUser.firstName,
          middleName: newUser.middleName,
          lastName: newUser.lastName,
          email: newUser.email,
          mobileNumber: newReferrer.mobileNumber,
          country: newReferrer.country,
          state: newReferrer.state,
          city: newReferrer.city,
          qualification: newReferrer.qualification,
          currentRole: newReferrer.currentRole,
          stage: newReferrer.stage,
          referralSlug: newReferrer.referralSlug,
        },
      },
    });
  } catch (error: any) {
    console.error("Create referrer for super admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create referrer",
    });
  }
};

/**
 * Toggle referrer status (Super Admin)
 */
export const toggleReferrerStatusForSuperAdmin = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { referrerId } = req.params;

    const referrer = await Referrer.findById(referrerId);
    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: "Referrer not found",
      });
    }

    const user = await User.findById(referrer.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // If the referrer is in Closed stage — just reactivate and reset stage to New
    // (do NOT run the verification flow, do NOT change isVerified)
    if (referrer.stage === REFERRER_STAGE.CLOSED) {
      user.isActive = true;
      await Referrer.findByIdAndUpdate(referrer._id, { $set: { stage: REFERRER_STAGE.NEW } }, { runValidators: false });
      referrer.stage = REFERRER_STAGE.NEW;
    } else if (!user.isVerified) {
      // First-time activation: verify, activate, set stage to Converted
      user.isVerified = true;
      user.isActive = true;
      await Referrer.findByIdAndUpdate(referrer._id, { $set: { stage: REFERRER_STAGE.CONVERTED } }, { runValidators: false });
      referrer.stage = REFERRER_STAGE.CONVERTED;

      // Send activation email
      const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ');
      const referralLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/referral/${referrer.referralSlug}`;
      try {
        await sendEmail({
          to: referrer.email,
          subject: 'Your Kareer Studio Referrer Account is Now Active!',
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937">
              <div style="background:#7c3aed;padding:24px;border-radius:12px 12px 0 0;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:24px">Account Activated!</h1>
              </div>
              <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb">
                <p style="font-size:16px;margin-top:0">Hi <strong>${fullName}</strong>,</p>
                <p style="font-size:15px;color:#374151">Congratulations! Your referrer account on the <strong>Kareer Studio</strong> platform has been verified and activated.</p>
                <p style="font-size:15px;color:#374151">Use the referral link below to generate leads and connect people with our services.</p>
                <div style="background:#ede9fe;border:1px solid #ddd6fe;border-radius:8px;padding:16px;margin:24px 0">
                  <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#6d28d9;text-transform:uppercase">Your Referral Link</p>
                  <a href="${referralLink}" style="color:#7c3aed;word-break:break-all;font-size:14px">${referralLink}</a>
                </div>
                <a href="${referralLink}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Open Referral Link</a>
                <p style="font-size:13px;color:#6b7280;margin-top:32px">If you have any questions, please reach out to your coordinator.</p>
                <p style="font-size:13px;color:#6b7280;margin:0">– The Kareer Studio Team</p>
              </div>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('Failed to send referrer activation email:', emailErr);
      }

      // Send WhatsApp notification
      if (referrer.mobileNumber) {
        try {
          await sendWhatsAppGeneralNotification(
            referrer.mobileNumber,
            fullName,
            'Your Kareer Studio referrer account is now active!',
            `Use your referral link to create leads: ${referralLink}`
          );
        } catch (waErr) {
          console.error('Failed to send referrer activation WhatsApp:', waErr);
        }
      }
    } else {
      // Already verified: just toggle active state
      user.isActive = !user.isActive;
    }
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Referrer ${user.isActive ? "activated" : "deactivated"} successfully`,
      data: { isActive: user.isActive, isVerified: user.isVerified },
    });
  } catch (error: any) {
    console.error("Toggle referrer status for super admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle referrer status",
    });
  }
};

// ============= PUBLIC ENDPOINTS (referral form) =============

/**
 * PUBLIC: Get referrer + admin info for referral form
 */
export const getReferralInfo = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { referralSlug } = req.params;

    const referrer = await Referrer.findOne({ referralSlug: referralSlug.toLowerCase() })
      .populate("userId", "firstName middleName lastName isActive");

    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: "Invalid referral link",
      });
    }

    const referrerUser = referrer.userId as any;
    if (!referrerUser?.isActive) {
      return res.status(410).json({
        success: false,
        message: "This referral link is no longer active",
      });
    }

    // Get admin info via referrer.adminId
    const admin = await Admin.findOne({ userId: referrer.adminId })
      .populate("userId", "firstName middleName lastName");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Associated admin not found",
      });
    }

    const adminUser = admin.userId as any;

    return res.json({
      success: true,
      data: {
        referrerName: [referrerUser?.firstName, referrerUser?.middleName, referrerUser?.lastName].filter(Boolean).join(" "),
        adminName: [adminUser?.firstName, adminUser?.middleName, adminUser?.lastName].filter(Boolean).join(" ") || "Kareer Studio",
        companyName: admin.companyName || "Kareer Studio",
        companyLogo: admin.companyLogo || null,
        services: Object.values(SERVICE_TYPE),
      },
    });
  } catch (error: any) {
    console.error("Get referral info error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load referral form",
    });
  }
};

/**
 * PUBLIC: Submit referral enquiry form
 */
export const submitReferralEnquiry = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { referralSlug } = req.params;
    const { name, email, mobileNumber, city, serviceTypes, intake, year, parentDetail } = req.body;

    if (!name || !email || !mobileNumber || !city || !serviceTypes || !Array.isArray(serviceTypes) || serviceTypes.length === 0) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: name, email, mobileNumber, city, serviceTypes (at least one)",
      });
    }

    for (const service of serviceTypes) {
      if (!Object.values(SERVICE_TYPE).includes(service as SERVICE_TYPE)) {
        return res.status(400).json({
          success: false,
          message: `Invalid service type: ${service}`,
        });
      }
    }

    const referrer = await Referrer.findOne({ referralSlug: referralSlug.toLowerCase() })
      .populate("userId", "isActive firstName middleName lastName");
    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: "Invalid referral link",
      });
    }

    const referrerUser = referrer.userId as any;
    if (!referrerUser?.isActive) {
      return res.status(410).json({
        success: false,
        message: "This referral link is no longer active",
      });
    }

    // Duplicate check — same email + same admin within 24 hours
    const existingLead = await Lead.findOne({
      email: email.toLowerCase(),
      adminId: referrer.adminId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (existingLead) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted an enquiry recently. Please wait 24 hours before submitting again.",
      });
    }

    const newLead = new Lead({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      mobileNumber: mobileNumber.trim(),
      city: city.trim(),
      serviceTypes,
      ...(intake && { intake: intake.trim() }),
      ...(year && { year: year.trim() }),
      ...(parentDetail && parentDetail.firstName && {
        parentDetail: {
          firstName: parentDetail.firstName?.trim(),
          middleName: parentDetail.middleName?.trim() || "",
          lastName: parentDetail.lastName?.trim(),
          relationship: parentDetail.relationship?.trim(),
          mobileNumber: parentDetail.mobileNumber?.trim(),
          email: parentDetail.email?.trim().toLowerCase(),
          qualification: parentDetail.qualification?.trim(),
          occupation: parentDetail.occupation?.trim(),
        },
      }),
      adminId: referrer.adminId,
      referrerId: referrer._id,
      stage: LEAD_STAGE.NEW,
      source: "Referral",
    });

    await newLead.save();

    // WhatsApp welcome notification to lead — always send, regardless of admin lookup
    // Fetch companyName for the message, but don't let admin DB errors block this
    let companyNameForWA = 'us';
    try {
      const adminDocForWA = await Admin.findOne({ userId: referrer.adminId }).select('companyName mobileNumber email');
      companyNameForWA = adminDocForWA?.companyName || 'us';

      if (adminDocForWA) {
        const adminUser = await User.findById(referrer.adminId).select('firstName middleName lastName');
        const adminName = adminUser
          ? [adminUser.firstName, adminUser.middleName, adminUser.lastName].filter(Boolean).join(' ')
          : 'Admin';
        const serviceTypesList = (serviceTypes as string[]).join('; ');

        // WhatsApp to admin (only if mobile number is set)
        if (adminDocForWA.mobileNumber) {
          sendWhatsAppGeneralNotification(
            adminDocForWA.mobileNumber,
            adminName,
            `New referral enquiry received from ${name.trim()}.`,
            `Services: ${serviceTypesList} | City: ${city.trim()}`
          ).catch((err) => console.error('Failed to send WhatsApp referral notification to admin:', err));
        }

        // Email to admin (always, if email is present)
        if (adminDocForWA.email) {
          sendEmail({
            to: adminDocForWA.email,
            subject: `New Referral Enquiry from ${name.trim()}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1e3a5f;">New Referral Enquiry Received</h2>
                <p>Hi ${adminName},</p>
                <p>A new enquiry has been submitted through your referrer <strong>${[referrerUser.firstName, referrerUser.middleName, referrerUser.lastName].filter(Boolean).join(' ') || 'a referrer'}</strong>'s link.</p>
                <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
                  <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">Name</td><td style="padding: 8px; border: 1px solid #e0e0e0;">${name.trim()}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">Email</td><td style="padding: 8px; border: 1px solid #e0e0e0;">${email.toLowerCase().trim()}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">Mobile</td><td style="padding: 8px; border: 1px solid #e0e0e0;">${mobileNumber.trim()}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">City</td><td style="padding: 8px; border: 1px solid #e0e0e0;">${city.trim()}</td></tr>
                  <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">Services</td><td style="padding: 8px; border: 1px solid #e0e0e0;">${serviceTypesList}</td></tr>
                </table>
                <p style="color: #666; font-size: 12px;">This is an automated notification.</p>
              </div>
            `,
          }).catch((err) => console.error('Failed to send email to admin for referral enquiry:', err));
        }
      }
    } catch (waErr) {
      console.error('Failed to look up admin for WhatsApp/email admin notification (non-fatal):', waErr);
    }

    // Notify the referrer person about new enquiry from their link
    const referrerFullName = [referrerUser.firstName, referrerUser.middleName, referrerUser.lastName].filter(Boolean).join(' ') || 'Referrer';
    const serviceTypesListForReferrer = (serviceTypes as string[]).join('; ');

    if (referrer.mobileNumber) {
      sendWhatsAppGeneralNotification(
        referrer.mobileNumber,
        referrerFullName,
        `A new enquiry was submitted through your referral link.`,
        `${name.trim()} from ${city.trim()} is interested in: ${serviceTypesListForReferrer}`
      ).catch((err) => console.error('Failed to send WhatsApp notification to referrer person:', err));
    }

    // Email to referrer (always)
    if (referrer.email) {
      sendEmail({
        to: referrer.email,
        subject: `New Enquiry via Your Referral Link`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1e3a5f;">New Enquiry Through Your Referral Link</h2>
            <p>Hi ${referrerFullName},</p>
            <p>Great news! Someone submitted an enquiry through your referral link.</p>
            <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
              <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">Name</td><td style="padding: 8px; border: 1px solid #e0e0e0;">${name.trim()}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">City</td><td style="padding: 8px; border: 1px solid #e0e0e0;">${city.trim()}</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">Interested in</td><td style="padding: 8px; border: 1px solid #e0e0e0;">${serviceTypesListForReferrer}</td></tr>
            </table>
            <p>Our team will follow up with them shortly.</p>
            <p style="color: #666; font-size: 12px;">This is an automated notification.</p>
          </div>
        `,
      }).catch((err) => console.error('Failed to send email to referrer for new enquiry:', err));
    }

    // Always send enquiry welcome WhatsApp to the lead (uses companyName if fetched, or 'us' as fallback)
    sendWhatsAppEnquiryWelcome(
      mobileNumber.trim(),
      name.trim(),
      `your request for referral with ${companyNameForWA}`,
      'For more details, reply with "*business*".'
    ).catch((err) => console.error('Failed to send WhatsApp enquiry welcome to referral lead:', err));

    return res.status(201).json({
      success: true,
      message: "Thank you for your enquiry! We will contact you soon.",
    });
  } catch (error: any) {
    console.error("Submit referral enquiry error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit enquiry. Please try again later.",
    });
  }
};

// ============= REFERRER AUTH ENDPOINTS =============

/**
 * REFERRER: Get dashboard stats
 */
export const getReferrerDashboardStats = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;

    const referrer = await Referrer.findOne({ userId });
    if (!referrer) {
      return res.status(404).json({ success: false, message: "Referrer profile not found" });
    }

    const totalLeads = await Lead.countDocuments({ referrerId: referrer._id });
    const convertedLeads = await Lead.countDocuments({
      referrerId: referrer._id,
      stage: LEAD_STAGE.CONVERTED,
    });
    const totalStudents = await Student.countDocuments({ referrerId: referrer._id });

    return res.json({
      success: true,
      data: {
        totalLeads,
        convertedLeads,
        totalStudents,
        referralSlug: referrer.referralSlug,
      },
    });
  } catch (error: any) {
    console.error("Get referrer dashboard stats error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch dashboard stats" });
  }
};

/**
 * REFERRER: Get referral link
 */
export const getReferralLink = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;

    const referrer = await Referrer.findOne({ userId });
    if (!referrer) {
      return res.status(404).json({ success: false, message: "Referrer profile not found" });
    }

    return res.json({
      success: true,
      data: { slug: referrer.referralSlug },
    });
  } catch (error: any) {
    console.error("Get referral link error:", error);
    return res.status(500).json({ success: false, message: "Failed to get referral link" });
  }
};

/**
 * REFERRER: Get leads referred by this referrer
 */
export const getReferrerLeads = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { stage, search } = req.query;

    const referrer = await Referrer.findOne({ userId });
    if (!referrer) {
      return res.status(404).json({ success: false, message: "Referrer profile not found" });
    }

    const filter: any = { referrerId: referrer._id };
    if (stage) filter.stage = stage;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobileNumber: { $regex: search, $options: "i" } },
      ];
    }

    const leads = await Lead.find(filter)
      .select("name email mobileNumber city serviceTypes stage source createdAt")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: { leads },
    });
  } catch (error: any) {
    console.error("Get referrer leads error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch leads" });
  }
};

/**
 * REFERRER: Get single lead detail
 */
export const getReferrerLeadDetail = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { leadId } = req.params;

    const referrer = await Referrer.findOne({ userId });
    if (!referrer) {
      return res.status(404).json({ success: false, message: "Referrer profile not found" });
    }

    const lead = await Lead.findOne({ _id: leadId, referrerId: referrer._id })
      .select("name email mobileNumber city serviceTypes stage source intake year parentDetail createdAt");

    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    return res.json({
      success: true,
      data: { lead },
    });
  } catch (error: any) {
    console.error("Get referrer lead detail error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch lead details" });
  }
};

/**
 * REFERRER: Get students converted from referrer's leads
 */
export const getReferrerStudents = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;

    const referrer = await Referrer.findOne({ userId });
    if (!referrer) {
      return res.status(404).json({ success: false, message: "Referrer profile not found" });
    }

    const students = await Student.find({ referrerId: referrer._id })
      .populate("userId", "firstName middleName lastName email profilePicture isActive")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: {
        students: students.map((s: any) => ({
          _id: s._id,
          userId: s.userId,
          email: s.email,
          mobileNumber: s.mobileNumber,
          conversionDate: s.conversionDate,
          createdAt: s.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error("Get referrer students error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch students" });
  }
};

/**
 * REFERRER: Get single student detail (read-only)
 */
export const getReferrerStudentDetail = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { studentId } = req.params;

    const referrer = await Referrer.findOne({ userId });
    if (!referrer) {
      return res.status(404).json({ success: false, message: "Referrer profile not found" });
    }

    const student = await Student.findOne({ _id: studentId, referrerId: referrer._id })
      .populate("userId", "firstName middleName lastName email profilePicture isVerified isActive createdAt")
      .populate({
        path: "adminId",
        select: "companyName mobileNumber",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .populate({
        path: "counselorId",
        select: "mobileNumber",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .populate({
        path: "advisorId",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .lean()
      .exec();

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found or not referred by you" });
    }

    const registrations = await StudentServiceRegistration.find({ studentId })
      .populate("serviceId", "name slug shortDescription")
      .populate({
        path: "primaryOpsId",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .populate({
        path: "secondaryOpsId",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .populate({
        path: "activeOpsId",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .populate({
        path: "registeredViaAdvisorId",
        select: "companyName userId",
        populate: { path: "userId", select: "firstName middleName lastName" },
      })
      .populate({
        path: "registeredViaAdminId",
        select: "companyName userId",
        populate: { path: "userId", select: "firstName middleName lastName" },
      })
      .lean()
      .exec();

    return res.json({
      success: true,
      data: { student, registrations },
    });
  } catch (error: any) {
    console.error("Get referrer student detail error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch student details" });
  }
};

/**
 * REFERRER: Get student by lead ID (for converted leads)
 */
export const getReferrerStudentByLeadId = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { leadId } = req.params;

    const referrer = await Referrer.findOne({ userId });
    if (!referrer) {
      return res.status(404).json({ success: false, message: "Referrer profile not found" });
    }

    // Verify the lead belongs to this referrer
    const lead = await Lead.findOne({ _id: leadId, referrerId: referrer._id });
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    const conversion = await LeadStudentConversion.findOne({
      leadId,
      status: "APPROVED",
    });

    if (!conversion || !conversion.createdStudentId) {
      return res.status(404).json({ success: false, message: "No converted student found for this lead" });
    }

    return res.json({
      success: true,
      data: {
        student: { _id: conversion.createdStudentId },
      },
    });
  } catch (error: any) {
    console.error("Get referrer student by lead error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch student" });
  }
};

/**
 * REFERRER: Get student form answers for a registration (read-only)
 */
export const getReferrerStudentFormAnswers = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { studentId, registrationId } = req.params;

    const referrer = await Referrer.findOne({ userId });
    if (!referrer) {
      return res.status(404).json({ success: false, message: "Referrer profile not found" });
    }

    // Verify this student belongs to this referrer
    const student = await Student.findOne({ _id: studentId, referrerId: referrer._id }).lean().exec();
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found or not referred by you" });
    }

    const registration = await StudentServiceRegistration.findById(registrationId)
      .populate("serviceId")
      .lean()
      .exec();

    if (!registration) {
      return res.status(404).json({ success: false, message: "Registration not found" });
    }

    const answers = await StudentFormAnswer.find({ studentId }).lean().exec();

    return res.json({
      success: true,
      message: "Form answers fetched successfully",
      data: {
        registration,
        answers,
      },
    });
  } catch (error: any) {
    console.error("Get referrer student form answers error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch form answers" });
  }
};

// ============= ADMIN/SA REFERRER DASHBOARD ENDPOINTS =============

/**
 * ADMIN: Get referrer dashboard (stats + leads)
 */
export const getReferrerDashboardForAdmin = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { referrerId } = req.params;
    const adminUserId = req.user?.userId;

    if (!adminUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const referrer = await Referrer.findOne({ _id: referrerId, adminId: adminUserId })
      .populate("userId", "firstName middleName lastName email profilePicture isActive isVerified createdAt");

    if (!referrer) {
      return res.status(404).json({ success: false, message: "Referrer not found or unauthorized" });
    }

    const leads = await Lead.find({ referrerId: referrer._id })
      .select("name email mobileNumber city serviceTypes stage source createdAt")
      .sort({ createdAt: -1 });

    const stageCounts: Record<string, number> = {};
    Object.values(LEAD_STAGE).forEach((s) => { stageCounts[s] = 0; });
    leads.forEach((l: any) => { stageCounts[l.stage] = (stageCounts[l.stage] || 0) + 1; });

    const totalStudents = await Student.countDocuments({ referrerId: referrer._id });

    return res.json({
      success: true,
      data: {
        referrer: {
          _id: referrer._id,
          userId: referrer.userId,
          email: referrer.email,
          mobileNumber: referrer.mobileNumber,
          country: referrer.country,
          state: referrer.state,
          city: referrer.city,
          qualification: referrer.qualification,
          currentRole: referrer.currentRole,
          stage: referrer.stage || REFERRER_STAGE.NEW,
          referralSlug: referrer.referralSlug,
          notes: referrer.notes || [],
          createdAt: referrer.createdAt,
        },
        leads,
        stageCounts,
        totalStudents,
      },
    });
  } catch (error: any) {
    console.error("Get referrer dashboard for admin error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch referrer dashboard" });
  }
};

/**
 * SUPER ADMIN: Get referrer dashboard (stats + leads)
 */
export const getReferrerDashboardForSuperAdmin = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { referrerId } = req.params;

    const referrer = await Referrer.findById(referrerId)
      .populate("userId", "firstName middleName lastName email profilePicture isActive isVerified createdAt")
      .populate("adminId", "firstName middleName lastName email");

    if (!referrer) {
      return res.status(404).json({ success: false, message: "Referrer not found" });
    }

    // Get admin company name
    const adminProfile = await Admin.findOne({ userId: (referrer.adminId as any)?._id }).select("companyName");

    const leads = await Lead.find({ referrerId: referrer._id })
      .select("name email mobileNumber city serviceTypes stage source createdAt")
      .sort({ createdAt: -1 });

    const stageCounts: Record<string, number> = {};
    Object.values(LEAD_STAGE).forEach((s) => { stageCounts[s] = 0; });
    leads.forEach((l: any) => { stageCounts[l.stage] = (stageCounts[l.stage] || 0) + 1; });

    const totalStudents = await Student.countDocuments({ referrerId: referrer._id });

    return res.json({
      success: true,
      data: {
        referrer: {
          _id: referrer._id,
          userId: referrer.userId,
          adminId: referrer.adminId,
          adminCompanyName: adminProfile?.companyName,
          email: referrer.email,
          mobileNumber: referrer.mobileNumber,
          country: referrer.country,
          state: referrer.state,
          city: referrer.city,
          qualification: referrer.qualification,
          currentRole: referrer.currentRole,
          stage: referrer.stage || REFERRER_STAGE.NEW,
          referralSlug: referrer.referralSlug,
          notes: referrer.notes || [],
          createdAt: referrer.createdAt,
        },
        leads,
        stageCounts,
        totalStudents,
      },
    });
  } catch (error: any) {
    console.error("Get referrer dashboard for super admin error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch referrer dashboard" });
  }
};

/**
 * ADMIN: Update referrer stage
 */
export const updateReferrerStage = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { referrerId } = req.params;
    const { stage } = req.body;
    const adminUserId = req.user?.userId;

    if (!adminUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!stage || !Object.values(REFERRER_STAGE).includes(stage as REFERRER_STAGE)) {
      return res.status(400).json({
        success: false,
        message: `Invalid stage. Must be one of: ${Object.values(REFERRER_STAGE).join(", ")}`,
      });
    }

    const referrer = await Referrer.findOne({ _id: referrerId, adminId: adminUserId });
    if (!referrer) {
      return res.status(404).json({ success: false, message: "Referrer not found or unauthorized" });
    }

    if (referrer.stage === REFERRER_STAGE.CONVERTED) {
      return res.status(400).json({ success: false, message: "Stage cannot be changed after referrer is Converted" });
    }

    referrer.stage = stage as REFERRER_STAGE;
    await Referrer.findByIdAndUpdate(referrer._id, { $set: { stage } }, { runValidators: false });

    // Auto-deactivate user when stage is set to Closed
    if (stage === REFERRER_STAGE.CLOSED) {
      const referrerUser = await User.findById(referrer.userId);
      if (referrerUser) {
        referrerUser.isActive = false;
        await referrerUser.save();
      }
    }

    return res.json({
      success: true,
      message: "Referrer stage updated successfully",
      data: { stage: referrer.stage },
    });
  } catch (error: any) {
    console.error("Update referrer stage error:", error);
    return res.status(500).json({ success: false, message: "Failed to update referrer stage" });
  }
};

/**
 * SUPER ADMIN: Update referrer stage
 */
export const updateReferrerStageForSuperAdmin = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { referrerId } = req.params;
    const { stage } = req.body;

    if (!stage || !Object.values(REFERRER_STAGE).includes(stage as REFERRER_STAGE)) {
      return res.status(400).json({
        success: false,
        message: `Invalid stage. Must be one of: ${Object.values(REFERRER_STAGE).join(", ")}`,
      });
    }

    const referrer = await Referrer.findById(referrerId);
    if (!referrer) {
      return res.status(404).json({ success: false, message: "Referrer not found" });
    }

    if (referrer.stage === REFERRER_STAGE.CONVERTED) {
      return res.status(400).json({ success: false, message: "Stage cannot be changed after referrer is Converted" });
    }

    referrer.stage = stage as REFERRER_STAGE;
    await Referrer.findByIdAndUpdate(referrer._id, { $set: { stage } }, { runValidators: false });

    // Auto-deactivate user when stage is set to Closed
    if (stage === REFERRER_STAGE.CLOSED) {
      const referrerUser = await User.findById(referrer.userId);
      if (referrerUser) {
        referrerUser.isActive = false;
        await referrerUser.save();
      }
    }

    return res.json({
      success: true,
      message: "Referrer stage updated successfully",
      data: { stage: referrer.stage },
    });
  } catch (error: any) {
    console.error("Update referrer stage for super admin error:", error);
    return res.status(500).json({ success: false, message: "Failed to update referrer stage" });
  }
};

/**
 * ADMIN: Update referrer profile (name is not editable)
 */
export const updateReferrerForAdmin = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { referrerId } = req.params;
    const adminUserId = req.user?.userId;
    const { updates, error } = buildReferrerProfileUpdates(req.body);

    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const referrer = await Referrer.findOne({ _id: referrerId, adminId: adminUserId });
    if (!referrer) {
      return res.status(404).json({ success: false, message: 'Referrer not found or unauthorized' });
    }

    if (updates.email && updates.email !== referrer.email) {
      const emailTaken = await Referrer.findOne({
        email: updates.email,
        _id: { $ne: referrer._id },
      });
      if (emailTaken) {
        return res.status(400).json({ success: false, message: 'Email is already in use by another referrer' });
      }
      const userEmailTaken = await User.findOne({
        email: updates.email,
        _id: { $ne: referrer.userId },
      });
      if (userEmailTaken) {
        return res.status(400).json({ success: false, message: 'Email is already in use' });
      }
    }

    const updated = await Referrer.findByIdAndUpdate(
      referrer._id,
      { $set: updates },
      { new: true, runValidators: false }
    ).populate('userId', 'firstName middleName lastName email profilePicture isActive isVerified');

    if (updates.email) {
      await User.findByIdAndUpdate(referrer.userId, { email: updates.email });
    }

    return res.json({
      success: true,
      message: 'Referrer updated successfully',
      data: { referrer: mapReferrerProfile(updated) },
    });
  } catch (error: any) {
    console.error('Update referrer (admin) error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update referrer' });
  }
};

/**
 * SUPER ADMIN: Update referrer profile (name is not editable)
 */
export const updateReferrerForSuperAdmin = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { referrerId } = req.params;
    const { updates, error } = buildReferrerProfileUpdates(req.body, { allowAdminId: true });

    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const referrer = await Referrer.findById(referrerId);
    if (!referrer) {
      return res.status(404).json({ success: false, message: 'Referrer not found' });
    }

    if (updates.adminId) {
      const adminUser = await User.findOne({ _id: updates.adminId, role: USER_ROLE.ADMIN });
      if (!adminUser) {
        return res.status(400).json({ success: false, message: 'Invalid admin selected' });
      }
    }

    if (updates.email && updates.email !== referrer.email) {
      const emailTaken = await Referrer.findOne({
        email: updates.email,
        _id: { $ne: referrer._id },
      });
      if (emailTaken) {
        return res.status(400).json({ success: false, message: 'Email is already in use by another referrer' });
      }
      const userEmailTaken = await User.findOne({
        email: updates.email,
        _id: { $ne: referrer.userId },
      });
      if (userEmailTaken) {
        return res.status(400).json({ success: false, message: 'Email is already in use' });
      }
    }

    const updated = await Referrer.findByIdAndUpdate(
      referrer._id,
      { $set: updates },
      { new: true, runValidators: false }
    )
      .populate('userId', 'firstName middleName lastName email profilePicture isActive isVerified')
      .populate('adminId', 'firstName middleName lastName email');

    if (updates.email) {
      await User.findByIdAndUpdate(referrer.userId, { email: updates.email });
    }

    return res.json({
      success: true,
      message: 'Referrer updated successfully',
      data: { referrer: mapReferrerProfile(updated) },
    });
  } catch (error: any) {
    console.error('Update referrer (super admin) error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update referrer' });
  }
};

// ============= PUBLIC REFERRER REGISTRATION =============

/**
 * ADMIN: Add a note to a referrer
 */
export const addReferrerNoteForAdmin = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { referrerId } = req.params;
    const { text, noteDate } = req.body;
    const adminUserId = req.user?.userId;

    if (!text?.trim()) {
      return res.status(400).json({ success: false, message: 'Note text is required' });
    }
    if (!noteDate) {
      return res.status(400).json({ success: false, message: 'Note date is required' });
    }

    const exists = await Referrer.findOne({ _id: referrerId, adminId: adminUserId }).select('_id');
    if (!exists) {
      return res.status(404).json({ success: false, message: 'Referrer not found or unauthorized' });
    }

    const createdByName = await getNoteCreatorName(adminUserId);
    const newNote = {
      text: text.trim(),
      noteDate: new Date(noteDate),
      createdByRole: 'ADMIN',
      createdByName,
      createdAt: new Date(),
    };

    const referrer = await Referrer.findByIdAndUpdate(
      referrerId,
      { $push: { notes: newNote } },
      { new: true, runValidators: false }
    );

    return res.json({
      success: true,
      message: 'Note added successfully',
      data: { notes: getReferrerNotes(referrer || {}) },
    });
  } catch (error: any) {
    console.error('Add referrer note (admin) error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add note' });
  }
};

/**
 * SUPER ADMIN: Add a note to a referrer
 */
export const addReferrerNoteForSuperAdmin = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { referrerId } = req.params;
    const { text, noteDate } = req.body;
    const superAdminUserId = req.user?.userId;

    if (!text?.trim()) {
      return res.status(400).json({ success: false, message: 'Note text is required' });
    }
    if (!noteDate) {
      return res.status(400).json({ success: false, message: 'Note date is required' });
    }

    const exists = await Referrer.findById(referrerId).select('_id');
    if (!exists) {
      return res.status(404).json({ success: false, message: 'Referrer not found' });
    }

    const createdByName = await getNoteCreatorName(superAdminUserId);
    const newNote = {
      text: text.trim(),
      noteDate: new Date(noteDate),
      createdByRole: 'SUPER_ADMIN',
      createdByName,
      createdAt: new Date(),
    };

    const referrer = await Referrer.findByIdAndUpdate(
      referrerId,
      { $push: { notes: newNote } },
      { new: true, runValidators: false }
    );

    return res.json({
      success: true,
      message: 'Note added successfully',
      data: { notes: getReferrerNotes(referrer || {}) },
    });
  } catch (error: any) {
    console.error('Add referrer note (super admin) error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add note' });
  }
};

/**
 * ADMIN: Update a note on a referrer
 */
export const updateReferrerNoteForAdmin = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { referrerId, noteId } = req.params;
    const { text, noteDate } = req.body;
    const adminUserId = req.user?.userId;

    if (!text?.trim()) {
      return res.status(400).json({ success: false, message: 'Note text is required' });
    }
    if (!noteDate) {
      return res.status(400).json({ success: false, message: 'Note date is required' });
    }

    const referrer = await Referrer.findOne({ _id: referrerId, adminId: adminUserId });
    if (!referrer) {
      return res.status(404).json({ success: false, message: 'Referrer not found or unauthorized' });
    }

    const note = getReferrerNotes(referrer).find((n: any) => n._id.toString() === noteId);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    if (note.createdByRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'You can only edit notes you created' });
    }

    await Referrer.updateOne(
      { _id: referrerId, 'notes._id': noteId },
      {
        $set: {
          'notes.$.text': text.trim(),
          'notes.$.noteDate': new Date(noteDate),
        },
      }
    );

    const updated = await Referrer.findById(referrerId);
    return res.json({
      success: true,
      message: 'Note updated successfully',
      data: { notes: getReferrerNotes(updated || {}) },
    });
  } catch (error: any) {
    console.error('Update referrer note (admin) error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update note' });
  }
};

/**
 * ADMIN: Delete a note from a referrer
 */
export const deleteReferrerNoteForAdmin = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { referrerId, noteId } = req.params;
    const adminUserId = req.user?.userId;

    const referrer = await Referrer.findOne({ _id: referrerId, adminId: adminUserId });
    if (!referrer) {
      return res.status(404).json({ success: false, message: 'Referrer not found or unauthorized' });
    }

    const note = getReferrerNotes(referrer).find((n: any) => n._id.toString() === noteId);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    if (note.createdByRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'You can only delete notes you created' });
    }

    await Referrer.updateOne(
      { _id: referrerId },
      { $pull: { notes: { _id: new mongoose.Types.ObjectId(noteId) } } }
    );

    const updated = await Referrer.findById(referrerId);
    return res.json({
      success: true,
      message: 'Note deleted successfully',
      data: { notes: getReferrerNotes(updated || {}) },
    });
  } catch (error: any) {
    console.error('Delete referrer note (admin) error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete note' });
  }
};

/**
 * SUPER ADMIN: Update a note on a referrer
 */
export const updateReferrerNoteForSuperAdmin = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { referrerId, noteId } = req.params;
    const { text, noteDate } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ success: false, message: 'Note text is required' });
    }
    if (!noteDate) {
      return res.status(400).json({ success: false, message: 'Note date is required' });
    }

    const referrer = await Referrer.findById(referrerId);
    if (!referrer) {
      return res.status(404).json({ success: false, message: 'Referrer not found' });
    }

    const note = getReferrerNotes(referrer).find((n: any) => n._id.toString() === noteId);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    if (note.createdByRole !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'You can only edit notes you created' });
    }

    await Referrer.updateOne(
      { _id: referrerId, 'notes._id': noteId },
      {
        $set: {
          'notes.$.text': text.trim(),
          'notes.$.noteDate': new Date(noteDate),
        },
      }
    );

    const updated = await Referrer.findById(referrerId);
    return res.json({
      success: true,
      message: 'Note updated successfully',
      data: { notes: getReferrerNotes(updated || {}) },
    });
  } catch (error: any) {
    console.error('Update referrer note (super admin) error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update note' });
  }
};

/**
 * SUPER ADMIN: Delete a note from a referrer
 */
export const deleteReferrerNoteForSuperAdmin = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { referrerId, noteId } = req.params;

    const referrer = await Referrer.findById(referrerId);
    if (!referrer) {
      return res.status(404).json({ success: false, message: 'Referrer not found' });
    }

    const note = getReferrerNotes(referrer).find((n: any) => n._id.toString() === noteId);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    if (note.createdByRole !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'You can only delete notes you created' });
    }

    await Referrer.updateOne(
      { _id: referrerId },
      { $pull: { notes: { _id: new mongoose.Types.ObjectId(noteId) } } }
    );

    const updated = await Referrer.findById(referrerId);
    return res.json({
      success: true,
      message: 'Note deleted successfully',
      data: { notes: getReferrerNotes(updated || {}) },
    });
  } catch (error: any) {
    console.error('Delete referrer note (super admin) error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete note' });
  }
};

/**
 * PUBLIC: Get admin info for referrer registration form
 */
export const getAdminInfoForReferrerRegistration = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { adminSlug } = req.params;

    const admin = await Admin.findOne({ enquiryFormSlug: adminSlug.toLowerCase() })
      .populate("userId", "firstName middleName lastName");

    if (!admin) {
      return res.status(404).json({ success: false, message: "Invalid registration link" });
    }

    const adminUser = admin.userId as any;

    return res.json({
      success: true,
      data: {
        adminName: [adminUser?.firstName, adminUser?.middleName, adminUser?.lastName].filter(Boolean).join(" ") || "Kareer Studio",
        companyName: admin.companyName || "Kareer Studio",
        companyLogo: admin.companyLogo || null,
      },
    });
  } catch (error: any) {
    console.error("Get admin info for referrer registration error:", error);
    return res.status(500).json({ success: false, message: "Failed to load registration form" });
  }
};

/**
 * PUBLIC: Register as a referrer (inactive + unverified until admin approves)
 */
export const registerAsReferrer = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { adminSlug } = req.params;
    const { firstName, middleName, lastName, email, mobileNumber, country, state, city, qualification, currentRole } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, and email are required",
      });
    }

    if (!mobileNumber || !mobileNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required",
      });
    }

    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,5}[-\s.]?[0-9]{1,5}$/;
    if (!phoneRegex.test(mobileNumber.trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number format",
      });
    }

    if (!country?.trim() || !state?.trim() || !city?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Country, state, and city are required",
      });
    }

    if (!qualification?.trim() || !currentRole?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Qualification and current role are required",
      });
    }

    const admin = await Admin.findOne({ enquiryFormSlug: adminSlug.toLowerCase() });
    if (!admin) {
      return res.status(404).json({ success: false, message: "Invalid registration link" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    // Create user as UNVERIFIED + INACTIVE
    const newUser = new User({
      firstName: firstName.trim(),
      middleName: middleName?.trim() || undefined,
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      role: USER_ROLE.REFERRER,
      isVerified: false,
      isActive: false,
      mobileNumber: mobileNumber?.trim() || undefined,
    });
    await newUser.save();

    const newReferrer = new Referrer({
      userId: newUser._id,
      adminId: admin.userId,
      email: email.toLowerCase().trim(),
      mobileNumber: mobileNumber?.trim() || undefined,
      country: country.trim(),
      state: state.trim(),
      city: city.trim(),
      qualification: qualification.trim(),
      currentRole: currentRole.trim(),
      stage: REFERRER_STAGE.NEW,
      referralSlug: "temp",
    });
    await newReferrer.save();

    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    const baseSlug = generateSlug(fullName);
    const referralSlug = `${baseSlug}-${newReferrer._id}`;
    newReferrer.referralSlug = referralSlug;
    await newReferrer.save();

    // Notify admin of new referrer registration
    try {
      const adminName = await User.findById(admin.userId).select('firstName middleName lastName');
      const adminDisplayName = adminName
        ? [adminName.firstName, adminName.middleName, adminName.lastName].filter(Boolean).join(' ')
        : 'Admin';
      const referrerName = [firstName, middleName, lastName].filter(Boolean).join(' ');

      if (admin.mobileNumber) {
        sendWhatsAppGeneral4LineNotification(
          admin.mobileNumber,
          adminDisplayName,
          `New referrer registration from ${referrerName}.`,
          `Email: ${email.toLowerCase().trim()} | Mobile: ${mobileNumber.trim()} | Status: Pending Approval`,
          `City: ${city.trim()} | State: ${state.trim()} | Country: ${country.trim()} | Qualification: ${qualification.trim()} | Current Role: ${currentRole.trim()}`
        ).catch((err) => console.error('Failed to send WhatsApp to admin for new referrer registration:', err));
      }

      if (admin.email) {
        sendEmail({
          to: admin.email,
          subject: `New Referrer Registration – ${referrerName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1e3a5f;">New Referrer Registration</h2>
              <p>Hi ${adminDisplayName},</p>
              <p>A new person has registered to become a  <strong>Referrer</strong> on your platform. Their account is currently <strong>pending your approval</strong>.</p>
              <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">Name</td><td style="padding: 8px; border: 1px solid #e0e0e0;">${referrerName}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">Email</td><td style="padding: 8px; border: 1px solid #e0e0e0;">${email.toLowerCase().trim()}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">Mobile</td><td style="padding: 8px; border: 1px solid #e0e0e0;">${mobileNumber.trim()}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">Country</td><td style="padding: 8px; border: 1px solid #e0e0e0;">${country.trim()}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">State</td><td style="padding: 8px; border: 1px solid #e0e0e0;">${state.trim()}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">City</td><td style="padding: 8px; border: 1px solid #e0e0e0;">${city.trim()}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">Qualification</td><td style="padding: 8px; border: 1px solid #e0e0e0;">${qualification.trim()}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">Current Role</td><td style="padding: 8px; border: 1px solid #e0e0e0;">${currentRole.trim()}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #e0e0e0; font-weight: bold; background: #f5f5f5;">Status</td><td style="padding: 8px; border: 1px solid #e0e0e0;">Pending Approval</td></tr>
              </table>
              <p>Please log in to your dashboard to review and approve this registration.</p>
              <p style="color: #666; font-size: 12px;">This is an automated notification.</p>
            </div>
          `,
        }).catch((err) => console.error('Failed to send email to admin for new referrer registration:', err));
      }
    } catch (notifyErr) {
      console.error('Failed to notify admin of new referrer registration (non-fatal):', notifyErr);
    }

    // Welcome notification to the new referrer
    try {
      const referrerName = [firstName, middleName, lastName].filter(Boolean).join(' ');
      if (mobileNumber?.trim()) {
        sendWhatsAppGeneralNotification(
          mobileNumber.trim(),
          referrerName,
          `Your *Referrer* registration has been submitted successfully.`,
          `Your account is pending for approval. You will be notified once it's approved`
        ).catch((err) => console.error('Failed to send WhatsApp welcome to new referrer:', err));
      }
      sendEmail({
        to: email.toLowerCase().trim(),
        subject: `Your Referrer Registration – Pending Approval`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1e3a5f;">Registration Submitted Successfully</h2>
            <p>Hi ${referrerName},</p>
            <p>Thank you for registering as a <strong>Referrer</strong>. Your application has been submitted and is currently <strong>pending for approval</strong> by the team.</p>
            <p>If you have any questions, please feel free to contact us.</p>
            ${(admin.email || admin.mobileNumber) ? `
            <p style="margin: 16px 0 4px 0;"><strong>Contact Us:</strong></p>
            <p style="margin: 0; line-height: 1.8;">
              ${admin.companyName ? `<strong>${admin.companyName}</strong><br/>` : ''}
              ${admin.email ? `${admin.email}<br/>` : ''}
              ${admin.mobileNumber ? `${admin.mobileNumber}` : ''}
            </p>
            ` : ''}
            Regards,<br/>
            Team - ${admin.companyName || 'Kareer Studio'}
            <p style="color: #666; font-size: 12px;">This is an automated notification.</p>
          </div>
        `,
      }).catch((err) => console.error('Failed to send welcome email to new referrer:', err));
    } catch (notifyErr) {
      console.error('Failed to send welcome notification to new referrer (non-fatal):', notifyErr);
    }

    return res.status(201).json({
      success: true,
      message: "Registration submitted successfully! Your account is pending approval.",
    });
  } catch (error: any) {
    console.error("Register as referrer error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit registration. Please try again later.",
    });
  }
};
