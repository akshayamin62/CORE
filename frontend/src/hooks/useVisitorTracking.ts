'use client';

import { useEffect } from 'react';
import { siteStatsAPI } from '@/lib/api';

export function useVisitorTracking() {
  useEffect(() => {
    // sessionStorage is cleared when the tab closes.
    // So every fresh open counts as a new visit.
    const alreadyTracked = sessionStorage.getItem('visit_tracked');
    if (alreadyTracked) return;

    sessionStorage.setItem('visit_tracked', '1');
    siteStatsAPI.recordVisit().catch(() => {
      // Silently fail — never break the page over a stat
    });
  }, []);
}
