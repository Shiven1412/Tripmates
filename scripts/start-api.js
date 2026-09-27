import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const child = spawn(process.execPath, ['server/index.js'], {
  cwd: projectRoot,
  env: {
    ...process.env,
    NODE_USE_SYSTEM_CA: process.env.NODE_USE_SYSTEM_CA || '1',
  },
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error(`Could not start TripMates API: ${error.message}`);
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
