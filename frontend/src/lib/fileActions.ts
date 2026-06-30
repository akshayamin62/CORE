import axios from 'axios';
import toast from 'react-hot-toast';
import { getApiUrl } from '@/lib/apiConfig';
import { blobErrorMessage } from '@/lib/blobErrorMessage';
import { isNativeApp } from '@/lib/isNativeApp';

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function resolveApiUrl(apiPath: string): string {
  if (apiPath.startsWith('http')) return apiPath;
  const base = getApiUrl().replace(/\/$/, '');
  const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  return `${base}${path}`;
}

/** Fetch a protected file from the API as a Blob; throws with a readable message on failure */
export async function fetchAuthorizedBlob(apiPath: string): Promise<Blob> {
  const response = await axios.get(resolveApiUrl(apiPath), {
    headers: authHeaders(),
    responseType: 'blob',
  });

  const contentType = String(response.headers['content-type'] || response.data?.type || '');

  if (contentType.includes('application/json')) {
    const text = await (response.data as Blob).text();
    try {
      const json = JSON.parse(text) as { message?: string };
      throw new Error(json.message || 'Failed to load file');
    } catch (parseErr) {
      if (parseErr instanceof Error && parseErr.message !== 'Failed to load file') {
        throw parseErr;
      }
      throw new Error('Failed to load file');
    }
  }

  return response.data as Blob;
}

/** Desktop: new tab. Native app: in-app viewer via callback */
export function viewBlobOnDevice(
  blob: Blob,
  fileName: string,
  openInAppViewer: (blob: Blob, fileName: string) => void,
): void {
  const blobUrl = URL.createObjectURL(blob);

  if (isNativeApp()) {
    openInAppViewer(blob, fileName);
    return;
  }

  window.open(blobUrl, '_blank', 'noopener,noreferrer');
}

/** Desktop: download link. Native app: share sheet or in-app viewer fallback */
export async function saveBlobOnDevice(
  blob: Blob,
  fileName: string,
  openInAppViewer: (blob: Blob, fileName: string) => void,
): Promise<void> {
  if (!isNativeApp()) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    return;
  }

  const file = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const canShare =
        typeof navigator.canShare === 'function' ? navigator.canShare({ files: [file] }) : true;
      if (canShare) {
        await navigator.share({ files: [file], title: fileName });
        return;
      }
    } catch (shareErr) {
      if ((shareErr as Error)?.name === 'AbortError') return;
    }
  }

  openInAppViewer(blob, fileName);
}

export type FileActionCallbacks = {
  openInAppViewer: (blob: Blob, fileName: string) => void;
};

export async function runFileAction(
  loadingMessage: string,
  successMessage: string,
  action: () => Promise<void>,
  _callbacks?: FileActionCallbacks,
): Promise<void> {
  const toastId = toast.loading(loadingMessage, { duration: Infinity });

  try {
    await action();
    toast.success(successMessage, { id: toastId, duration: 4500 });
  } catch (error) {
    const msg = await blobErrorMessage(error, 'Something went wrong');
    toast.error(msg, { id: toastId, duration: 6000 });
  }
}
