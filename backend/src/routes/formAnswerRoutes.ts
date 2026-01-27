import express from "express";
import {
  saveFormAnswers,
  getFormAnswers,
  getProgress,
  deleteFormAnswers,
} from "../controllers/formAnswerController";
import { authenticate } from "../middleware/auth";
import { validateRequest } from "../middleware/validate";

const router = express.Router();

// All routes require authentication
router.post(
  "/save",
  authenticate,
  validateRequest(["registrationId", "partKey", "answers"]),
  saveFormAnswers
);

router.get(
  "/registrations/:registrationId/answers",
  authenticate,
  getFormAnswers
);

router.get(
  "/registrations/:registrationId/progress",
  authenticate,
  getProgress
);

router.delete("/answers/:answerId", authenticate, deleteFormAnswers);

export default router;


