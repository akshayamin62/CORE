'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { superAdminAPI } from '@/lib/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSecondaryEmail(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  if (!EMAIL_REGEX.test(trimmed)) return 'Enter a valid email address';
  return null;
}

export function validateSecondaryMobile(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 10) return 'Enter a valid mobile number (at least 10 digits)';
  if (digits.length > 15) return 'Mobile number is too long';
  return null;
}

interface StudentSecondaryContactContextValue {
  secondaryEmail: string;
  secondaryMobileNumber: string;
  savingEmail: boolean;
  savingMobile: boolean;
  saveEmail: (value: string) => Promise<boolean>;
  saveMobile: (value: string) => Promise<boolean>;
}

const StudentSecondaryContactContext = createContext<StudentSecondaryContactContextValue | null>(null);

function useStudentSecondaryContactContext() {
  const ctx = useContext(StudentSecondaryContactContext);
  if (!ctx) {
    throw new Error('StudentSecondaryContact components must be used within StudentSecondaryContactProvider');
  }
  return ctx;
}

interface ProviderProps {
  studentId: string;
  secondaryEmail?: string;
  secondaryMobileNumber?: string;
  onUpdated?: () => void;
  children: ReactNode;
}

export function StudentSecondaryContactProvider({
  studentId,
  secondaryEmail: initialEmail,
  secondaryMobileNumber: initialMobile,
  onUpdated,
  children,
}: ProviderProps) {
  const [secondaryEmail, setSecondaryEmail] = useState('');
  const [secondaryMobileNumber, setSecondaryMobileNumber] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingMobile, setSavingMobile] = useState(false);

  useEffect(() => {
    setSecondaryEmail(initialEmail || '');
    setSecondaryMobileNumber(initialMobile || '');
  }, [initialEmail, initialMobile]);

  const saveEmail = async (value: string): Promise<boolean> => {
    const trimmed = value.trim().toLowerCase();
    const error = validateSecondaryEmail(value);
    if (error) {
      toast.error(error);
      return false;
    }

    setSavingEmail(true);
    try {
      await superAdminAPI.updateStudentSecondaryContact(studentId, {
        secondaryEmail: trimmed,
      });
      setSecondaryEmail(trimmed);
      toast.success('Secondary email saved');
      onUpdated?.();
      return true;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save secondary email');
      return false;
    } finally {
      setSavingEmail(false);
    }
  };

  const saveMobile = async (value: string): Promise<boolean> => {
    const trimmed = value.trim();
    const error = validateSecondaryMobile(value);
    if (error) {
      toast.error(error);
      return false;
    }

    setSavingMobile(true);
    try {
      await superAdminAPI.updateStudentSecondaryContact(studentId, {
        secondaryMobileNumber: trimmed,
      });
      setSecondaryMobileNumber(trimmed);
      toast.success('Secondary mobile saved');
      onUpdated?.();
      return true;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save secondary mobile');
      return false;
    } finally {
      setSavingMobile(false);
    }
  };

  return (
    <StudentSecondaryContactContext.Provider
      value={{
        secondaryEmail,
        secondaryMobileNumber,
        savingEmail,
        savingMobile,
        saveEmail,
        saveMobile,
      }}
    >
      {children}
    </StudentSecondaryContactContext.Provider>
  );
}

function EditIconButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-0.5 text-gray-400 hover:text-blue-600 transition-colors"
      title="Edit"
      aria-label="Edit"
    >
      <Pencil className="w-3.5 h-3.5" />
    </button>
  );
}

function FieldActions({
  saving,
  onSave,
  onCancel,
}: {
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-1.5 flex items-center gap-3">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

export function SecondaryEmailField() {
  const { secondaryEmail, savingEmail, saveEmail } = useStudentSecondaryContactContext();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    setDraft(secondaryEmail);
    setError(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setDraft(secondaryEmail);
    setError(null);
    setEditing(false);
  };

  const handleSave = async () => {
    const validationError = validateSecondaryEmail(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    const ok = await saveEmail(draft);
    if (ok) {
      setError(null);
      setEditing(false);
    }
  };

  if (!editing) {
    return (
      <div className="mt-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">Secondary Email</span>
          <EditIconButton onClick={startEditing} />
        </div>
        <p className="text-sm text-gray-600">{secondaryEmail || 'Not set'}</p>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <label className="text-xs text-gray-500 block mb-1">Secondary Email</label>
      <input
        type="email"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          if (error) setError(validateSecondaryEmail(e.target.value));
        }}
        placeholder="Not set"
        className={`w-full max-w-sm px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          error ? 'border-red-400' : 'border-gray-300'
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <FieldActions saving={savingEmail} onSave={handleSave} onCancel={cancelEditing} />
    </div>
  );
}

export function SecondaryMobileField() {
  const { secondaryMobileNumber, savingMobile, saveMobile } = useStudentSecondaryContactContext();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    setDraft(secondaryMobileNumber);
    setError(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setDraft(secondaryMobileNumber);
    setError(null);
    setEditing(false);
  };

  const handleSave = async () => {
    const validationError = validateSecondaryMobile(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    const ok = await saveMobile(draft);
    if (ok) {
      setError(null);
      setEditing(false);
    }
  };

  if (!editing) {
    return (
      <div className="mt-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">Secondary Mobile</span>
          <EditIconButton onClick={startEditing} />
        </div>
        <p className="text-sm text-gray-900">{secondaryMobileNumber || 'Not set'}</p>
      </div>
    );
  }

  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">Secondary Mobile</label>
      <input
        type="tel"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          if (error) setError(validateSecondaryMobile(e.target.value));
        }}
        placeholder="Not set"
        className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          error ? 'border-red-400' : 'border-gray-300'
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <FieldActions saving={savingMobile} onSave={handleSave} onCancel={cancelEditing} />
    </div>
  );
}
