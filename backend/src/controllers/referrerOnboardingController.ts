import { Response } from "express";
import { AuthRequest } from "../types/auth";
import Referrer, { IReferrer } from "../models/Referrer";
import User, { IUser } from "../models/User";
import { USER_ROLE } from "../types/roles";

const PHONE_REGEX = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,5}[-\s.]?[0-9]{1,5}$/;

const validateOnboardingProfileFields = (
  data: Record<string, unknown>
): string | null => {
  if (data.emergencyContact !== undefined) {
    const emergencyContact = String(data.emergencyContact).trim();
    if (!emergencyContact) return "Emergency contact is required";
    if (!PHONE_REGEX.test(emergencyContact)) return "Invalid emergency contact format";
  }
  return null;
};

const getReferrerForUser = async (userId: string) => {
  return Referrer.findOne({ userId });
};

const getReferrerForAdmin = async (referrerId: string, adminUserId: string) => {
  return Referrer.findOne({ _id: referrerId, adminId: adminUserId });
};

const applyReferrerIdentityData = async (
  user: IUser,
  referrer: IReferrer,
  identityData: Record<string, unknown>,
  options?: { allowNameEdit?: boolean }
): Promise<string | null> => {
  if (options?.allowNameEdit) {
    if (identityData.firstName !== undefined) {
      const v = String(identityData.firstName).trim();
      if (!v) return "First name is required";
      user.firstName = v;
    }
    if (identityData.lastName !== undefined) {
      const v = String(identityData.lastName).trim();
      if (!v) return "Last name is required";
      user.lastName = v;
    }
  }

  if (identityData.middleName !== undefined) {
    user.middleName = String(identityData.middleName).trim() || undefined;
  }
  if (identityData.email !== undefined) {
    const v = String(identityData.email).trim().toLowerCase();
    if (!v) return "Email is required";
    if (v !== user.email) {
      const existingEmail = await User.findOne({ email: v, _id: { $ne: user._id } });
      if (existingEmail) {
        return "A user with this email already exists";
      }
      user.email = v;
      referrer.email = v;
    }
  }
  if (identityData.primaryMobile !== undefined) {
    const v = String(identityData.primaryMobile).trim();
    if (!v) return "Mobile number is required";
    if (!PHONE_REGEX.test(v)) {
      return "Invalid phone number format";
    }
    user.mobileNumber = v;
    referrer.mobileNumber = v;
  }
  if (identityData.country !== undefined) {
    const v = String(identityData.country).trim();
    if (!v) return "Country is required";
    referrer.country = v;
  }
  if (identityData.state !== undefined) {
    const v = String(identityData.state).trim();
    if (!v) return "State is required";
    referrer.state = v;
  }
  if (identityData.city !== undefined) {
    const v = String(identityData.city).trim();
    if (!v) return "City is required";
    referrer.city = v;
  }
  if (identityData.qualification !== undefined) {
    const v = String(identityData.qualification).trim();
    if (!v) return "Qualification is required";
    referrer.qualification = v;
  }
  if (identityData.currentRole !== undefined) {
    const v = String(identityData.currentRole).trim();
    if (!v) return "Current role is required";
    referrer.currentRole = v;
  }

  return null;
};

/**
 * GET /referrer-onboarding/profile — Referrer own profile
 */
export const getReferrerOnboardingProfile = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const referrer = await getReferrerForUser(userId);
    if (!referrer) {
      return res.status(404).json({ success: false, message: "Referrer profile not found" });
    }

    const user = await User.findById(userId).select("firstName middleName lastName email mobileNumber isActive isVerified");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        profile: referrer,
        user,
      },
    });
  } catch (error) {
    console.error("Error fetching referrer onboarding profile:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch profile" });
  }
};

/**
 * PUT /referrer-onboarding/profile — Referrer updates section data
 */
