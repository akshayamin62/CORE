import express from "express";
import {
  getAllServices,
  getMyServices,
  registerForService,
  getServiceForm,
  getRegistrationDetails,
} from "../controllers/serviceController";
import { authenticate } from "../middleware/auth";
import { validateRequest } from "../middleware/validate";

const router = express.Router();

// Public routes
router.get("/services", getAllServices);
router.get("/services/:serviceId/form", getServiceForm);

// Protected routes (require authentication)
router.get("/my-services", authenticate, getMyServices);
router.post(
  "/register",
  authenticate,
  validateRequest(["serviceId"]),
  registerForService
);
router.get(
  "/registrations/:registrationId",
  authenticate,
  getRegistrationDetails
);

export default router;

