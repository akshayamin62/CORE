'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  markBackNavigation,
  scrollAppToTopSoon,
  syncNavStackOnPathChange,
} from '@/utils/mobileNavigationHistory';

function AppScrollToTopInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const onPopState = () => markBackNavigation();
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const query = searchParams.toString();
    const fullPath = query ? `${pathname}?${query}` : pathname;
    const navType = syncNavStackOnPathChange(fullPath);

    if (navType === 'forward') {
      scrollAppToTopSoon();
    }
  }, [pathname, searchParams]);

  return null;
}

/** Scroll to top on forward navigation for every role and page; preserve scroll on back. */
export default function MobileScrollToTop() {
  return (
    <Suspense fallback={null}>
      <AppScrollToTopInner />
    </Suspense>
  );
}
