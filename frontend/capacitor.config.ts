import type { CapacitorConfig } from '@capacitor/cli';
import { getCapacitorServerUrl } from './scripts/capacitor-env.mjs';

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
