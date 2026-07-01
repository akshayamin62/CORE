'use client';

import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { isNativeApp } from '@/lib/isNativeApp';

/** Auth pages (login/signup) — web toasts below fixed navbar; native uses AppToaster */
export default function AuthPageToaster() {
  const [native, setNative] = useState(false);

  useEffect(() => {
    setNative(isNativeApp());
  }, []);

  if (native) return null;

  return (
    <Toaster
      position="top-right"
      containerClassName="site-toaster-host"
      containerStyle={{
        top: 'calc(5rem + env(safe-area-inset-top, 28px) + 0.5rem)',
      }}
      toastOptions={{
        duration: 4000,
        success: {
          duration: 4000,
          iconTheme: { primary: '#10b981', secondary: '#ecfdf5' },
        },
        error: {
          duration: 5000,
          iconTheme: { primary: '#ef4444', secondary: '#fef2f2' },
        },
      }}
    />
  );
}
