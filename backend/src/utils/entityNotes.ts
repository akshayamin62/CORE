import User from '../models/User';

export interface IEntityNote {
  text: string;
  noteDate: Date;
  createdByRole: string;
  createdByName: string;
  createdAt: Date;
}

export const entityNotesSchemaDefinition = {
  type: [
    {
      text: { type: String, required: true, trim: true },
      noteDate: { type: Date, required: true },
      createdByRole: { type: String, required: true },
      createdByName: { type: String, default: '' },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  default: [],
};

export function getEntityNotes(entity: { notes?: unknown }) {
  return Array.isArray(entity.notes) ? entity.notes : [];
}

export async function getNoteCreatorName(userId?: string): Promise<string> {
  if (!userId) return '';
  const creatorUser = await User.findById(userId).select('firstName middleName lastName');
  return creatorUser
    ? [creatorUser.firstName, creatorUser.middleName, creatorUser.lastName].filter(Boolean).join(' ')
    : '';
}

/** Parse datetime-local values as IST; ISO strings with offset/Z are parsed as-is */
export function parseNoteDate(value: string): Date {
  if (/[zZ]|[+-]\d{2}:\d{2}$/.test(value)) {
    return new Date(value);
  }
  return new Date(`${value}:00+05:30`);
}
