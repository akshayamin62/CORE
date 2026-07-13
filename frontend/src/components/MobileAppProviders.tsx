'use client';

import AppToaster from '@/components/AppToaster';
import CapacitorBackButton from '@/components/CapacitorBackButton';
import MobileScrollToTop from '@/components/MobileScrollToTop';
import { MobileFileViewerProvider } from '@/components/MobileFileViewer';

export default function MobileAppProviders() {
  return (
    <MobileFileViewerProvider>
      <AppToaster />
      <MobileScrollToTop />
      <CapacitorBackButton />
    </MobileFileViewerProvider>
  );
}
