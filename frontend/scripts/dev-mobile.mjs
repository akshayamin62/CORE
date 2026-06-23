import { spawn } from 'node:child_process';

const child = spawn('npx', ['next', 'dev', '-H', '0.0.0.0'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NEXT_PRIVATE_DISABLE_DEV_OVERLAY_UX: '1',
  },
});

child.on('exit', (code) => process.exit(code ?? 0));
