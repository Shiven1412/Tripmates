import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const node = process.execPath;
const viteCli = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const vitePort = Number(process.env.PORT || 8444);
const apiPort = Number(process.env.API_PORT || 4000);

function isPortListening(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(800);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
    socket.once('error', () => resolve(false));
  });
}

async function hasTripMatesApi(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(1500) });
    if (!response.ok) return false;
    const health = await response.json();
    return health?.service === 'tripmates-api';
  } catch {
    return false;
  }
}

const [apiPortOccupied, viteAlreadyRunning] = await Promise.all([
  isPortListening(apiPort),
  isPortListening(vitePort),
]);
const apiAlreadyRunning = apiPortOccupied && await hasTripMatesApi(apiPort);
if (apiPortOccupied && !apiAlreadyRunning) {
  console.error(`[API] Port ${apiPort} is already occupied by another service. Set API_PORT to an available port and restart.`);
  process.exit(1);
}

const serverEnv = {
  ...process.env,
  API_PORT: String(apiPort),
  PORT: String(apiPort),
  NODE_USE_SYSTEM_CA: process.env.NODE_USE_SYSTEM_CA || '1',
};
const api = apiAlreadyRunning ? null : spawn(node, ['server/index.js'], { cwd: projectRoot, env: serverEnv, stdio: ['inherit', 'inherit', 'pipe'] });
const vite = viteAlreadyRunning ? null : spawn(node, [viteCli, ...process.argv.slice(2)], { cwd: projectRoot, env: process.env, stdio: ['inherit', 'inherit', 'pipe'] });
let stopping = false;
let vitePortAlreadyInUse = false;
let apiPortAlreadyInUse = false;

if (viteAlreadyRunning) console.log(`[Vite] Reusing the existing preview on port ${vitePort}.`);
if (apiAlreadyRunning) console.log(`[API] Reusing the existing TripMates API on port ${apiPort}.`);

vite?.stderr.on('data', (chunk) => {
  const output = chunk.toString();
  process.stderr.write(output);
  if (/port\s+\d+\s+is already in use/i.test(output)) vitePortAlreadyInUse = true;
});

api?.stderr.on('data', (chunk) => {
  const output = chunk.toString();
  process.stderr.write(output);
  if (/EADDRINUSE|address already in use/i.test(output)) apiPortAlreadyInUse = true;
});

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of [api, vite].filter((child) => child !== null)) {
    if (child.exitCode === null && !child.killed) child.kill('SIGTERM');
  }
  process.exitCode = code;
}

for (const [name, child] of [['API', api], ...(vite ? [['Vite', vite]] : [])].filter(([, child]) => child !== null)) {
  child.on('error', (error) => {
    console.error(`[${name}] Could not start: ${error.message}`);
    stop(1);
  });
  child.on('exit', (code, signal) => {
    if (name === 'API' && apiPortAlreadyInUse && code !== 0) {
      console.error(`[API] Port ${apiPort} is occupied. Re-run after the existing API responds at /api/health, or choose another API_PORT.`);
      if (vite && vite.exitCode === null) stop(code || 1);
      return;
    }
    if (name === 'Vite' && vitePortAlreadyInUse && code !== 0) {
      console.warn('[Vite] A development server is already listening; keeping the API available for that preview.');
      return;
    }
    if (!stopping && code !== 0) {
      console.error(`[${name}] exited (${signal || code}). Stopping the development stack.`);
      stop(code || 1);
    }
  });
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
