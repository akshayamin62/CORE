import { Router } from "express";
import {
  getAllUsers,
  getUserStats,
  approveUser,
  rejectUser,
  toggleUserStatus,
  // deleteUser,
  getPendingApprovals,
  createOps,
  getAllOps,
  createAdmin,
  getAdmins,
  createUserByRole,
} from "../controllers/superAdminController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";

const router = Router();

// All routes require authentication and super admin role
router.use(authenticate);
router.use(authorize([USER_ROLE.SUPER_ADMIN]));

/**
 * @route   GET /api/super-admin/users
 * @desc    Get all users with optional filters
 * @access  Super Admin only
 * @query   role, isVerified, superAdminApproved, isActive, search
 */
router.get("/users", getAllUsers);

/**
 * @route   GET /api/super-admin/stats
 * @desc    Get user statistics
 * @access  Super Admin only
 */
router.get("/stats", getUserStats);

/**
 * @route   GET /api/super-admin/pending
 * @desc    Get users pending approval
 * @access  Super Admin only
 */
router.get("/pending", getPendingApprovals);

/**
 * @route   POST /api/super-admin/users/:userId/approve
 * @desc    Approve a user
 * @access  Super Admin only
 */
router.post("/users/:userId/approve", approveUser);

/**
 * @route   POST /api/super-admin/users/:userId/reject
 * @desc    Reject a user
 * @access  Super Admin only
 * @body    reason (optional)
 */
router.post("/users/:userId/reject", rejectUser);

/**
 * @route   PATCH /api/super-admin/users/:userId/toggle-status
 * @desc    Toggle user active/inactive status
 * @access  Super Admin only
 */
router.patch("/users/:userId/toggle-status", toggleUserStatus);

/**
 * @route   DELETE /api/super-admin/users/:userId
 * @desc    Delete a user
 * @access  Super Admin only
 */
// router.delete("/users/:userId", deleteUser);

/**
 * @route   POST /api/super-admin/ops
 * @desc    Create a new OPS
 * @access  Super Admin only
 * @body    name, email, phoneNumber (optional)
 */
router.post("/ops", createOps);

/**
 * @route   GET /api/super-admin/ops
 * @desc    Get all ops
 * @access  Super Admin only
 */
router.get("/ops", getAllOps);

/**
 * @route   POST /api/super-admin/admin
 * @desc    Create a new Admin
 * @access  Super Admin only
 * @body    name, email, phoneNumber (optional)
 */
router.post("/admin", createAdmin);

/**
 * @route   GET /api/super-admin/admins
 * @desc    Get all admins for dropdown
 * @access  Super Admin only
 */
router.get("/admins", getAdmins);

/**
 * @route   POST /api/super-admin/user
 * @desc    Create a new User by Role
 * @access  Super Admin only
 * @body    name, email, phoneNumber (optional), role, adminId (for COUNSELOR)
 */
router.post("/user", createUserByRole);

export default router;


