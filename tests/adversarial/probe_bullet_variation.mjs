import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { clearAllLocks } from '../../server/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

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

async function testBulletVariations() {
  clearAllLocks();
  const PORT = 3290;
  const serverScript = path.join(PROJECT_ROOT, 'server', 'server.js');
  const serverProcess = spawn('node', [serverScript], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, PORT: String(PORT), TRUST_PROXY: 'true', NODE_ENV: 'test' },
    stdio: 'pipe'
  });

  const targetUrl = `http://127.0.0.1:${PORT}`;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 150));
    if (await ping(`${targetUrl}/api/investigation/status`)) break;
  }

  console.log('Testing consecutive wrong bullets with DIFFERENT bulletIds...');
  const results = [];
  
  for (let i = 1; i <= 6; i++) {
    const res = await fetch(`${targetUrl}/api/investigation/debate/fire`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        statementId: 'STMT_02',
        weakPointId: 'WP_02',
        bulletId: `DOC_DIFF_0${i}`
      })
    });
    
    const data = await res.json();
    results.push({ shot: i, status: res.status, penaltyRemaining: data.penaltyRemaining, locked: data.locked });
    console.log(`Shot ${i} (bullet DOC_DIFF_0${i}): status=${res.status}, penaltyRemaining=${data.penaltyRemaining}, locked=${data.locked}`);
  }

  serverProcess.kill('SIGTERM');
  clearAllLocks();
}

testBulletVariations().catch(console.error);
