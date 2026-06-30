'use client';

import { useEffect, useState, type ComponentProps } from 'react';
import { Toaster } from 'react-hot-toast';
import { isNativeApp } from '@/lib/isNativeApp';

/** Website Toaster — hidden in Capacitor app (AppToaster handles native) */
export default function NativeAwareToaster(props: ComponentProps<typeof Toaster>) {
  const [native, setNative] = useState(false);

  useEffect(() => {
    setNative(isNativeApp());
  }, []);

  if (native) return null;

  return <Toaster position="top-right" {...props} />;
}
