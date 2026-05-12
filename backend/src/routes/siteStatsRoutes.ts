import { Router } from 'express';
import { recordVisit, getVisitorCount } from '../controllers/siteStatsController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public — called by frontend on every new browser session
router.post('/visit', recordVisit);

// Super-admin only — returns the total visitor count
router.get('/visitors', authenticate, getVisitorCount);

export default router;
