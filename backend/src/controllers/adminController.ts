import { Response } from "express";
import User from "../models/User";
import { USER_ROLE } from "../types/roles";
import Counselor from "../models/Counselor";
import { AuthRequest } from "../types/auth";

/**
 * Create a new Counselor (Admin only)
 */
export const createCounselor = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { name, email, mobileNumber } = req.body;
    const adminUserId = req.user?.userId; // Admin's user ID from auth middleware

    // Validation
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required',
      });
    }

    if (!adminUserId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Create user with COUNSELOR role (no password - will use OTP login)
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: USER_ROLE.COUNSELOR,
      isVerified: true, // Auto-verify counselors created by admin
      isActive: true,
    });

    await newUser.save();

    // Create Counselor profile linked to the admin
    const newCounselor = new Counselor({
      userId: newUser._id,
      adminId: adminUserId, // Link to the admin who created this counselor
      email: email.toLowerCase().trim(),
      mobileNumber: mobileNumber?.trim() || undefined,
    });

    await newCounselor.save();

    // TODO: Send email with credentials

    return res.status(201).json({
      success: true,
      message: 'Counselor created successfully',
      data: {
        counselor: {
          _id: newCounselor._id,
          userId: newUser._id,
          name: newUser.name,
          email: newUser.email,
          mobileNumber: newCounselor.mobileNumber,
        },
      },
    });
  } catch (error: any) {
    console.error('Create counselor error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create counselor',
      error: error.message,
    });
  }
};

/**
 * Get all counselors created by the logged-in admin
 */
export const getCounselors = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const adminUserId = req.user?.userId;

    if (!adminUserId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Find counselors created by this admin
    const counselors = await Counselor.find({ adminId: adminUserId })
      .populate('userId', 'name email isActive isVerified')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Counselors fetched successfully',
      data: {
        counselors: counselors.map((c: any) => ({
          _id: c._id,
          userId: c.userId,
          email: c.email,
          mobileNumber: c.mobileNumber,
          createdAt: c.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error('Get counselors error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch counselors',
      error: error.message,
    });
  }
};

/**
 * Toggle counselor active status (Admin only)
 */
export const toggleCounselorStatus = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { counselorId } = req.params;
    const adminUserId = req.user?.userId;

    if (!adminUserId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Find counselor and verify it belongs to this admin
    const counselor = await Counselor.findOne({
      _id: counselorId,
      adminId: adminUserId,
    });

    if (!counselor) {
      return res.status(404).json({
        success: false,
        message: 'Counselor not found or unauthorized',
      });
    }

    // Toggle the isActive status in User model
    const user = await User.findById(counselor.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Counselor ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        isActive: user.isActive,
      },
    });
  } catch (error: any) {
    console.error('Toggle counselor status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle counselor status',
      error: error.message,
    });
  }
};


