'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { canGoBackInStack, markBackNavigation } from '@/utils/mobileNavigationHistory';

function getFallbackRoute(pathname: string): string | null {
  if (pathname.startsWith('/ivy-league/ivy-expert')) return '/ivy-league/ivy-expert';
  if (pathname.startsWith('/ivy-league/student')) return '/ivy-league/student';
  if (pathname.startsWith('/ivy-league')) return '/ivy-league/student';
  if (pathname.startsWith('/eduplan-coach')) return '/eduplan-coach/dashboard';
  if (pathname.startsWith('/super-admin')) return '/super-admin/dashboard';
  if (pathname.startsWith('/admin')) return '/admin/dashboard';
  if (pathname.startsWith('/counselor')) return '/counselor/dashboard';
  if (pathname.startsWith('/advisor')) return '/advisor/dashboard';
  if (pathname.startsWith('/ops')) return '/ops/dashboard';
  if (pathname.startsWith('/student')) return '/dashboard';
  if (pathname.startsWith('/parent')) return '/parent/dashboard';
  if (pathname.startsWith('/referrer')) return '/referrer/dashboard';
  if (pathname.startsWith('/service-provider')) return '/service-provider/dashboard';
  if (pathname.startsWith('/b2b-sales')) return '/b2b-sales/dashboard';
  if (pathname.startsWith('/b2b-ops')) return '/b2b-ops/dashboard';
  if (pathname === '/dashboard') return null;
  if (pathname === '/' || pathname === '/login') return null;
  return '/dashboard';
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
        if (canGoBackInStack() || (typeof window !== 'undefined' && window.history.length > 1)) {
          markBackNavigation();
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
