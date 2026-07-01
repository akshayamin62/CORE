import express from "express";
import {
  seedReferrerDefaultDocumentFields,
  getMyReferrerDocumentFields,
  getMyReferrerDocuments,
  getReferrerDocumentFieldsByReferrerId,
  getReferrerDocumentsByReferrerId,
  uploadReferrerDocument,
  uploadReferrerDocumentByReferrerId,
  viewReferrerDocument,
  approveReferrerDocument,
  rejectReferrerDocument,
} from "../controllers/referrerDocumentController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import { upload, handleMulterError } from "../middleware/upload";

const router = express.Router();

router.use(authenticate);

// Referrer self-service
router.post("/seed-defaults", authorize(USER_ROLE.REFERRER), seedReferrerDefaultDocumentFields);
router.get("/my-fields", authorize(USER_ROLE.REFERRER), getMyReferrerDocumentFields);
router.get("/my-documents", authorize(USER_ROLE.REFERRER), getMyReferrerDocuments);
router.post(
  "/upload",
  authorize(USER_ROLE.REFERRER),
  upload.single("file"),
  handleMulterError,
  uploadReferrerDocument
);

// Admin / super-admin review
router.get(
  "/fields/by-referrer/:referrerId",
  authorize(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
  getReferrerDocumentFieldsByReferrerId
);
router.get(
  "/by-referrer/:referrerId",
  authorize(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
  getReferrerDocumentsByReferrerId
);
router.post(
  "/upload/by-referrer/:referrerId",
  authorize(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
  upload.single("file"),
  handleMulterError,
  uploadReferrerDocumentByReferrerId
);

router.get(
  "/:documentId/view",
  authorize(USER_ROLE.REFERRER, USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
  viewReferrerDocument
);
router.put(
  "/:documentId/approve",
  authorize(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
  approveReferrerDocument
);
router.put(
  "/:documentId/reject",
  authorize(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN),
  rejectReferrerDocument
);

export default router;
