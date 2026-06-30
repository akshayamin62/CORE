'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';

function getFallbackRoute(pathname: string): string | null {
  if (pathname.startsWith('/eduplan-coach')) return '/eduplan-coach/dashboard';
  if (pathname.startsWith('/super-admin')) return '/super-admin/dashboard';
  if (pathname.startsWith('/admin')) return '/admin';
  if (pathname.startsWith('/counselor')) return '/counselor/dashboard';
  if (pathname.startsWith('/advisor')) return '/advisor/dashboard';
  if (pathname.startsWith('/ops')) return '/ops/dashboard';
  if (pathname.startsWith('/student')) return '/student/dashboard';
  if (pathname.startsWith('/parent')) return '/parent/dashboard';
  if (pathname.startsWith('/referrer')) return '/referrer/dashboard';
  if (pathname.startsWith('/service-provider')) return '/service-provider/dashboard';
  if (pathname === '/' || pathname === '/login') return null;
  return '/';
}

/** Android hardware back: navigate in-app instead of closing the Capacitor shell */
export default function CapacitorBackButton() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listener: { remove: () => Promise<void> } | undefined;

    (async () => {
      const { App } = await import('@capacitor/app');
      listener = await App.addListener('backButton', () => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          router.back();
          return;
        }
        const fallback = getFallbackRoute(pathname);
        if (fallback) {
          router.push(fallback);
          return;
        }
        App.exitApp();
      });
    })();

    return () => {
      listener?.remove();
    };
  }, [router, pathname]);

  return null;
}
