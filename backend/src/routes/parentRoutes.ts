import express from "express";
import {
  getParentsByStudent,
  updateParentInfo,
  addParentForStudent,
} from "../controllers/parentController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";

const router = express.Router();

// All routes require authentication

// Get parents for a student
router.get(
  "/student/:studentId",
  authenticate,
  authorize(
    USER_ROLE.OPS,
    USER_ROLE.IVY_EXPERT,
    USER_ROLE.EDUPLAN_COACH,
    USER_ROLE.SUPER_ADMIN,
    USER_ROLE.STUDENT,
    USER_ROLE.COUNSELOR,
    USER_ROLE.ADMIN
  ),
  getParentsByStudent
);

// Update parent info (joint edit)
router.patch(
  "/:parentId",
  authenticate,
  authorize(
    USER_ROLE.OPS,
    USER_ROLE.IVY_EXPERT,
    USER_ROLE.EDUPLAN_COACH,
    USER_ROLE.SUPER_ADMIN
  ),
  updateParentInfo
);

// Add a new parent for a student
router.post(
  "/student/:studentId",
  authenticate,
  authorize(
    USER_ROLE.OPS,
    USER_ROLE.IVY_EXPERT,
    USER_ROLE.EDUPLAN_COACH,
    USER_ROLE.SUPER_ADMIN,
    USER_ROLE.STUDENT
  ),
  addParentForStudent
);

export default router;
