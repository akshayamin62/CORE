import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Read CAPACITOR_SERVER_URL from env or .env.capacitor.local */
export function getCapacitorServerUrl() {
  const fromEnv = process.env.CAPACITOR_SERVER_URL?.trim();
  if (fromEnv) return fromEnv;

  const envFile = join(root, '.env.capacitor.local');
  if (!existsSync(envFile)) return undefined;

  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key === 'CAPACITOR_SERVER_URL') {
      return rest.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
  return undefined;
}
