'use client';

import { useVisitorTracking } from '@/hooks/useVisitorTracking';

// Invisible component — just fires the visitor tracking hook once per session.
// Placed in the root layout so it runs on every page open.
export default function VisitorTracker() {
  useVisitorTracking();
  return null;
}
