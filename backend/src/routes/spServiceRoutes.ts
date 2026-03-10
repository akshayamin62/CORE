import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';
import {
  createSPService,
  getMySPServices,
  updateSPService,
  deleteSPService,
  getMySPEnquiries,
  updateSPEnquiryStatus,
  getAllSPServicesForStudents,
  createSPEnquiry,
  getStudentMyEnquiries,
} from '../controllers/spServiceController';

const router = Router();

// SP-facing routes (Service Provider manages their services)
router.post('/my-services', authenticate, authorize(USER_ROLE.SERVICE_PROVIDER), createSPService);
router.get('/my-services', authenticate, authorize(USER_ROLE.SERVICE_PROVIDER), getMySPServices);
router.put('/my-services/:serviceId', authenticate, authorize(USER_ROLE.SERVICE_PROVIDER), updateSPService);
router.delete('/my-services/:serviceId', authenticate, authorize(USER_ROLE.SERVICE_PROVIDER), deleteSPService);

// SP enquiry routes (SP views/manages enquiries)
router.get('/my-enquiries', authenticate, authorize(USER_ROLE.SERVICE_PROVIDER), getMySPEnquiries);
router.patch('/my-enquiries/:enquiryId/status', authenticate, authorize(USER_ROLE.SERVICE_PROVIDER), updateSPEnquiryStatus);

// Student-facing routes
router.get('/browse', authenticate, authorize(USER_ROLE.STUDENT), getAllSPServicesForStudents);
router.post('/enquiry', authenticate, authorize(USER_ROLE.STUDENT), createSPEnquiry);
router.get('/student-enquiries', authenticate, authorize(USER_ROLE.STUDENT), getStudentMyEnquiries);

export default router;
