import { Response } from "express";
import { AuthRequest } from "../types/auth";
import Lead, { LEAD_STAGE, SERVICE_TYPE } from "../models/Lead";
import Admin from "../models/Admin";
import Counselor from "../models/Counselor";
import User from "../models/User";
import { USER_ROLE } from "../types/roles";
import { Request } from "express";
import mongoose from "mongoose";

/**
 * Generate a unique slug from a name
 */
export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Remove consecutive hyphens
    .substring(0, 50); // Limit length
};

/**
 * Check if slug exists and return a unique version
 */
export const getUniqueSlug = async (baseSlug: string): Promise<string> => {
  let slug = baseSlug;
  let counter = 1;
  
  while (await Admin.findOne({ enquiryFormSlug: slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
};

/**
 * PUBLIC: Submit enquiry form (no auth required)
 */
export const submitEnquiry = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { adminSlug } = req.params;
    const { name, email, mobileNumber, serviceType } = req.body;

    // Validation
    if (!name || !email || !mobileNumber || !serviceType) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: name, email, mobileNumber, serviceType",
      });
    }

    // Validate service type
    if (!Object.values(SERVICE_TYPE).includes(serviceType as SERVICE_TYPE)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service type",
      });
    }

    // Find admin by slug
    const admin = await Admin.findOne({ enquiryFormSlug: adminSlug.toLowerCase() });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Invalid enquiry form link",
      });
    }

    // Check for duplicate lead (same email for same admin within last 24 hours)
    const existingLead = await Lead.findOne({
      email: email.toLowerCase(),
      adminId: admin.userId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (existingLead) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted an enquiry recently. Please wait 24 hours before submitting again.",
      });
    }

    // Create lead
    const newLead = new Lead({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      mobileNumber: mobileNumber.trim(),
      serviceType,
      adminId: admin.userId,
      stage: LEAD_STAGE.NEW,
      source: "Enquiry Form",
    });

    await newLead.save();

    return res.status(201).json({
      success: true,
      message: "Thank you for your enquiry! We will contact you soon.",
    });
  } catch (error: any) {
    console.error("Submit enquiry error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit enquiry. Please try again later.",
    });
  }
};

/**
 * PUBLIC: Get admin info for enquiry form
 */
export const getAdminInfoBySlug = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { adminSlug } = req.params;

    const admin = await Admin.findOne({ enquiryFormSlug: adminSlug.toLowerCase() })
      .populate("userId", "name");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Invalid enquiry form link",
      });
    }

    return res.json({
      success: true,
      data: {
        adminName: (admin.userId as any)?.name || "Kareer Studio",
        services: Object.values(SERVICE_TYPE),
      },
    });
  } catch (error: any) {
    console.error("Get admin info error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load form",
    });
  }
};

/**
 * ADMIN: Get all leads for this admin
 */
export const getAdminLeads = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const adminUserId = req.user?.userId;
    const { stage, serviceType, assigned, search } = req.query;

    // Build filter
    const filter: any = { adminId: adminUserId };

    if (stage) {
      filter.stage = stage;
    }

    if (serviceType) {
      filter.serviceType = serviceType;
    }

    if (assigned === "true") {
      filter.assignedCounselorId = { $ne: null };
    } else if (assigned === "false") {
      filter.assignedCounselorId = null;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobileNumber: { $regex: search, $options: "i" } },
      ];
    }

    const leads = await Lead.find(filter)
      .populate({
        path: "assignedCounselorId",
        populate: { path: "userId", select: "name email" }
      })
      .sort({ createdAt: -1 });

    // Get stats
    const allLeads = await Lead.find({ adminId: adminUserId });
    const stats = {
      total: allLeads.length,
      new: allLeads.filter((l) => l.stage === LEAD_STAGE.NEW).length,
      hot: allLeads.filter((l) => l.stage === LEAD_STAGE.HOT).length,
      warm: allLeads.filter((l) => l.stage === LEAD_STAGE.WARM).length,
      cold: allLeads.filter((l) => l.stage === LEAD_STAGE.COLD).length,
      converted: allLeads.filter((l) => l.stage === LEAD_STAGE.CONVERTED).length,
      closed: allLeads.filter((l) => l.stage === LEAD_STAGE.CLOSED).length,
      unassigned: allLeads.filter((l) => !l.assignedCounselorId).length,
    };

    return res.json({
      success: true,
      data: {
        leads,
        stats,
      },
    });
  } catch (error: any) {
    console.error("Get admin leads error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch leads",
    });
  }
};

/**
 * ADMIN: Get single lead detail
 */
