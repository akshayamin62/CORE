import express from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import {
  createFollowUp,
  getCounselorFollowUps,
  getFollowUpSummary,
  getFollowUpById,
  updateFollowUp,
  getLeadFollowUpHistory,
  checkTimeSlotAvailability,
} from "../controllers/followUpController";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Counselor routes
router.post(
  "/",
  authorize([USER_ROLE.COUNSELOR]),
  createFollowUp
);

router.get(
  "/",
  authorize([USER_ROLE.COUNSELOR]),
  getCounselorFollowUps
);

router.get(
  "/summary",
  authorize([USER_ROLE.COUNSELOR]),
  getFollowUpSummary
);

router.get(
  "/check-availability",
  authorize([USER_ROLE.COUNSELOR]),
  checkTimeSlotAvailability
);

router.get(
  "/lead/:leadId/history",
  authorize([USER_ROLE.COUNSELOR]),
  getLeadFollowUpHistory
);

router.get(
  "/:followUpId",
  authorize([USER_ROLE.COUNSELOR]),
  getFollowUpById
);

router.patch(
  "/:followUpId",
  authorize([USER_ROLE.COUNSELOR]),
  updateFollowUp
);

export default router;
