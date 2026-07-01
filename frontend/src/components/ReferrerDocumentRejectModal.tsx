'use client';

import { useState } from 'react';

interface ReferrerDocumentRejectModalProps {
  open: boolean;
  documentName?: string;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (message: string) => void;
}

export default function ReferrerDocumentRejectModal({
  open,
  documentName,
  submitting = false,
  onClose,
  onConfirm,
}: ReferrerDocumentRejectModalProps) {
  const [message, setMessage] = useState('');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    onConfirm(message.trim());
  };

  const handleClose = () => {
    setMessage('');
    onClose();
  };

  return (
    <div className="app-modal-overlay fixed inset-0 z-[70] flex items-end justify-center bg-black/50 md:items-center md:p-4">
      <div className="app-modal-panel w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">Reject Document</h3>
          <button type="button" onClick={handleClose} className="rounded-full p-1.5 hover:bg-gray-100">
            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {documentName && (
            <p className="text-sm text-gray-600">
              Rejecting: <span className="font-medium text-gray-900">{documentName}</span>
            </p>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Rejection reason <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Explain what needs to be corrected..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !message.trim()}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {submitting ? 'Rejecting...' : 'Reject Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