export const getLeadDetail = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { leadId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    const lead = await Lead.findById(leadId)
      .populate({
        path: "assignedCounselorId",
        populate: { path: "userId", select: "name email" }
      })
      .populate("adminId", "name email");

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // Check access: Admin can access their own leads, Counselor can access assigned leads
    if (userRole === USER_ROLE.ADMIN) {
      if (lead.adminId._id.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    } else if (userRole === USER_ROLE.COUNSELOR) {
      // Find counselor document by userId
      const counselor = await Counselor.findOne({ userId: userId });
      if (!counselor || !lead.assignedCounselorId || lead.assignedCounselorId._id.toString() !== counselor._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    return res.json({
      success: true,
      data: { lead },
    });
  } catch (error: any) {
    console.error("Get lead detail error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch lead details",
    });
  }
};

/**
 * ADMIN: Assign lead to counselor
 */
export const assignLeadToCounselor = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { leadId } = req.params;
    const { counselorId } = req.body;
    const adminUserId = req.user?.userId;

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // Check lead belongs to this admin
    if (lead.adminId.toString() !== adminUserId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // If counselorId is null, unassign the lead
    if (!counselorId) {
      lead.assignedCounselorId = undefined;
      await lead.save();

      return res.json({
        success: true,
        message: "Lead unassigned successfully",
        data: { lead },
      });
    }

    // Verify counselor belongs to this admin
    const counselor = await Counselor.findOne({
      _id: new mongoose.Types.ObjectId(counselorId),
      adminId: new mongoose.Types.ObjectId(adminUserId),
    }).populate("userId", "name email");

    if (!counselor) {
      return res.status(400).json({
        success: false,
        message: "Invalid counselor or counselor does not belong to you",
      });
    }

    lead.assignedCounselorId = new mongoose.Types.ObjectId(counselorId);
    
    // No automatic status change on assignment

    await lead.save();

    return res.json({
      success: true,
      message: "Lead assigned successfully",
      data: { lead },
    });
  } catch (error: any) {
    console.error("Assign lead error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to assign lead",
    });
  }
};

/**
 * ADMIN/COUNSELOR: Update lead stage
 */
export const updateLeadStage = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { leadId } = req.params;
    const { stage } = req.body;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!Object.values(LEAD_STAGE).includes(stage as LEAD_STAGE)) {
      return res.status(400).json({
        success: false,
        message: "Invalid stage",
      });
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // Check access
    if (userRole === USER_ROLE.ADMIN) {
      if (lead.adminId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    } else if (userRole === USER_ROLE.COUNSELOR) {
      // Find counselor document by userId (same pattern as getLeadDetail)
      const counselor = await Counselor.findOne({ userId: userId });
      if (!counselor || !lead.assignedCounselorId || lead.assignedCounselorId.toString() !== counselor._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    lead.stage = stage as LEAD_STAGE;
    await lead.save();

    return res.json({
      success: true,
      message: "Lead stage updated",
      data: { lead },
    });
  } catch (error: any) {
    console.error("Update lead stage error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update lead stage",
    });
  }
};

/**
 * ADMIN/COUNSELOR: Add note to lead
 */
export const addLeadNote = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { leadId } = req.params;
    const { text } = req.body;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Note text is required",
      });
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // Check access
    if (userRole === USER_ROLE.ADMIN) {
      if (lead.adminId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    } else if (userRole === USER_ROLE.COUNSELOR) {
      // Find counselor document by userId (same pattern as getLeadDetail)
      const counselor = await Counselor.findOne({ userId: userId });
      if (!counselor || !lead.assignedCounselorId || lead.assignedCounselorId.toString() !== counselor._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    // Get user name
    const user = await User.findById(userId);
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }
    
    lead.notes.push({
      text: text.trim(),
      addedBy: new mongoose.Types.ObjectId(userId),
      addedByName: user?.name || "Unknown",
      createdAt: new Date(),
    });

    await lead.save();

    return res.json({
      success: true,
      message: "Note added successfully",
      data: { lead },
    });
  } catch (error: any) {
    console.error("Add lead note error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add note",
    });
  }
};

/**
 * ADMIN: Get counselors for assignment dropdown
 */
export const getAdminCounselors = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const adminUserId = req.user?.userId;

    const counselors = await Counselor.find({ adminId: adminUserId })
      .populate("userId", "name email isActive");

    const activeCounselors = counselors.filter(
      (c) => (c.userId as any)?.isActive
    );

    return res.json({
      success: true,
      data: {
        counselors: activeCounselors.map((c) => ({
          _id: c._id,
          name: (c.userId as any).name,
          email: (c.userId as any).email,
        })),
      },
    });
  } catch (error: any) {
    console.error("Get admin counselors error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch counselors",
    });
  }
};

