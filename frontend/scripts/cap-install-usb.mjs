import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const adb = join(
  process.env.LOCALAPPDATA || '',
  'Android',
  'Sdk',
  'platform-tools',
  'adb.exe',
);

const apk = join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');

if (!existsSync(apk)) {
  console.error('APK not found. Run: npm run cap:build:debug');
  process.exit(1);
}

if (!existsSync(adb)) {
  console.error('adb not found. Install Android SDK platform-tools.');
  process.exit(1);
}

console.log('Checking USB device…');
const devices = spawnSync(adb, ['devices'], { encoding: 'utf8', shell: true });
console.log(devices.stdout || devices.stderr);

const install = spawnSync(adb, ['install', '-r', apk], { stdio: 'inherit', shell: true });
process.exit(install.status ?? 1);
