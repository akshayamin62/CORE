import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import B2BLead from '../models/B2BLead';
import B2BSales from '../models/B2BSales';
import { USER_ROLE } from '../types/roles';
import {
  getEntityNotes,
  getNoteCreatorName,
  parseNoteDate,
} from '../utils/entityNotes';

async function verifyB2BLeadNoteAccess(
  lead: { assignedB2BSalesId?: mongoose.Types.ObjectId },
  userId: string,
  userRole: string
): Promise<{ allowed: boolean; status?: number; message?: string }> {
  if (userRole === USER_ROLE.SUPER_ADMIN) {
    return { allowed: true };
  }
  if (userRole === USER_ROLE.B2B_SALES) {
    const salesProfile = await B2BSales.findOne({ userId });
    if (
      !salesProfile ||
      !lead.assignedB2BSalesId ||
      lead.assignedB2BSalesId.toString() !== salesProfile._id.toString()
    ) {
      return { allowed: false, status: 403, message: 'Access denied' };
    }
    return { allowed: true };
  }
  return { allowed: false, status: 403, message: 'Access denied' };
}

function getCreatedByRole(userRole: string): string | null {
  if (userRole === USER_ROLE.SUPER_ADMIN) return 'SUPER_ADMIN';
  if (userRole === USER_ROLE.B2B_SALES) return 'B2B_SALES';
  return null;
}

export const addB2BLeadNote = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { leadId } = req.params;
    const { text, noteDate } = req.body;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!text?.trim()) {
      return res.status(400).json({ success: false, message: 'Note text is required' });
    }
    if (!noteDate) {
      return res.status(400).json({ success: false, message: 'Note date is required' });
    }

    const createdByRole = getCreatedByRole(userRole || '');
    if (!createdByRole) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const lead = await B2BLead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'B2B Lead not found' });
    }

    const access = await verifyB2BLeadNoteAccess(lead, userId!, userRole!);
    if (!access.allowed) {
      return res.status(access.status || 403).json({ success: false, message: access.message });
    }

    const createdByName = await getNoteCreatorName(userId);
    const newNote = {
      text: text.trim(),
      noteDate: parseNoteDate(noteDate),
      createdByRole,
      createdByName,
      createdAt: new Date(),
    };

    const updated = await B2BLead.findByIdAndUpdate(
      leadId,
      { $push: { notes: newNote } },
      { new: true, runValidators: false }
    );

    return res.json({
      success: true,
      message: 'Note added successfully',
      data: { notes: getEntityNotes(updated || {}) },
    });
  } catch (error: any) {
    console.error('Add B2B lead note error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add note' });
  }
};

export const updateB2BLeadNote = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { leadId, noteId } = req.params;
    const { text, noteDate } = req.body;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!text?.trim()) {
      return res.status(400).json({ success: false, message: 'Note text is required' });
    }
    if (!noteDate) {
      return res.status(400).json({ success: false, message: 'Note date is required' });
    }

    const createdByRole = getCreatedByRole(userRole || '');
    if (!createdByRole) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const lead = await B2BLead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'B2B Lead not found' });
    }

    const access = await verifyB2BLeadNoteAccess(lead, userId!, userRole!);
    if (!access.allowed) {
      return res.status(access.status || 403).json({ success: false, message: access.message });
    }

    const note = getEntityNotes(lead).find((n: any) => n._id.toString() === noteId);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    if (note.createdByRole !== createdByRole) {
      return res.status(403).json({ success: false, message: 'You can only edit notes you created' });
    }

    await B2BLead.updateOne(
      { _id: leadId, 'notes._id': noteId },
      {
        $set: {
          'notes.$.text': text.trim(),
          'notes.$.noteDate': parseNoteDate(noteDate),
        },
      }
    );

    const updated = await B2BLead.findById(leadId);
    return res.json({
      success: true,
      message: 'Note updated successfully',
      data: { notes: getEntityNotes(updated || {}) },
    });
  } catch (error: any) {
    console.error('Update B2B lead note error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update note' });
  }
};

export const deleteB2BLeadNote = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { leadId, noteId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    const createdByRole = getCreatedByRole(userRole || '');
    if (!createdByRole) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const lead = await B2BLead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'B2B Lead not found' });
    }

    const access = await verifyB2BLeadNoteAccess(lead, userId!, userRole!);
    if (!access.allowed) {
      return res.status(access.status || 403).json({ success: false, message: access.message });
    }

    const note = getEntityNotes(lead).find((n: any) => n._id.toString() === noteId);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    if (note.createdByRole !== createdByRole) {
      return res.status(403).json({ success: false, message: 'You can only delete notes you created' });
    }

    await B2BLead.updateOne(
      { _id: leadId },
      { $pull: { notes: { _id: new mongoose.Types.ObjectId(noteId) } } }
    );

    const updated = await B2BLead.findById(leadId);
    return res.json({
      success: true,
      message: 'Note deleted successfully',
      data: { notes: getEntityNotes(updated || {}) },
    });
  } catch (error: any) {
    console.error('Delete B2B lead note error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete note' });
  }
};