/**
 * COUNSELOR: Get assigned leads
 */
export const getCounselorLeads = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const counselorUserId = req.user?.userId;
    const { stage, serviceType, search } = req.query;

    // Find counselor document
    const counselor = await Counselor.findOne({ userId: counselorUserId });
    if (!counselor) {
      return res.status(404).json({
        success: false,
        message: "Counselor profile not found",
      });
    }

    // Build filter
    const filter: any = { assignedCounselorId: counselor._id };

    if (stage) {
      filter.stage = stage;
    }

    if (serviceType) {
      filter.serviceType = serviceType;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobileNumber: { $regex: search, $options: "i" } },
      ];
    }

    const leads = await Lead.find(filter)
      .populate("adminId", "name email")
      .sort({ createdAt: -1 });

    // Get stats
    const allAssignedLeads = await Lead.find({ assignedCounselorId: counselor._id });
    const stats = {
      total: allAssignedLeads.length,
      new: allAssignedLeads.filter((l) => l.stage === LEAD_STAGE.NEW).length,
      hot: allAssignedLeads.filter((l) => l.stage === LEAD_STAGE.HOT).length,
      warm: allAssignedLeads.filter((l) => l.stage === LEAD_STAGE.WARM).length,
      cold: allAssignedLeads.filter((l) => l.stage === LEAD_STAGE.COLD).length,
      converted: allAssignedLeads.filter((l) => l.stage === LEAD_STAGE.CONVERTED).length,
      closed: allAssignedLeads.filter((l) => l.stage === LEAD_STAGE.CLOSED).length,
    };

    return res.json({
      success: true,
      data: {
        leads,
        stats,
      },
    });
  } catch (error: any) {
    console.error("Get counselor leads error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch leads",
    });
  }
};

/**
 * ADMIN: Get enquiry form URL
 */
export const getEnquiryFormUrl = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const adminUserId = req.user?.userId;

    const admin = await Admin.findOne({ userId: adminUserId });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin profile not found",
      });
    }

    return res.json({
      success: true,
      data: {
        slug: admin.enquiryFormSlug,
      },
    });
  } catch (error: any) {
    console.error("Get enquiry form URL error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get enquiry form URL",
    });
  }
};

/**
 * COUNSELOR: Get enquiry form URL (their admin's URL)
 */
export const getCounselorEnquiryFormUrl = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const counselorUserId = req.user?.userId;

    // Find counselor profile to get their adminId
    const counselor = await Counselor.findOne({ userId: counselorUserId });
    if (!counselor) {
      return res.status(404).json({
        success: false,
        message: "Counselor profile not found",
      });
    }

    // Find the admin's profile using the adminId from counselor
    const admin = await Admin.findOne({ userId: counselor.adminId });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin profile not found",
      });
    }

    return res.json({
      success: true,
      data: {
        slug: admin.enquiryFormSlug,
      },
    });
  } catch (error: any) {
    console.error("Get counselor enquiry form URL error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get enquiry form URL",
    });
  }
};

/**
 * SUPER_ADMIN: Get all leads (for analytics)
 */
export const getAllLeads = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { adminId, stage, serviceType } = req.query;

    const filter: any = {};

    if (adminId) {
      filter.adminId = adminId;
    }

    if (stage) {
      filter.stage = stage;
    }

    if (serviceType) {
      filter.serviceType = serviceType;
    }

    const leads = await Lead.find(filter)
      .populate("adminId", "name email")
      .populate("assignedCounselorId", "name email")
      .sort({ createdAt: -1 });

    // Get overall stats
    const totalLeads = await Lead.countDocuments();
    const leadsByStage = await Lead.aggregate([
      { $group: { _id: "$stage", count: { $sum: 1 } } },
    ]);
    const leadsByService = await Lead.aggregate([
      { $group: { _id: "$serviceType", count: { $sum: 1 } } },
    ]);
    const leadsByAdmin = await Lead.aggregate([
      { $group: { _id: "$adminId", count: { $sum: 1 } } },
    ]);

    return res.json({
      success: true,
      data: {
        leads,
        stats: {
          total: totalLeads,
          byStage: leadsByStage,
          byService: leadsByService,
          byAdmin: leadsByAdmin,
        },
      },
    });
  } catch (error: any) {
    console.error("Get all leads error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch leads",
    });
  }
};
