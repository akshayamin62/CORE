import express from 'express';
import {
  createActivity,
  getActivities,
  getActivityById,
  updateActivity,
  deleteActivity,
  activityFileUploadMiddleware,
} from '../controllers/ivyActivityController';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';

const router = express.Router();

const readRoles = [
  USER_ROLE.SUPER_ADMIN,
  USER_ROLE.IVY_EXPERT,
  USER_ROLE.STUDENT,
  USER_ROLE.ADMIN,
  USER_ROLE.COUNSELOR,
  USER_ROLE.PARENT,
  USER_ROLE.ADVISOR,
];

// Create activity (superadmin only)
router.post('/', authorize(USER_ROLE.SUPER_ADMIN), activityFileUploadMiddleware, createActivity);

// Update activity (superadmin only)
router.put('/:id', authorize(USER_ROLE.SUPER_ADMIN), activityFileUploadMiddleware, updateActivity);

// Get all activities (can filter by pointerNo)
router.get('/', authorize(readRoles), getActivities);

// Get activity by ID
router.get('/:id', authorize(readRoles), getActivityById);

// Delete activity (superadmin only)
router.delete('/:id', authorize(USER_ROLE.SUPER_ADMIN), deleteActivity);

export default router;
