import { Capacitor } from '@capacitor/core';

/** True when running inside the Capacitor Android/iOS shell */
export function isNativeApp(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
}
