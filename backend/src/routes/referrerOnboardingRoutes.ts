import express from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import {
  getReferrerOnboardingProfile,
  updateReferrerOnboardingProfile,
  updateReferrerOnboardingProfileForAdmin,
  getReferrerOnboardingProfileForAdmin,
  getReferrerOnboardingProfileForSuperAdmin,
} from "../controllers/referrerOnboardingController";

const router = express.Router();

router.use(authenticate);

router.get("/profile", authorize(USER_ROLE.REFERRER), getReferrerOnboardingProfile);
router.put("/profile", authorize(USER_ROLE.REFERRER), updateReferrerOnboardingProfile);

router.get(
  "/admin/:referrerId/profile",
  authorize(USER_ROLE.ADMIN),
  getReferrerOnboardingProfileForAdmin
);

router.put(
  "/admin/:referrerId/profile",
  authorize(USER_ROLE.ADMIN),
  updateReferrerOnboardingProfileForAdmin
);

router.get(
  "/super-admin/:referrerId/profile",
  authorize(USER_ROLE.SUPER_ADMIN),
  getReferrerOnboardingProfileForSuperAdmin
);

export default router;
