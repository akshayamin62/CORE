import express from "express";
import {
  getStudentProfile,
  updateStudentProfile,
  deleteStudentProfile,
} from "../controllers/studentController";
import { authenticate } from "../middleware/auth";

const router = express.Router();

// All routes require authentication
router.get("/profile", authenticate, getStudentProfile);
router.put("/profile", authenticate, updateStudentProfile);
router.delete("/profile", authenticate, deleteStudentProfile);

export default router;


