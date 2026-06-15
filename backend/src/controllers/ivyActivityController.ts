import { Request, Response } from 'express';
import AgentSuggestion, { IActivityTask } from '../models/ivy/AgentSuggestion';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getUploadBaseDir, ensureDir } from '../utils/uploadDir';

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents are allowed'));
    }
  },
});

export const activityFileUploadMiddleware = (
  req: Request,
  res: Response,
  next: (err?: unknown) => void
): void => {
  upload.single('document')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({
          success: false,
          message: 'PDF must be 15 MB or smaller',
        });
        return;
      }
      res.status(400).json({
        success: false,
        message: err.message || 'File upload failed',
      });
      return;
    }
    if (err) {
      res.status(400).json({
        success: false,
        message: err instanceof Error ? err.message : 'File upload failed',
      });
      return;
    }
    next();
  });
};

function parseActivityTasks(raw: unknown): IActivityTask[] {
  let parsed: unknown;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('Invalid tasks format');
    }
  } else if (Array.isArray(raw)) {
    parsed = raw;
  } else {
    throw new Error('At least one task is required');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Tasks must be an array');
  }

  const tasks = parsed
    .map((item: { title?: string; page?: string | number }) => {
      const title = String(item?.title || '').trim();
      const pageRaw = item?.page;
      const page =
        pageRaw !== undefined && pageRaw !== null && String(pageRaw).trim() !== ''
          ? Number(pageRaw)
          : undefined;
      return {
        title,
        ...(page !== undefined && !Number.isNaN(page) ? { page } : {}),
      };
    })
    .filter((task) => task.title.length > 0);

  if (tasks.length === 0) {
    throw new Error('At least one task with a title is required');
  }

  return tasks;
}

// Create a new activity
export const createActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, pointerNo, tasks: tasksRaw } = req.body;

    if (!name || !description || !pointerNo) {
      res.status(400).json({
        success: false,
        message: 'Activity name, description, and pointer number are required',
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'PDF document is required',
      });
      return;
    }

    let tasks: IActivityTask[];
    try {
      tasks = parseActivityTasks(tasksRaw);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Invalid tasks',
      });
      return;
    }

    const pointer = parseInt(pointerNo);
    if (![2, 3, 4].includes(pointer)) {
      res.status(400).json({
        success: false,
        message: 'Pointer number must be 2, 3, or 4',
      });
      return;
    }

    const uploadDir = path.join(getUploadBaseDir(), 'activities', pointer.toString());
    ensureDir(uploadDir);

    const fileName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, req.file.buffer);

    const activity = new AgentSuggestion({
      pointerNo: pointer,
      title: name,
      description,
      tags: [],
      source: 'SUPERADMIN',
      documentUrl: `/uploads/activities/${pointer}/${fileName}`,
      documentName: req.file.originalname,
      tasks,
    });

    await activity.save();

    res.json({
      success: true,
      message: 'Activity created successfully',
      data: activity,
    });
  } catch (error: any) {
    console.error('Error creating activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create activity',
    });
  }
};

// Get all activities
export const getActivities = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pointerNo } = req.query;

    const filter: any = { source: 'SUPERADMIN' };
    if (pointerNo) {
      filter.pointerNo = parseInt(pointerNo as string);
    }

    const activities = await AgentSuggestion.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: activities,
    });
  } catch (error: any) {
    console.error('Error fetching activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activities',
    });
  }
};

// Get activity by ID
export const getActivityById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const activity = await AgentSuggestion.findById(id);

    if (!activity) {
      res.status(404).json({
        success: false,
        message: 'Activity not found',
      });
      return;
    }

    res.json({
      success: true,
      data: activity,
    });
  } catch (error: any) {
    console.error('Error fetching activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity',
    });
  }
};

function deleteActivityFile(documentUrl?: string) {
  if (!documentUrl) return;
  const filePath = path.join(getUploadBaseDir(), documentUrl.replace(/^\/uploads\//, ''));
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

// Update activity
export const updateActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, pointerNo, tasks: tasksRaw } = req.body;

    const activity = await AgentSuggestion.findById(id);
    if (!activity || activity.source !== 'SUPERADMIN') {
      res.status(404).json({
        success: false,
        message: 'Activity not found',
      });
      return;
    }

    if (!name || !description || !pointerNo) {
      res.status(400).json({
        success: false,
        message: 'Activity name, description, and pointer number are required',
      });
      return;
    }

    const pointer = parseInt(pointerNo);
    if (![2, 3, 4].includes(pointer)) {
      res.status(400).json({
        success: false,
        message: 'Pointer number must be 2, 3, or 4',
      });
      return;
    }

    let tasks: IActivityTask[];
    try {
      tasks = parseActivityTasks(tasksRaw);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Invalid tasks',
      });
      return;
    }

    if (req.file) {
      deleteActivityFile(activity.documentUrl);

      const uploadDir = path.join(getUploadBaseDir(), 'activities', pointer.toString());
      ensureDir(uploadDir);

      const fileName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, req.file.buffer);

      activity.documentUrl = `/uploads/activities/${pointer}/${fileName}`;
      activity.documentName = req.file.originalname;
    } else if (pointer !== activity.pointerNo && activity.documentUrl) {
      const oldRelative = activity.documentUrl.replace(/^\/uploads\//, '');
      const oldPath = path.join(getUploadBaseDir(), oldRelative);
      const fileName = path.basename(oldPath);
      const newDir = path.join(getUploadBaseDir(), 'activities', pointer.toString());
      ensureDir(newDir);
      const newPath = path.join(newDir, fileName);

      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
      }

      activity.documentUrl = `/uploads/activities/${pointer}/${fileName}`;
    }

    activity.title = name;
    activity.description = description;
    activity.pointerNo = pointer;
    activity.tasks = tasks;

    await activity.save();

    res.json({
      success: true,
      message: 'Activity updated successfully',
      data: activity,
    });
  } catch (error: any) {
    console.error('Error updating activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update activity',
    });
  }
};

// Delete activity
export const deleteActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const activity = await AgentSuggestion.findById(id);

    if (!activity) {
      res.status(404).json({
        success: false,
        message: 'Activity not found',
      });
      return;
    }

    if (activity.documentUrl) {
      deleteActivityFile(activity.documentUrl);
    }

    await AgentSuggestion.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Activity deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete activity',
    });
  }
};
