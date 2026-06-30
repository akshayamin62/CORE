import type { CapacitorConfig } from '@capacitor/cli';
import { getCapacitorServerUrl } from './scripts/capacitor-env.mjs';

/**
 * Dev:    CAPACITOR_MODE=dev     → .env.capacitor.local (LAN, same Wi‑Fi)
 * Prod:   CAPACITOR_MODE=production → .env.capacitor.production.local (HTTPS, Play Store)
 */
const serverUrl = getCapacitorServerUrl();

const config: CapacitorConfig = {
  appId: 'core.admitra.io',
  appName: 'CORE',
  // Committed placeholder shell; live app loads from server.url in dev.
  webDir: 'capacitor-web',
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: serverUrl.startsWith('http://'),
        },
      }
    : {}),
};

export default config;
