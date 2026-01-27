import express from "express";
import {
  getKSDocumentFields,
  addKSDocumentField,
  deleteKSDocumentField,
} from "../controllers/ksDocumentController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get KS document fields for a specific student
router.get("/:registrationId", getKSDocumentFields);

// Add new KS document field (Admin/OPS only)
router.post("/add", authorize(USER_ROLE.ADMIN, USER_ROLE.OPS), addKSDocumentField);

// Delete KS document field (Admin/OPS only)
router.delete("/:fieldId", authorize(USER_ROLE.ADMIN, USER_ROLE.OPS), deleteKSDocumentField);

export default router;

