'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { isNativeApp } from '@/lib/isNativeApp';

type ViewerState = {
  blobUrl: string;
  fileName: string;
  mimeType: string;
};

type MobileFileViewerContextValue = {
  openInAppViewer: (blob: Blob, fileName: string) => void;
};

const MobileFileViewerContext = createContext<MobileFileViewerContextValue>({
  openInAppViewer: () => {},
});

export function useMobileFileViewer() {
  return useContext(MobileFileViewerContext);
}

export function MobileFileViewerProvider({ children }: { children: ReactNode }) {
  const [viewer, setViewer] = useState<ViewerState | null>(null);

  const openInAppViewer = useCallback((blob: Blob, fileName: string) => {
    if (!isNativeApp()) return;
    const blobUrl = URL.createObjectURL(blob);
    setViewer({ blobUrl, fileName, mimeType: blob.type || 'application/pdf' });
  }, []);

  const closeViewer = useCallback(() => {
    setViewer((current) => {
      if (current?.blobUrl) URL.revokeObjectURL(current.blobUrl);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!viewer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeViewer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewer, closeViewer]);

  const isPdf =
    viewer?.mimeType.includes('pdf') ||
    viewer?.fileName.toLowerCase().endsWith('.pdf');

  return (
    <MobileFileViewerContext.Provider value={{ openInAppViewer }}>
      {children}
      {isNativeApp() && viewer && (
        <div className="fixed inset-0 z-[100000] flex flex-col bg-gray-900/95">
          <div className="app-mobile-safe-top flex shrink-0 items-center gap-3 border-b border-white/10 bg-gray-900 px-4 py-3 text-white">
            <button
              type="button"
              onClick={closeViewer}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium"
            >
              Close
            </button>
            <p className="min-w-0 flex-1 truncate text-sm font-medium">{viewer.fileName}</p>
            <a
              href={viewer.blobUrl}
              download={viewer.fileName}
              className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white"
            >
              Save
            </a>
          </div>
          <div className="min-h-0 flex-1 bg-white">
            {isPdf ? (
              <iframe
                title={viewer.fileName}
                src={viewer.blobUrl}
                className="h-full w-full border-0"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
                <p className="text-sm text-gray-600">
                  Preview is not available for this file type. Tap Save to download it.
                </p>
                <a
                  href={viewer.blobUrl}
                  download={viewer.fileName}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                >
                  Save {viewer.fileName}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </MobileFileViewerContext.Provider>
  );
}
