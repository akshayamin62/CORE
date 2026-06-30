import toast, { ToastOptions } from 'react-hot-toast';
import { isNativeApp } from '@/lib/isNativeApp';

export const NATIVE_TOASTER_ID = 'native-app';

function withNativeToaster(opts?: ToastOptions): ToastOptions | undefined {
  if (!isNativeApp()) return opts;
  return { ...opts, toasterId: NATIVE_TOASTER_ID };
}

/** Route all native-app toasts to AppToaster (swipe + website style, below navbar) */
export function patchNativeToasts(): void {
  if (typeof window === 'undefined' || !isNativeApp()) return;

  const marker = '__nativeToastPatched';
  if ((toast as unknown as Record<string, boolean>)[marker]) return;

  const wrap = (fn: typeof toast.success) => {
    const wrapped = (message: Parameters<typeof fn>[0], opts?: ToastOptions) =>
      fn(message, withNativeToaster(opts));
    return wrapped as typeof fn;
  };

  toast.success = wrap(toast.success);
  toast.error = wrap(toast.error);
  toast.loading = wrap(toast.loading);

  (toast as unknown as Record<string, boolean>)[marker] = true;
}
