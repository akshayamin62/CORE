'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const REVIEWER_EMAIL = 'reviewer@admitra.io';

const ALLOWED_PATHS = [
  '/',
  '/make-payment',
  '/privacy-policy',
  '/terms-of-service',
  '/refund-policy',
  '/cookie-policy',
  '/profile',
  '/login',
  '/signup',
];

export default function ReviewerRouteGuard() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');
    if (!token || !userRaw) return;

    try {
      const user = JSON.parse(userRaw);
      const isReviewer = (user?.email || '').toLowerCase().trim() === REVIEWER_EMAIL;
      if (!isReviewer) return;

      const isAllowed = ALLOWED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
      if (!isAllowed) {
        router.replace('/');
      }
    } catch {
      // ignore parse issues
    }
  }, [pathname, router]);

  return null;
}
