import express from "express";
import {
  submitInquiry,
  getAdminInfoBySlug,
  getAdminLeads,
  getLeadDetail,
  assignLeadToCounselor,
  updateLeadStatus,
  addLeadNote,
  getAdminCounselors,
  getCounselorLeads,
  getInquiryFormUrl,
  getCounselorInquiryFormUrl,
  getAllLeads,
} from "../controllers/leadController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";

const router = express.Router();

// ============= PUBLIC ROUTES (No Auth Required) =============

// Get admin info for inquiry form
router.get("/public/inquiry/:adminSlug/info", getAdminInfoBySlug);

// Submit inquiry form
router.post("/public/inquiry/:adminSlug/submit", submitInquiry);

// ============= ADMIN ROUTES =============

// Get all leads for admin
router.get(
  "/admin/leads",
  authenticate,
  authorize([USER_ROLE.ADMIN]),
  getAdminLeads
);

// Get admin's inquiry form URL
router.get(
  "/admin/inquiry-form-url",
  authenticate,
  authorize([USER_ROLE.ADMIN]),
  getInquiryFormUrl
);

// Get counselors for assignment dropdown
router.get(
  "/admin/counselors",
  authenticate,
  authorize([USER_ROLE.ADMIN]),
  getAdminCounselors
);

// Assign lead to counselor
router.post(
  "/admin/leads/:leadId/assign",
  authenticate,
  authorize([USER_ROLE.ADMIN]),
  assignLeadToCounselor
);

// ============= COUNSELOR ROUTES =============

// Get assigned leads for counselor
router.get(
  "/counselor/leads",
  authenticate,
  authorize([USER_ROLE.COUNSELOR]),
  getCounselorLeads
);

// Get counselor's inquiry form URL (their admin's URL)
router.get(
  "/counselor/inquiry-form-url",
  authenticate,
  authorize([USER_ROLE.COUNSELOR]),
  getCounselorInquiryFormUrl
);

// ============= SHARED ROUTES (Admin & Counselor) =============

// Get lead detail (Admin or assigned Counselor)
router.get(
  "/leads/:leadId",
  authenticate,
  authorize([USER_ROLE.ADMIN, USER_ROLE.COUNSELOR]),
  getLeadDetail
);

// Update lead status
router.patch(
  "/leads/:leadId/status",
  authenticate,
  authorize([USER_ROLE.ADMIN, USER_ROLE.COUNSELOR]),
  updateLeadStatus
);

// Add note to lead
router.post(
  "/leads/:leadId/notes",
  authenticate,
  authorize([USER_ROLE.ADMIN, USER_ROLE.COUNSELOR]),
  addLeadNote
);

// ============= SUPER ADMIN ROUTES =============

// Get all leads (for analytics)
router.get(
  "/super-admin/leads",
  authenticate,
  authorize([USER_ROLE.SUPER_ADMIN]),
  getAllLeads
);

export default router;
