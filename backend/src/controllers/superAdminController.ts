import { Request, Response } from "express";
import User from "../models/User";
import { USER_ROLE } from "../types/roles";
import Ops from "../models/Ops";
import Admin from "../models/Admin";
import Counselor from "../models/Counselor";
// import { sendEmail } from "../utils/email";

/**
 * Get all users with optional filters
 */
export const getAllUsers = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { role, isVerified, isActive, search } = req.query;

    // Build filter object
    const filter: any = {};

    if (role) {
      // Normalize role to uppercase to match enum values
      // Handle query param which can be string, array, or ParsedQs
      let roleStr: string;
      if (Array.isArray(role)) {
        roleStr = String(role[0]);
      } else if (typeof role === 'string') {
        roleStr = role;
      } else {
        roleStr = String(role);
      }
      const normalizedRole = roleStr.toUpperCase().replace(/\s+/g, '_');
      filter.role = normalizedRole;
    }

    if (isVerified !== undefined) {
      filter.isVerified = isVerified === "true";
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .select("-password -emailVerificationToken -passwordResetToken")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: {
        users,
        count: users.length,
      },
    });
  } catch (error) {
    console.error("Get all users error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching users",
    });
  }
};

/**
 * Get user statistics
 */
export const getUserStats = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const activeUsers = await User.countDocuments({ isActive: true });
    const pendingApproval = await User.countDocuments({
      isVerified: false,
      role: { $nin: [USER_ROLE.SUPER_ADMIN, USER_ROLE.STUDENT] }, // Unverified users except admins and students
    });

    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
    ]);

    const roleStats = usersByRole.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    return res.json({
      success: true,
      data: {
        total: totalUsers,
        verified: verifiedUsers,
        active: activeUsers,
        pendingApproval,
        byRole: roleStats,
      },
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching user statistics",
    });
  }
};

/**
 * Approve user (for OPS, alumni, service provider)
 */
export const approveUser = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent approving admin users
    if (user.role === USER_ROLE.SUPER_ADMIN) {
      return res.status(400).json({
        success: false,
        message: "Cannot approve admin users",
      });
    }

    // Students don't need admin approval (they're auto-approved after email verification)
    if (user.role === USER_ROLE.STUDENT) {
      return res.status(400).json({
        success: false,
        message: "Students are automatically approved after email verification",
      });
    }

    // Check if user is already verified/approved
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "User is already approved",
      });
    }

    // Approve user: set isVerified and isActive to true (automatic activation)
    user.isVerified = true;
    user.isActive = true;
    await user.save();

    // Send approval email
    // try {
    //   await sendEmail({
    //     to: user.email,
    //     subject: "Account Approved - Community Platform",
    //     html: `
    //       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    //         <h2 style="color: #2563eb;">Account Approved! 🎉</h2>
    //         <p>Hello ${user.name},</p>
    //         <p>Great news! Your account has been approved by our admin team.</p>
    //         <p>You can now access all features of the Community Platform.</p>
    //         <p><strong>Role:</strong> ${user.role}</p>
    //         <div style="margin: 30px 0;">
    //           <a href="${process.env.FRONTEND_URL}/login" 
    //              style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
    //             Login to Your Account
    //           </a>
    //         </div>
    //         <p>If you have any questions, feel free to contact our support team.</p>
    //         <p>Best regards,<br>Community Platform Team</p>
    //       </div>
    //     `,
    //   });
    // } catch (emailError) {
    //   console.error("Error sending approval email:", emailError);
    //   // Continue even if email fails
    // }

    return res.json({
      success: true,
      message: "User approved successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          isActive: user.isActive,
        },
      },
    });
  } catch (error) {
    console.error("Approve user error:", error);
    return res.status(500).json({
      success: false,
      message: "Error approving user",
    });
  }
};

/**
 * Reject user approval
 */