export const updateReferrerOnboardingProfile = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { onboardingProfileData, identityData } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const referrer = await getReferrerForUser(userId);
    if (!referrer) {
      return res.status(404).json({ success: false, message: "Referrer profile not found" });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Account is not activated yet" });
    }

    if (user.isVerified) {
      if (!onboardingProfileData || typeof onboardingProfileData !== "object") {
        return res.status(400).json({ success: false, message: "onboardingProfileData is required" });
      }
      const profileError = validateOnboardingProfileFields(onboardingProfileData);
      if (profileError) {
        return res.status(400).json({ success: false, message: profileError });
      }
      const existing = referrer.onboardingProfileData || {};
      const updates: Record<string, string> = {};
      for (const [key, value] of Object.entries(onboardingProfileData)) {
        const existingVal = existing[key];
        const isExistingEmpty =
          existingVal === undefined ||
          existingVal === null ||
          (typeof existingVal === "string" && !existingVal.trim());
        if (!isExistingEmpty) {
          return res.status(400).json({
            success: false,
            message: `Field "${key}" is already filled and cannot be changed`,
          });
        }
        if (value !== undefined && String(value).trim()) {
          updates[key] = String(value).trim();
        }
      }
      referrer.onboardingProfileData = { ...existing, ...updates };
    } else {
      if (identityData && typeof identityData === "object") {
        const identityError = await applyReferrerIdentityData(user, referrer, identityData);
        if (identityError) {
          return res.status(400).json({ success: false, message: identityError });
        }
        await user.save();
      }

      if (onboardingProfileData !== undefined && typeof onboardingProfileData === "object") {
        const profileError = validateOnboardingProfileFields(onboardingProfileData);
        if (profileError) {
          return res.status(400).json({ success: false, message: profileError });
        }
        referrer.onboardingProfileData = {
          ...(referrer.onboardingProfileData || {}),
          ...onboardingProfileData,
        };
      }
    }

    referrer.markModified("onboardingProfileData");
    await referrer.save();

    return res.status(200).json({
      success: true,
      message: user.isVerified ? "Profile fields updated" : "Onboarding profile updated",
      data: { profile: referrer, user },
    });
  } catch (error) {
    console.error("Error updating referrer onboarding profile:", error);
    return res.status(500).json({ success: false, message: "Failed to update profile" });
  }
};

/**
 * PUT /referrer-onboarding/admin/:referrerId/profile — Admin updates referrer onboarding on behalf
 */
export const updateReferrerOnboardingProfileForAdmin = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const adminUserId = req.user?.userId;
    const { referrerId } = req.params;
    const { onboardingProfileData, identityData } = req.body;

    if (!adminUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const referrer = await getReferrerForAdmin(referrerId, adminUserId);
    if (!referrer) {
      return res.status(404).json({ success: false, message: "Referrer not found or unauthorized" });
    }

    const user = await User.findById(referrer.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (identityData && typeof identityData === "object") {
      const identityError = await applyReferrerIdentityData(user, referrer, identityData, {
        allowNameEdit: true,
      });
      if (identityError) {
        return res.status(400).json({ success: false, message: identityError });
      }
      await user.save();
    }

    if (onboardingProfileData !== undefined && typeof onboardingProfileData === "object") {
      const profileError = validateOnboardingProfileFields(onboardingProfileData);
      if (profileError) {
        return res.status(400).json({ success: false, message: profileError });
      }
      referrer.onboardingProfileData = {
        ...(referrer.onboardingProfileData || {}),
        ...onboardingProfileData,
      };
    }

    referrer.markModified("onboardingProfileData");
    await referrer.save();

    const updatedUser = await User.findById(referrer.userId).select(
      "firstName middleName lastName email mobileNumber isActive isVerified profilePicture"
    );

    return res.status(200).json({
      success: true,
      message: "Referrer onboarding profile updated",
      data: { profile: referrer, user: updatedUser },
    });
  } catch (error) {
    console.error("Error updating referrer onboarding profile for admin:", error);
    return res.status(500).json({ success: false, message: "Failed to update profile" });
  }
};

/**
 * GET /referrer-onboarding/:referrerId/profile — Admin views referrer onboarding
 */
export const getReferrerOnboardingProfileForAdmin = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const adminUserId = req.user?.userId;
    const { referrerId } = req.params;

    if (!adminUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const referrer = await getReferrerForAdmin(referrerId, adminUserId);
    if (!referrer) {
      return res.status(404).json({ success: false, message: "Referrer not found or unauthorized" });
    }

    const user = await User.findById(referrer.userId).select(
      "firstName middleName lastName email mobileNumber isActive isVerified profilePicture"
    );

    return res.status(200).json({
      success: true,
      data: { profile: referrer, user },
    });
  } catch (error) {
    console.error("Error fetching referrer profile for admin:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch profile" });
  }
};

/**
 * GET /referrer-onboarding/super-admin/:referrerId/profile — Super admin view only
 */
export const getReferrerOnboardingProfileForSuperAdmin = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { referrerId } = req.params;
    const referrer = await Referrer.findById(referrerId).populate(
      "adminId",
      "firstName middleName lastName email"
    );
    if (!referrer) {
      return res.status(404).json({ success: false, message: "Referrer not found" });
    }

    const user = await User.findById(referrer.userId).select(
      "firstName middleName lastName email mobileNumber isActive isVerified profilePicture"
    );

    return res.status(200).json({
      success: true,
      data: { profile: referrer, user },
    });
  } catch (error) {
    console.error("Error fetching referrer profile for super admin:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch profile" });
  }
};
