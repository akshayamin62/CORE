import { Capacitor } from '@capacitor/core';

/** Open a blob URL — popups are blocked in Capacitor WebView */
export function openBlobUrl(blobUrl: string): void {
  if (Capacitor.isNativePlatform()) {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.target = '_self';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }
  window.open(blobUrl, '_blank', 'noopener,noreferrer');
}

/** Trigger file download from a Blob (works in mobile WebView) */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
