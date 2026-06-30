import { spawnSync } from 'node:child_process';
import { getCapacitorServerUrl } from './capacitor-env.mjs';

const mode = process.argv[2] === 'production' ? 'production' : 'dev';
process.env.CAPACITOR_MODE = mode;

const serverUrl = getCapacitorServerUrl();
console.log(
  `Capacitor sync (${mode})${serverUrl ? ` → ${serverUrl}` : ' → bundled placeholder only'}`,
);

const result = spawnSync('npx', ['cap', 'sync', 'android'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, CAPACITOR_MODE: mode },
});

process.exit(result.status ?? 1);
