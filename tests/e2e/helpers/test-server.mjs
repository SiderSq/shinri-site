import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

let serverProcess = null;
let cachedBaseUrl = null;

export function isStrict() {
  return process.env.STRICT_E2E === 'true' || 
         process.env.STRICT_E2E === '1' || 
         process.argv.includes('--strict');
}

async function ping(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

export async function getTestServer(preferredPort = 3199) {
  if (cachedBaseUrl) return cachedBaseUrl;

  const envUrl = process.env.BASE_URL;
  if (envUrl) {
    const alive = await ping(`${envUrl}/api/investigation/status`);
    if (alive) {
      cachedBaseUrl = envUrl;
      return cachedBaseUrl;
    }
  }

  // Check if port is already active
  const candidateUrl = `http://127.0.0.1:${preferredPort}`;
  const alreadyUp = await ping(`${candidateUrl}/api/investigation/status`);
  if (alreadyUp) {
    cachedBaseUrl = candidateUrl;
    return cachedBaseUrl;
  }

  // Spawn server process
  const serverScript = path.join(PROJECT_ROOT, 'server', 'server.js');
  serverProcess = spawn('node', [serverScript], {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      PORT: String(preferredPort),
      TRUST_PROXY: 'true',
      NODE_ENV: 'test'
    },
    stdio: 'pipe'
  });

  serverProcess.stderr.on('data', (d) => {
    const msg = d.toString();
    if (!msg.includes('ExperimentalWarning')) {
      // console.error(`[Server stderr]: ${msg}`);
    }
  });

  // Poll until ready
  let ready = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 150));
    if (await ping(`${candidateUrl}/api/investigation/status`)) {
      ready = true;
      break;
    }
  }

  if (!ready) {
    if (serverProcess) serverProcess.kill();
    throw new Error(`Failed to start test server on ${candidateUrl} within 4.5 seconds`);
  }

  // Prevent child process from hanging the parent Node event loop
  serverProcess.unref();

  cachedBaseUrl = candidateUrl;

  const cleanup = () => {
    if (serverProcess) {
      try {
        serverProcess.kill('SIGTERM');
      } catch {
        // ignore
      }
      serverProcess = null;
    }
  };

  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  return cachedBaseUrl;
}

export function stopTestServer() {
  if (serverProcess) {
    try {
      serverProcess.kill('SIGTERM');
    } catch {
      // ignore
    }
    serverProcess = null;
  }
  cachedBaseUrl = null;
}