export const rejectUser = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { userId } = req.params;
    // const { reason } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Send rejection email
    // try {
    //   await sendEmail({
    //     to: user.email,
    //     subject: "Account Application Update - Community Platform",
    //     html: `
    //       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    //         <h2 style="color: #dc2626;">Account Application Update</h2>
    //         <p>Hello ${user.name},</p>
    //         <p>Thank you for your interest in joining the Community Platform as a ${user.role}.</p>
    //         <p>After careful review, we are unable to approve your application at this time.</p>
    //         ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
    //         <p>If you believe this is an error or would like to reapply, please contact our support team.</p>
    //         <p>Best regards,<br>Community Platform Team</p>
    //       </div>
    //     `,
    //   });
    // } catch (emailError) {
    //   console.error("Error sending rejection email:", emailError);
    // }

    // Delete the user
    await User.findByIdAndDelete(userId);

    return res.json({
      success: true,
      message: "User rejected and removed successfully",
    });
  } catch (error) {
    console.error("Reject user error:", error);
    return res.status(500).json({
      success: false,
      message: "Error rejecting user",
    });
  }
};

/**
 * Toggle user active status
 */
export const toggleUserStatus = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent deactivating admin users
    if (user.role === USER_ROLE.SUPER_ADMIN) {
      return res.status(400).json({
        success: false,
        message: "Cannot deactivate admin users",
      });
    }

    // Toggle status
    user.isActive = !user.isActive;
    await user.save();

    // // Send notification email
    // try {
    //   await sendEmail({
    //     to: user.email,
    //     subject: `Account ${user.isActive ? "Activated" : "Deactivated"} - Community Platform`,
    //     html: `
    //       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    //         <h2 style="color: ${user.isActive ? "#16a34a" : "#dc2626"};">
    //           Account ${user.isActive ? "Activated" : "Deactivated"}
    //         </h2>
    //         <p>Hello ${user.name},</p>
    //         <p>Your account has been ${user.isActive ? "activated" : "deactivated"} by an administrator.</p>
    //         ${
    //           user.isActive
    //             ? '<p>You can now log in and access all platform features.</p>'
    //             : '<p>Your access has been temporarily suspended. Please contact support if you have questions.</p>'
    //         }
    //         <p>Best regards,<br>Community Platform Team</p>
    //       </div>
    //     `,
    //   });
    // } catch (emailError) {
    //   console.error("Error sending status notification email:", emailError);
    // }

    return res.json({
      success: true,
      message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isActive: user.isActive,
        },
      },
    });
  } catch (error) {
    console.error("Toggle user status error:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating user status",
    });
  }
};

/**
 * Delete user
 */
export const deleteUser = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent deleting admin users
    if (user.role === USER_ROLE.SUPER_ADMIN) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete admin users",
      });
    }

    await User.findByIdAndDelete(userId);

    return res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting user",
    });
  }
};

/**
 * Get pending approvals
 */
export const getPendingApprovals = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const pendingUsers = await User.find({
      isVerified: false,
      role: { $nin: [USER_ROLE.SUPER_ADMIN, USER_ROLE.STUDENT] }, // Unverified users except admins and students
    })
      .select("-password -emailVerificationToken -passwordResetToken")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: {
        users: pendingUsers,
        count: pendingUsers.length,
      },
    });
  } catch (error) {
    console.error("Get pending approvals error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching pending approvals",
    });
  }
};

/**
 * Create a new ops (admin only)
 */
export const createOps = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { name, email, phoneNumber } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Create ops user
    const opsUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: USER_ROLE.OPS,
      isVerified: true, // Auto-verify ops created by admin
      isActive: true,
    });

    // Create ops record
    const OpsModel = (await import("../models/Ops")).default;
    const ops = await OpsModel.create({
      userId: opsUser._id,
      email: email.toLowerCase().trim(),
      mobileNumber: phoneNumber?.trim() || undefined,
    });

    return res.status(201).json({
      success: true,
      message: "Ops created successfully",
      data: {
        ops: {
          id: opsUser._id,
          name: opsUser.name,
          email: ops.email,
          mobileNumber: ops.mobileNumber,
          role: opsUser.role,
          isVerified: opsUser.isVerified,
          isActive: opsUser.isActive,
        },
      },
    });
  } catch (error: any) {
    console.error("Create ops error:", error);
    
    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Error creating ops",
      error: error.message,
    });
  }
};

/**
 * Get all ops
 */
export const getAllOps = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const ops = await Ops.find()
      .populate('userId', 'name email isActive')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Ops fetched successfully',
      data: {
        ops: ops.map((c: any) => ({
          _id: c._id,
          userId: c.userId,
          email: c.email,
          mobileNumber: c.mobileNumber,
        })),
      },
    });
  } catch (error: any) {
    console.error('Get ops error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch ops',
      error: error.message,
    });
  }
};

