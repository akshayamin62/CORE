import express from "express";
import {
  getB2BDocumentFields,
  addB2BDocumentField,
  addMyB2BDocumentField,
  deleteB2BDocumentField,
  getMyB2BDocumentFields,
  getMyB2BLeadDocuments,
  getB2BLeadDocuments,
  uploadB2BLeadDocument,
  viewB2BLeadDocument,
  approveB2BLeadDocument,
  rejectB2BLeadDocument,
  deleteB2BLeadDocument,
  seedDefaultDocumentFields,
  getDocumentFieldsByAdmin,
  getDocumentFieldsByAdvisor,
  getDocumentsByAdmin,
  getDocumentsByAdvisor,
} from "../controllers/b2bLeadDocumentController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import { upload, handleMulterError } from "../middleware/upload";

const router = express.Router();

router.use(authenticate);

// ─── Self-service routes for ADMIN / ADVISOR ──────────────────────────────
router.get(
  "/my-fields",
  authorize(USER_ROLE.ADMIN, USER_ROLE.ADVISOR),
  getMyB2BDocumentFields
);

router.get(
  "/my-documents",
  authorize(USER_ROLE.ADMIN, USER_ROLE.ADVISOR),
  getMyB2BLeadDocuments
);

router.post(
  "/seed-defaults",
  authorize(USER_ROLE.ADMIN, USER_ROLE.ADVISOR),
  seedDefaultDocumentFields
);

router.post(
  "/my-fields",
  authorize(USER_ROLE.ADMIN, USER_ROLE.ADVISOR),
  addMyB2BDocumentField
);

// ─── Entity-based fetch for B2B_OPS / SUPER_ADMIN ────────────────────────
router.get(
  "/fields/by-admin/:adminId",
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.B2B_OPS),
  getDocumentFieldsByAdmin
);

router.get(
  "/fields/by-advisor/:advisorId",
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.B2B_OPS),
  getDocumentFieldsByAdvisor
);

router.get(
  "/by-admin/:adminId",
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.B2B_OPS),
  getDocumentsByAdmin
);

router.get(
  "/by-advisor/:advisorId",
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.B2B_OPS),
  getDocumentsByAdvisor
);

// ─── Document Fields ───────────────────────────────────────────────────────
router.get(
  "/fields/:leadId",
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.B2B_OPS),
  getB2BDocumentFields
);

router.post(
  "/fields",
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.B2B_OPS),
  addB2BDocumentField
);

router.delete(
  "/fields/:fieldId",
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.B2B_OPS),
  deleteB2BDocumentField
);

// ─── Documents ─────────────────────────────────────────────────────────────
router.get(
  "/:leadId",
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.B2B_OPS),
  getB2BLeadDocuments
);

router.post(
  "/upload",
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.B2B_OPS, USER_ROLE.ADMIN, USER_ROLE.ADVISOR),
  upload.single("file"),
  handleMulterError,
  uploadB2BLeadDocument
);

router.get(
  "/:documentId/view",
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.B2B_OPS, USER_ROLE.ADMIN, USER_ROLE.ADVISOR),
  viewB2BLeadDocument
);

router.put(
  "/:documentId/approve",
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.B2B_OPS),
  approveB2BLeadDocument
);

router.put(
  "/:documentId/reject",
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.B2B_OPS),
  rejectB2BLeadDocument
);

router.delete(
  "/:documentId",
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.B2B_OPS),
  deleteB2BLeadDocument
);

export default router;
