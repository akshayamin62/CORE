'use client';

import { useEffect, useState } from 'react';

interface ReferrerDocumentViewModalProps {
  open: boolean;
  onClose: () => void;
  documentId: string | null;
  documentName?: string;
  onFetch: (documentId: string) => Promise<Blob>;
}

export default function ReferrerDocumentViewModal({
  open,
  onClose,
  documentId,
  documentName,
  onFetch,
}: ReferrerDocumentViewModalProps) {
  const [loading, setLoading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('application/pdf');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !documentId) {
      setBlobUrl(null);
      setError(null);
      return;
    }

    let objectUrl: string | null = null;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const blob = await onFetch(documentId);
        objectUrl = URL.createObjectURL(blob);
        setMimeType(blob.type || 'application/pdf');
        setBlobUrl(objectUrl);
      } catch {
        setError('Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    void load();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, documentId, onFetch]);

  if (!open) return null;

  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';

  return (
    <div className="app-modal-overlay fixed inset-0 z-[70] flex items-end justify-center bg-black/50 md:items-center md:p-4">
      <div className="app-modal-panel flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">
            {documentName || 'View Document'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-gray-100"
            aria-label="Close"
          >
            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading && (
            <div className="flex h-64 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          )}
          {error && <p className="py-8 text-center text-red-600">{error}</p>}
          {!loading && !error && blobUrl && (
            <>
              {isImage && (
                <img src={blobUrl} alt={documentName || 'Document'} className="mx-auto max-h-[70vh] rounded-lg" />
              )}
              {isPdf && (
                <iframe src={blobUrl} title={documentName || 'Document'} className="h-[70vh] w-full rounded-lg border" />
              )}
              {!isImage && !isPdf && (
                <div className="py-12 text-center">
                  <p className="mb-4 text-gray-600">Preview not available for this file type.</p>
                  <a
                    href={blobUrl}
                    download={documentName || 'document'}
                    className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Download
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