/**
 * Create a new Admin
 */
export const createAdmin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { name, email, phoneNumber } = req.body;

    // Validation
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required',
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

    // Create user with ADMIN role (no password - will use OTP login)
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: USER_ROLE.ADMIN,
      isVerified: true, // Auto-verify admins created by super admin
      isActive: true,
    });

    await newUser.save();

    // Create Admin profile
    const newAdmin = new Admin({
      userId: newUser._id,
      email: email.toLowerCase().trim(),
      mobileNumber: phoneNumber?.trim() || undefined,
    });

    await newAdmin.save();

    // TODO: Send email with credentials
    // await sendEmail({
    //   to: email,
    //   subject: 'Admin Account Created',
    //   text: `Your admin account has been created. Email: ${email}, Password: ${defaultPassword}`,
    // });

    return res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: {
        admin: {
          _id: newAdmin._id,
          userId: newUser._id,
          name: newUser.name,
          email: newUser.email,
          mobileNumber: newAdmin.mobileNumber,
        },
      },
    });
  } catch (error: any) {
    console.error('Create admin error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create admin',
      error: error.message,
    });
  }
};

/**
 * Get all admins for dropdown selection
 */
export const getAdmins = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const admins = await User.find({ role: USER_ROLE.ADMIN, isActive: true })
      .select('_id name email')
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      data: {
        admins: admins.map((admin: any) => ({
          _id: admin._id,
          name: admin.name,
          email: admin.email,
        })),
      },
    });
  } catch (error: any) {
    console.error('Get admins error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch admins',
      error: error.message,
    });
  }
};

/**
 * Create a new User by Role (generic function for all roles)
 * This allows Super Admin to create users with any role
 */
export const createUserByRole = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { name, email, phoneNumber, role, adminId } = req.body;

    // Validation
    if (!name || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and role are required',
      });
    }

    // Validate role is allowed
    const allowedRoles = [
      USER_ROLE.ADMIN,
      USER_ROLE.OPS,
      USER_ROLE.EDUPLAN_COACH,
      USER_ROLE.IVY_EXPERT,
      USER_ROLE.COUNSELOR,
    ];

    if (!allowedRoles.includes(role as USER_ROLE)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role or role does not allow direct creation',
      });
    }

    // For COUNSELOR role, adminId is required
    if (role === USER_ROLE.COUNSELOR && !adminId) {
      return res.status(400).json({
        success: false,
        message: 'Admin selection is required for creating a Counselor',
      });
    }

    // Validate adminId if provided for COUNSELOR
    if (role === USER_ROLE.COUNSELOR && adminId) {
      const adminUser = await User.findOne({ _id: adminId, role: USER_ROLE.ADMIN });
      if (!adminUser) {
        return res.status(400).json({
          success: false,
          message: 'Invalid admin selected',
        });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Create user with specified role (no password - will use OTP login)
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: role,
      isVerified: true, // Auto-verify users created by super admin
      isActive: true,
    });

    await newUser.save();

    // If creating ADMIN role, also create Admin profile
    if (role === USER_ROLE.ADMIN) {
      const newAdmin = new Admin({
        userId: newUser._id,
        email: email.toLowerCase().trim(),
        mobileNumber: phoneNumber?.trim() || undefined,
      });
      await newAdmin.save();
    }

    // If creating OPS role, also create Ops profile
    if (role === USER_ROLE.OPS) {
      const newOps = new Ops({
        userId: newUser._id,
        email: email.toLowerCase().trim(),
        mobileNumber: phoneNumber?.trim() || undefined,
      });
      await newOps.save();
    }

    // If creating COUNSELOR role, also create Counselor profile with adminId
    if (role === USER_ROLE.COUNSELOR) {
      const newCounselor = new Counselor({
        userId: newUser._id,
        adminId: adminId,
        email: email.toLowerCase().trim(),
        mobileNumber: phoneNumber?.trim() || undefined,
      });
      await newCounselor.save();
    }

    return res.status(201).json({
      success: true,
      message: `${role.replace(/_/g, ' ')} created successfully. They can log in using OTP.`,
      data: {
        user: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
      },
    });
  } catch (error: any) {
    console.error('Create user by role error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message,
    });
  }
};



