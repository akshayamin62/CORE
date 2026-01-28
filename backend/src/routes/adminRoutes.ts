import { Router } from "express";
import { createCounselor, getCounselors } from "../controllers/adminController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize([USER_ROLE.ADMIN]));

/**
 * @route   POST /api/admin/counselor
 * @desc    Create a new Counselor
 * @access  Admin only
 * @body    name, email, phoneNumber (optional)
 */
router.post("/counselor", createCounselor);

/**
 * @route   GET /api/admin/counselors
 * @desc    Get all counselors created by this admin
 * @access  Admin only
 */
router.get("/counselors", getCounselors);

export default router;


