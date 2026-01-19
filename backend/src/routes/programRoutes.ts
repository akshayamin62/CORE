import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';
import {
  getStudentPrograms,
  getCounselorPrograms,
  getCounselorStudentPrograms,
  createProgram,
  selectProgram,
  removeProgram,
  uploadProgramsFromExcel,
  updateProgramSelection,
  getStudentAppliedPrograms,
  getAdminStudentPrograms,
} from '../controllers/programController';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel files (.xlsx, .xls) are allowed.'));
    }
  },
});

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Student routes
router.get('/student/programs', authorize([USER_ROLE.STUDENT]), getStudentPrograms);
router.post('/student/programs/select', authorize([USER_ROLE.STUDENT]), selectProgram);
router.delete('/student/programs/:programId', authorize([USER_ROLE.STUDENT]), removeProgram);

// Counselor routes
router.get('/counselor/programs', authorize([USER_ROLE.COUNSELOR]), getCounselorPrograms);
router.get('/counselor/student/:studentId/programs', authorize([USER_ROLE.COUNSELOR]), getCounselorStudentPrograms);
router.post('/counselor/programs', authorize([USER_ROLE.COUNSELOR]), createProgram);
router.post('/counselor/programs/upload-excel', authorize([USER_ROLE.COUNSELOR]), upload.single('file'), uploadProgramsFromExcel);

// Admin routes
router.get('/admin/student/:studentId/programs', authorize([USER_ROLE.ADMIN]), getAdminStudentPrograms);
router.get('/admin/student/:studentId/applied-programs', authorize([USER_ROLE.ADMIN]), getStudentAppliedPrograms);
router.put('/admin/programs/:programId/selection', authorize([USER_ROLE.ADMIN]), updateProgramSelection);

export default router;

