'use client';

import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import SwipeToast from '@/components/SwipeToast';
import { isNativeApp } from '@/lib/isNativeApp';
import { NATIVE_TOASTER_ID, patchNativeToasts } from '@/lib/patchNativeToasts';

/** Native app — website-style toasts below navbar, swipe to dismiss */
export default function AppToaster() {
  const [native, setNative] = useState(false);

  useEffect(() => {
    const isNative = isNativeApp();
    setNative(isNative);
    if (isNative) patchNativeToasts();
  }, []);

  if (!native) return null;

  return (
    <Toaster
      toasterId={NATIVE_TOASTER_ID}
      position="top-center"
      reverseOrder={false}
      gutter={10}
      containerClassName="app-toaster-host"
      containerStyle={{
        top: 'calc(5rem + env(safe-area-inset-top, 28px) + 0.5rem)',
        left: '0.75rem',
        right: '0.75rem',
        bottom: 'auto',
      }}
      toastOptions={{
        duration: 5000,
        className: 'app-toast-item',
        success: {
          duration: 4500,
          iconTheme: { primary: '#10b981', secondary: '#ecfdf5' },
        },
        error: {
          duration: 6000,
          iconTheme: { primary: '#ef4444', secondary: '#fef2f2' },
        },
        loading: {
          iconTheme: { primary: '#3b82f6', secondary: '#eff6ff' },
        },
      }}
    >
      {(t) => <SwipeToast t={t} />}
    </Toaster>
  );
}
