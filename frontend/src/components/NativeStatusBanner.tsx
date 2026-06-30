'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { isNativeApp } from '@/lib/isNativeApp';

type StatusType = 'loading' | 'success' | 'error';

type StatusState = {
  message: string;
  type: StatusType;
} | null;

type NativeStatusContextValue = {
  showStatus: (message: string, type: StatusType) => void;
  clearStatus: () => void;
};

const NativeStatusContext = createContext<NativeStatusContextValue>({
  showStatus: () => {},
  clearStatus: () => {},
});

export function useNativeStatus() {
  return useContext(NativeStatusContext);
}

export function NativeStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<StatusState>(null);

  const showStatus = useCallback((message: string, type: StatusType) => {
    if (!isNativeApp()) return;
    setStatus({ message, type });
  }, []);

  const clearStatus = useCallback(() => setStatus(null), []);

  const tone =
    status?.type === 'success'
      ? 'border-green-200 bg-green-50 text-green-900'
      : status?.type === 'error'
        ? 'border-red-200 bg-red-50 text-red-900'
        : 'border-blue-200 bg-blue-50 text-blue-900';

  return (
    <NativeStatusContext.Provider value={{ showStatus, clearStatus }}>
      {children}
      {isNativeApp() && status && (
        <div
          className={`fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] left-3 right-3 z-[99998] flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${tone}`}
          role="status"
        >
          {status.type === 'loading' && (
            <span className="mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          <p className="min-w-0 flex-1 break-words text-sm font-medium leading-snug">{status.message}</p>
          {status.type !== 'loading' && (
            <button
              type="button"
              onClick={clearStatus}
              className="shrink-0 rounded-lg p-1 opacity-70 hover:opacity-100"
              aria-label="Dismiss"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </NativeStatusContext.Provider>
  );
}
