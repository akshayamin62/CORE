'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { EntityNote } from '@/types';
import { toDatetimeLocalValue, datetimeLocalToISO } from '@/utils/datetimeLocal';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  COUNSELOR: 'Counselor',
  B2B_SALES: 'B2B Sales',
};

const ROLE_BADGE_CLASS: Record<string, string> = {
  SUPER_ADMIN: 'bg-indigo-100 text-indigo-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  COUNSELOR: 'bg-emerald-100 text-emerald-700',
  B2B_SALES: 'bg-purple-100 text-purple-700',
};

export interface EntityNotesApi {
  addNote: (entityId: string, data: { text: string; noteDate: string }) => Promise<{ data: { data: { notes: EntityNote[] } } }>;
  updateNote: (entityId: string, noteId: string, data: { text: string; noteDate: string }) => Promise<{ data: { data: { notes: EntityNote[] } } }>;
  deleteNote: (entityId: string, noteId: string) => Promise<{ data: { data: { notes: EntityNote[] } } }>;
}

interface EntityNotesPanelProps {
  entityId: string;
  notes: EntityNote[];
  currentRole: string;
  onNotesChange: (notes: EntityNote[]) => void;
  api: EntityNotesApi;
  className?: string;
}

export default function EntityNotesPanel({
  entityId,
  notes: notesProp,
  currentRole,
  onNotesChange,
  api,
  className = '',
}: EntityNotesPanelProps) {
  const notes = Array.isArray(notesProp) ? notesProp : [];
  const [newNote, setNewNote] = useState('');
  const [noteDate, setNoteDate] = useState(() => toDatetimeLocalValue());
  const [addingNote, setAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');
  const [editNoteDate, setEditNoteDate] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const handleAddNote = async () => {
    if (!newNote.trim() || !noteDate) return;
    setAddingNote(true);
    try {
      const response = await api.addNote(entityId, {
        text: newNote.trim(),
        noteDate: datetimeLocalToISO(noteDate),
      });
      onNotesChange(response.data.data.notes);
      setNewNote('');
      setNoteDate(toDatetimeLocalValue());
      toast.success('Note added');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleStartEditNote = (note: EntityNote) => {
    setEditingNoteId(note._id);
    setEditNoteText(note.text);
    setEditNoteDate(toDatetimeLocalValue(note.noteDate));
  };

  const handleSaveEditNote = async () => {
    if (!editingNoteId || !editNoteText.trim() || !editNoteDate) return;
    setSavingEdit(true);
    try {
      const response = await api.updateNote(entityId, editingNoteId, {
        text: editNoteText.trim(),
        noteDate: datetimeLocalToISO(editNoteDate),
      });
      onNotesChange(response.data.data.notes);
      setEditingNoteId(null);
      toast.success('Note updated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update note');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setDeletingNoteId(noteId);
    try {
      const response = await api.deleteNote(entityId, noteId);
      onNotesChange(response.data.data.notes);
      toast.success('Note deleted');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete note');
    } finally {
      setDeletingNoteId(null);
    }
  };

  return (
    <div className={`mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      <h3 className="text-lg font-bold text-gray-900 mb-4">Notes</h3>

      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Enter a note..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <input
              type="datetime-local"
              value={noteDate}
              onChange={(e) => setNoteDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddNote}
              disabled={addingNote || !newNote.trim() || !noteDate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {addingNote ? 'Adding...' : 'Add Note'}
            </button>
          </div>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No notes yet</p>
      ) : (
        <div className="space-y-3">
          {[...notes].reverse().map((note) => (
            <div key={note._id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              {editingNoteId === note._id ? (
                <div className="space-y-2">
                  <textarea
                    value={editNoteText}
                    onChange={(e) => setEditNoteText(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="datetime-local"
                      value={editNoteDate}
                      onChange={(e) => setEditNoteDate(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleSaveEditNote}
                      disabled={savingEdit || !editNoteText.trim()}
                      title="Save"
                      className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setEditingNoteId(null)}
                      title="Cancel"
                      className="p-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.text}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs text-gray-400">
                        {new Date(note.noteDate).toLocaleString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          ROLE_BADGE_CLASS[note.createdByRole] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {note.createdByName || ROLE_LABELS[note.createdByRole] || note.createdByRole}
                        {' '}({ROLE_LABELS[note.createdByRole] || note.createdByRole})
                      </span>
                    </div>
                  </div>
                  {note.createdByRole === currentRole && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleStartEditNote(note)}
                        title="Edit note"
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note._id)}
                        disabled={deletingNoteId === note._id}
                        title="Delete note"
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
