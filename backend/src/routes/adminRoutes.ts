import { Router } from "express";
import {
  getAllUsers,
  getUserStats,
  approveUser,
  rejectUser,
  toggleUserStatus,
  // deleteUser,
  getPendingApprovals,
  createCounselor,
  getCounselorsBySpecialization,
} from "../controllers/adminController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize([USER_ROLE.ADMIN]));

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with optional filters
 * @access  Admin only
 * @query   role, isVerified, adminApproved, isActive, search
 */
router.get("/users", getAllUsers);

/**
 * @route   GET /api/admin/stats
 * @desc    Get user statistics
 * @access  Admin only
 */
router.get("/stats", getUserStats);

/**
 * @route   GET /api/admin/pending
 * @desc    Get users pending approval
 * @access  Admin only
 */
router.get("/pending", getPendingApprovals);

/**
 * @route   POST /api/admin/users/:userId/approve
 * @desc    Approve a user
 * @access  Admin only
 */
router.post("/users/:userId/approve", approveUser);

/**
 * @route   POST /api/admin/users/:userId/reject
 * @desc    Reject a user
 * @access  Admin only
 * @body    reason (optional)
 */
router.post("/users/:userId/reject", rejectUser);

/**
 * @route   PATCH /api/admin/users/:userId/toggle-status
 * @desc    Toggle user active/inactive status
 * @access  Admin only
 */
router.patch("/users/:userId/toggle-status", toggleUserStatus);

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    Delete a user
 * @access  Admin only
 */
// router.delete("/users/:userId", deleteUser);

/**
 * @route   POST /api/admin/counselors
 * @desc    Create a new counselor
 * @access  Admin only
 * @body    name, email, phoneNumber (optional), specializations (optional array)
 */
router.post("/counselors", createCounselor);

/**
 * @route   GET /api/admin/counselors
 * @desc    Get counselors by specialization
 * @access  Admin only
 * @query   specialization (optional)
 */
router.get("/counselors", getCounselorsBySpecialization);

export default router;

