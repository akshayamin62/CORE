'use client';

import { useEffect, useState } from 'react';
import { isNativeApp } from '@/lib/isNativeApp';

/** True on Capacitor app or narrow mobile viewport */
export function useCompactViewport(): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const check = () => setCompact(isNativeApp() || window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return compact;
}
