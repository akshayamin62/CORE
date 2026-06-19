'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface StudentFormHeaderProps {
  studentName: string;
  serviceName: string;
  editMode: 'admin' | 'OPS' | 'SUPER_ADMIN' | 'EDUPLAN_COACH' | 'COUNSELOR' | 'VIEW';
  studentId?: string;
  planTier?: string;
  serviceSlug?: string;
  adminId?: string;
}

export default function StudentFormHeader({
  studentName,
  serviceName,
  editMode,
  studentId,
  planTier,
  serviceSlug,
  adminId,
}: StudentFormHeaderProps) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [open]);

  const getApiBase = () => {
    if (editMode === 'admin' || editMode === 'COUNSELOR' || editMode === 'VIEW') {
      return `${API_URL}/admin/students`;
    }
    return `${API_URL}/super-admin/students`;
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    if (!studentId) {
      toast.error('Student information not available');
      return;
    }

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${getApiBase()}/${studentId}/send-message`,
        { message: message.trim(), serviceName, sendVia: 'both' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Message sent successfully');
      setMessage('');
      setOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleCancel = () => {
    setMessage('');
    setOpen(false);
  };

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 shrink-0">
          <h1 className="mb-1 text-xl font-bold text-gray-900 sm:text-2xl">{studentName}</h1>
          <p className="text-sm text-gray-600 sm:text-base">
            Service: <span className="font-medium text-gray-900">{serviceName}</span>
            {planTier && (
              <span className="ml-2 rounded px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800">
                {planTier}
              </span>
            )}
          </p>
        </div>

        {studentId && !open && editMode !== 'VIEW' && (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {adminId && (
              <button
                onClick={() => {
                  router.push(`/service-plans/view?studentId=${studentId}`);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Service Plans
              </button>
            )}
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Send Message
            </button>
          </div>
        )}

        {/* View Service Plans button for VIEW mode (Parent) */}
        {studentId && editMode === 'VIEW' && adminId && (
          <button
            onClick={() => {
              router.push(`/service-plans/view?studentId=${studentId}`);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Service Plans
          </button>
        )}
      </div>

      {/* Compose panel — slides in below */}
      {studentId && open && editMode !== 'VIEW' && (
        <div className="mt-5 border-t border-gray-100 pt-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">
              Message to <span className="text-gray-900">{studentName}</span>
            </p>
          </div>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
              if (e.key === 'Escape') {
                handleCancel();
              }
            }}
            placeholder="Type your message here… (Enter to send, Shift+Enter for new line, Esc to cancel)"
            rows={4}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            disabled={sending}
          />
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={handleCancel}
              disabled={sending}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSendMessage}
              disabled={sending || !message.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  Send Message
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


