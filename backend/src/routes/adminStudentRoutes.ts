import express from 'express';
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from '../types/roles';
import {
  getAllStudents,
  getStudentDetails,
  getStudentFormAnswers,
  updateStudentFormAnswers,
  getStudentsWithRegistrations,
} from '../controllers/adminStudentController';

const router = express.Router();

// All routes require authentication and admin/counselor role
router.use(authenticate);
router.use(authorize([USER_ROLE.ADMIN, USER_ROLE.COUNSELOR]));

// Get all students
router.get('/', getAllStudents);

// Get students with registrations (for filtering)
router.get('/with-registrations', getStudentsWithRegistrations);

// Get student details
router.get('/:studentId', getStudentDetails);

// Get student form answers for a registration
router.get('/:studentId/registrations/:registrationId/answers', getStudentFormAnswers);

// Update student form answers
router.put('/:studentId/answers/:partKey', updateStudentFormAnswers);

export default router;

