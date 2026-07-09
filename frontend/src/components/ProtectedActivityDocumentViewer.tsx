'use client';

import { useEffect, useState, ReactNode } from 'react';
import mammoth from 'mammoth';
import DOMPurify from 'dompurify';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import ivyApi from '@/lib/ivyApi';
import { useBlobUrl, fetchUploadArrayBuffer, resolveUploadPath } from '@/lib/useBlobUrl';

GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';

type DocumentKind = 'pdf' | 'word' | 'image' | 'unknown';

function getDocumentKind(url: string, fileName?: string): DocumentKind {
  const detect = (value: string): DocumentKind | null => {
    const lower = value.toLowerCase();
    if (lower.endsWith('.pdf')) return 'pdf';
    if (lower.endsWith('.doc') || lower.endsWith('.docx')) return 'word';
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(lower)) return 'image';
    return null;
  };

  if (fileName) {
    const fromName = detect(fileName);
    if (fromName) return fromName;
  }

  const fromUrl = detect(url);
  return fromUrl || 'unknown';
}

async function fetchDocumentArrayBuffer(
  url: string,
  activityId?: string,
): Promise<ArrayBuffer> {
  if (activityId) {
    const response = await ivyApi.get(`/activities/${activityId}/document`, {
      responseType: 'arraybuffer',
    });
    return response.data;
  }

  return fetchUploadArrayBuffer(url);
}

function useDocumentProtection(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        ['c', 's', 'p', 'a', 'x'].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
      }
    };
    const handleDragStart = (e: DragEvent) => e.preventDefault();

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, [enabled]);
}

function ProtectedPdfCanvas({
  url,
  activityId,
}: {
  url: string;
  activityId?: string;
}) {
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const renderPdf = async () => {
      setLoading(true);
      setError(false);
      setPages([]);

      try {
        const data = await fetchDocumentArrayBuffer(url, activityId);
        const pdf = await getDocument({ data }).promise;
        const renderedPages: string[] = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
          if (cancelled) return;

          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.4 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');

          if (!context) continue;

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: context, viewport }).promise;
          renderedPages.push(canvas.toDataURL('image/jpeg', 0.9));
        }

        if (!cancelled) {
          setPages(renderedPages);
        }
      } catch (err) {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    renderPdf();

    return () => {
      cancelled = true;
    };
  }, [url, activityId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-gray-400 font-medium animate-pulse">Loading PDF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16 px-4 text-center">
        <p className="text-red-500 font-medium">
          Failed to load document. The file may be missing or unavailable.
        </p>
      </div>
    );
  }

  return (
    <div
      className="max-h-[600px] overflow-y-auto bg-gray-100 p-4 space-y-4"
      onContextMenu={(e) => e.preventDefault()}
      style={{ userSelect: 'none' }}
    >
      {pages.map((src, index) => (
        <img
          key={index}
          src={src}
          alt={`Page ${index + 1}`}
          className="w-full shadow-md select-none"
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
        />
      ))}
    </div>
  );
}

function ProtectedWordContent({
  url,
  activityId,
}: {
  url: string;
  activityId?: string;
}) {
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadDocument = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchDocumentArrayBuffer(url, activityId);
        const result = await mammoth.convertToHtml({ arrayBuffer: data });
        if (!cancelled) {
          setHtmlContent(result.value);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load document. The file may be missing or unavailable.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDocument();

    return () => {
      cancelled = true;
    };
  }, [url, activityId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16 px-4 text-center text-red-500">{error}</div>
    );
  }

  return (
    <div
      className="w-full max-h-[600px] overflow-y-auto bg-white p-6"
      style={{ userSelect: 'none' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="text-gray-800 break-words [overflow-wrap:anywhere]"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }}
      />
    </div>
  );
}

interface ProtectedActivityDocumentViewerProps {
  url: string;
  fileName?: string;
  activityId?: string;
  className?: string;
  iframeClassName?: string;
  minHeight?: string;
}

export function ProtectedActivityDocumentViewer({
  url,
  fileName,
  activityId,
  className = '',
  minHeight = '500px',
}: ProtectedActivityDocumentViewerProps) {
  useDocumentProtection();

  const resolvedUrl = resolveUploadPath(url);
  const kind = getDocumentKind(resolvedUrl, fileName);
  const { blobUrl, loading, error } = useBlobUrl(kind === 'image' ? resolvedUrl : null);

  return (
    <div
      className={className}
      style={{ userSelect: 'none', minHeight }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {kind === 'pdf' ? (
        <ProtectedPdfCanvas url={resolvedUrl} activityId={activityId} />
      ) : kind === 'word' ? (
        <ProtectedWordContent url={resolvedUrl} activityId={activityId} />
      ) : kind === 'image' ? (
        error ? (
          <p className="text-red-500 text-center py-16">Failed to load image</p>
        ) : loading || !blobUrl ? (
          <p className="text-gray-400 text-center py-16 animate-pulse">Loading...</p>
        ) : (
          <div className="flex items-center justify-center p-4">
            <img
              src={blobUrl}
              alt="Document"
              className="max-w-full max-h-[800px] object-contain select-none"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        )
      ) : (
        <p className="text-gray-500 text-center py-16 text-sm">Unsupported document format</p>
      )}
    </div>
  );
}

interface ProtectedActivityDocumentPanelProps {
  url: string;
  fileName?: string;
  activityId?: string;
  onClose?: () => void;
  children?: ReactNode;
}

export function ProtectedActivityDocumentPanel({
  url,
  fileName,
  activityId,
  onClose,
  children,
}: ProtectedActivityDocumentPanelProps) {
  useDocumentProtection();

  return (
    <div className="mt-4 relative bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border-4 border-gray-800">
      {onClose && (
        <div className="absolute top-4 right-4 z-10">
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all border border-white/20"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      <div className="bg-gray-800">
        {children || (
          <ProtectedActivityDocumentViewer
            url={url}
            fileName={fileName}
            activityId={activityId}
          />
        )}
      </div>
      <div className="px-4 py-2 bg-yellow-900/40 border-t border-yellow-700/30">
        <p className="text-xs text-yellow-200 text-center">View only — download, print, and copy are disabled</p>
      </div>
    </div>
  );
}
