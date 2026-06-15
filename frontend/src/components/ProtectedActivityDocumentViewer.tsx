'use client';

import { useEffect, useState, ReactNode } from 'react';
import mammoth from 'mammoth';
import DOMPurify from 'dompurify';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { useBlobUrl, fileApi } from '@/lib/useBlobUrl';

GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';

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

function ProtectedPdfCanvas({ url }: { url: string }) {
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
        const response = await fileApi.get(url, { responseType: 'arraybuffer' });
        const pdf = await getDocument({ data: response.data }).promise;
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
        console.error('Error rendering protected PDF:', err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    renderPdf();

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-gray-400 font-medium animate-pulse">Loading PDF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-red-500 font-medium">Failed to load PDF</p>
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

function ProtectedWordContent({ url }: { url: string }) {
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadDocument = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fileApi.get(url, { responseType: 'arraybuffer' });
        const result = await mammoth.convertToHtml({ arrayBuffer: response.data });
        if (!cancelled) {
          setHtmlContent(result.value);
        }
      } catch {
        if (!cancelled) setError('Failed to load document');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDocument();

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16 text-red-500">{error}</div>
    );
  }

  return (
    <div
      className="w-full max-h-[600px] overflow-y-auto bg-white p-6"
      style={{ userSelect: 'none' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="text-gray-800"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }}
      />
    </div>
  );
}

interface ProtectedActivityDocumentViewerProps {
  url: string;
  className?: string;
  iframeClassName?: string;
  minHeight?: string;
}

export function ProtectedActivityDocumentViewer({
  url,
  className = '',
  minHeight = '500px',
}: ProtectedActivityDocumentViewerProps) {
  useDocumentProtection();

  const isPdf = /\.pdf$/i.test(url);
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  const isWord = /\.(doc|docx)$/i.test(url);
  const { blobUrl, loading, error } = useBlobUrl(isImage ? url : null);

  return (
    <div
      className={className}
      style={{ userSelect: 'none', minHeight }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {isPdf ? (
        <ProtectedPdfCanvas url={url} />
      ) : isWord ? (
        <ProtectedWordContent url={url} />
      ) : isImage ? (
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
  onClose?: () => void;
  children?: ReactNode;
}

export function ProtectedActivityDocumentPanel({
  url,
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
        {children || <ProtectedActivityDocumentViewer url={url} />}
      </div>
      <div className="px-4 py-2 bg-yellow-900/40 border-t border-yellow-700/30">
        <p className="text-xs text-yellow-200 text-center">View only — download, print, and copy are disabled</p>
      </div>
    </div>
  );
}
