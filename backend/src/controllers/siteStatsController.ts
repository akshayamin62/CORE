import { Request, Response } from 'express';
import SiteStats from '../models/SiteStats';

// POST /api/stats/visit — called by frontend on every new session (no auth required)
export const recordVisit = async (_req: Request, res: Response): Promise<void> => {
  try {
    await SiteStats.findOneAndUpdate(
      { _id: 'global' },
      { $inc: { totalVisitors: 1 } },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to record visit' });
  }
};

// GET /api/stats/visitors — super-admin only (protected by authenticate + role check in route)
export const getVisitorCount = async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await SiteStats.findById('global').lean();
    res.json({ success: true, data: { totalVisitors: stats?.totalVisitors ?? 0 } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
};
