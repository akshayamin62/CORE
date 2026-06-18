'use client';

import { ReactNode, useEffect } from 'react';

export const MODAL_OVERLAY_CLASS =
  'app-modal-overlay fixed inset-0 z-[70] flex items-end justify-center bg-black/50 md:items-center md:p-4';

export const MODAL_PANEL_CLASS =
  'app-modal-panel relative flex max-h-[min(92dvh,100%)] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl md:max-h-[90vh] md:rounded-xl';

const maxWidthClass = {
  lg: 'md:max-w-lg',
  xl: 'md:max-w-xl',
  '2xl': 'md:max-w-2xl',
  '4xl': 'md:max-w-4xl',
} as const;

interface ResponsiveFormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: keyof typeof maxWidthClass;
  loading?: boolean;
}

export default function ResponsiveFormModal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = '2xl',
  loading = false,
}: ResponsiveFormModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={MODAL_OVERLAY_CLASS}
      role="dialog"
      aria-modal="true"
      aria-labelledby="responsive-form-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close dialog"
        onClick={onClose}
      />

      <div className={`${MODAL_PANEL_CLASS} ${maxWidthClass[maxWidth]}`}>
        <div className="shrink-0 border-b border-gray-100 px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <h2 id="responsive-form-modal-title" className="text-lg font-bold text-gray-900 md:text-xl">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="app-modal-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
            {children}
          </div>
        )}

        {footer && !loading && (
          <div className="app-modal-footer shrink-0 border-t border-gray-100 bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 md:pb-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
