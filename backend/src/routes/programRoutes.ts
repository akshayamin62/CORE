import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';
import {
  getStudentPrograms,
  getOpsPrograms,
  getOpsStudentPrograms,
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
router.post('/student/programs/create', authorize([USER_ROLE.STUDENT]), createProgram);
router.delete('/student/programs/:programId', authorize([USER_ROLE.STUDENT]), removeProgram);

// OPS routes
router.get('/ops/programs', authorize([USER_ROLE.OPS]), getOpsPrograms);
router.get('/ops/student/:studentId/programs', authorize([USER_ROLE.OPS]), getOpsStudentPrograms);
router.post('/ops/programs', authorize([USER_ROLE.OPS]), createProgram);
router.post('/ops/student/:studentId/programs', authorize([USER_ROLE.OPS]), createProgram);
router.post('/ops/programs/upload-excel', authorize([USER_ROLE.OPS]), upload.single('file'), uploadProgramsFromExcel);
router.post('/ops/student/:studentId/programs/upload-excel', authorize([USER_ROLE.OPS]), upload.single('file'), uploadProgramsFromExcel);

// Admin routes
router.get('/admin/student/:studentId/programs', authorize([USER_ROLE.ADMIN]), getAdminStudentPrograms);
router.get('/admin/student/:studentId/applied-programs', authorize([USER_ROLE.ADMIN]), getStudentAppliedPrograms);
router.post('/admin/programs/create', authorize([USER_ROLE.ADMIN]), createProgram);
router.post('/admin/programs/upload-excel', authorize([USER_ROLE.ADMIN]), upload.single('file'), uploadProgramsFromExcel);
router.put('/admin/programs/:programId/selection', authorize([USER_ROLE.ADMIN]), updateProgramSelection);

export default router;


