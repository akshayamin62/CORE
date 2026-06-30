import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function readUrlFromFile(filePath) {
  if (!existsSync(filePath)) return undefined;

  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key === 'CAPACITOR_SERVER_URL') {
      return rest.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
  return undefined;
}

/**
 * Capacitor server URL for the native shell WebView.
 *
 * - dev (default): `.env.capacitor.local` → LAN IP for USB/Wi‑Fi testing
 * - production: `.env.capacitor.production.local` → HTTPS deployed app (Play Store)
 *
 * Override anytime with CAPACITOR_SERVER_URL env var.
 */
export function getCapacitorServerUrl() {
  const fromEnv = process.env.CAPACITOR_SERVER_URL?.trim();
  if (fromEnv) return fromEnv;

  const mode = process.env.CAPACITOR_MODE || 'dev';
  const envFile =
    mode === 'production'
      ? join(root, '.env.capacitor.production.local')
      : join(root, '.env.capacitor.local');

  return readUrlFromFile(envFile);
}

export function getCapacitorMode() {
  return process.env.CAPACITOR_MODE || 'dev';
}
