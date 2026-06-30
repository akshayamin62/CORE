'use client';

import AppToaster from '@/components/AppToaster';
import CapacitorBackButton from '@/components/CapacitorBackButton';
import { MobileFileViewerProvider } from '@/components/MobileFileViewer';

export default function MobileAppProviders() {
  return (
    <MobileFileViewerProvider>
      <AppToaster />
      <CapacitorBackButton />
    </MobileFileViewerProvider>
  );
}
