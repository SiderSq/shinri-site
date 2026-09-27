import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { clearAllLocks } from '../../server/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// Helper to ping server
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

// Helper to spawn a dedicated server on specific port with given env
async function spawnServer(port, envOverrides = {}) {
  const serverScript = path.join(PROJECT_ROOT, 'server', 'server.js');
  const serverProcess = spawn('node', [serverScript], {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      TRUST_PROXY: 'true',
      ...envOverrides
    },
    stdio: 'pipe'
  });

  const candidateUrl = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 150));
    if (await ping(`${candidateUrl}/api/investigation/status`)) {
      ready = true;
      break;
    }
  }

  if (!ready) {
    serverProcess.kill('SIGTERM');
    throw new Error(`Failed to start server on ${candidateUrl}`);
  }

  const kill = () => {
    try {
      serverProcess.kill('SIGTERM');
    } catch {
      // ignore
    }
  };

  return { baseUrl: candidateUrl, process: serverProcess, kill };
}

// HTTP request helper
async function request(baseUrl, endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {})
  };

  let body = options.body;
  if (body && typeof body === 'object') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  return {
    status: res.status,
    ok: res.ok,
    headers: res.headers,
    data
  };
}

describe('Adversarial Stress Testing: Backend Security Endpoints', () => {
  let prodServer;
  let testServer;
  const PROD_PORT = 3280;
  const TEST_PORT = 3281;

  before(async () => {
    clearAllLocks();
    // 1. Server running in production mode (for rate limit cooldown verification)
    prodServer = await spawnServer(PROD_PORT, { NODE_ENV: 'production' });
    // 2. Server running in test mode (for rapid exhaustive boundary and fuzzing verification)
    testServer = await spawnServer(TEST_PORT, { NODE_ENV: 'test' });
  });

  after(() => {
    clearAllLocks();
    if (prodServer) prodServer.kill();
    if (testServer) testServer.kill();
  });

  // =========================================================================
  // SECTION 1: /api/investigation/debate/fire
  // =========================================================================
  describe('1. Endpoint: /api/investigation/debate/fire', () => {

    it('1.1. Rapid spam attack in production mode triggers 429 Too Many Requests rate limit', async () => {
      const baseUrl = prodServer.baseUrl;
      const payload = {
        statementId: 'STMT_02',
        weakPointId: 'WP_02',
        bulletId: 'DOC_01'
      };

      // First shot
      const res1 = await request(baseUrl, '/api/investigation/debate/fire', {
        method: 'POST',
        body: payload
      });
      assert.ok(res1.status === 200 || res1.status === 423, `First shot unexpected status: ${res1.status}`);

      // Rapid second shot (within 50ms, well below 2500ms threshold)
      const res2 = await request(baseUrl, '/api/investigation/debate/fire', {
        method: 'POST',
        body: payload
      });

      assert.equal(res2.status, 429, 'Immediate subsequent shot must be blocked with HTTP 429');
      assert.equal(res2.data.success, false);
      assert.match(res2.data.error, /Перезарядка барабана|2\.5 секунды/i, 'Error message must notify cooldown');
      assert.ok(typeof res2.data.cooldownRemainingMs === 'number', 'cooldownRemainingMs must be returned');
      assert.ok(res2.data.cooldownRemainingMs > 0, 'Cooldown must be positive');
    });

    it('1.2. 5 consecutive wrong bullets trigger 600s lockout (HTTP 423) and terminal lockout state', async () => {
      clearAllLocks();
      const baseUrl = testServer.baseUrl;
      const targetStatement = 'STMT_02';
      const targetWeakPoint = 'WP_02';
      const wrongBullet = 'DOC_01';

      let lastRes;
      const penalties = [];

      for (let shot = 1; shot <= 5; shot++) {
        lastRes = await request(baseUrl, '/api/investigation/debate/fire', {
          method: 'POST',
          body: {
            statementId: targetStatement,
            weakPointId: targetWeakPoint,
            bulletId: wrongBullet
          }
        });

        if (shot < 5) {
          assert.equal(lastRes.status, 200, `Shot ${shot} should return 200 RICOCHET`);
          assert.equal(lastRes.data.verdict, 'RICOCHET');
          assert.equal(lastRes.data.penaltyRemaining, 5 - shot, `Shot ${shot} penalty decrement mismatch`);
          penalties.push(lastRes.data.penaltyRemaining);
        } else {
          // 5th shot must trigger HTTP 423 Locked
          assert.equal(lastRes.status, 423, '5th consecutive wrong bullet must trigger HTTP 423');
          assert.equal(lastRes.data.locked, true, '5th shot must return locked: true');
          assert.equal(lastRes.data.verdict, 'RICOCHET');
          assert.equal(lastRes.data.penaltyRemaining, 0);
          assert.ok(lastRes.data.remainingSeconds >= 590 && lastRes.data.remainingSeconds <= 600,
            `Remaining lockout seconds expected ~600, got ${lastRes.data.remainingSeconds}`);
          assert.match(lastRes.data.error, /ЗАБЛОКИРОВАН НА 10 МИНУТ|истощён/i);
        }
      }

      // Check subsequent request during active lockout
      const postLockRes = await request(baseUrl, '/api/investigation/debate/fire', {
        method: 'POST',
        body: {
          statementId: targetStatement,
          weakPointId: targetWeakPoint,
          bulletId: wrongBullet
        }
      });
      assert.equal(postLockRes.status, 423, 'Subsequent shot during lockout must return HTTP 423');
      assert.equal(postLockRes.data.locked, true);

      // Check global status endpoint verifies lockout
      const statusRes = await request(baseUrl, '/api/investigation/status');
      assert.equal(statusRes.status, 200);
      assert.equal(statusRes.data.locked, true, 'Status endpoint must confirm IP is locked');

      clearAllLocks();
    });

    it('1.3. Malformed payloads and missing IDs are rejected with 400 Bad Request', async () => {
      const baseUrl = testServer.baseUrl;

      const malformedCases = [
        { desc: 'Empty body', body: {} },
        { desc: 'Missing statementId', body: { weakPointId: 'WP_02', bulletId: 'CHAT_01' } },
        { desc: 'Missing weakPointId', body: { statementId: 'STMT_02', bulletId: 'CHAT_01' } },
        { desc: 'Missing bulletId', body: { statementId: 'STMT_02', weakPointId: 'WP_02' } },
        { desc: 'Numeric statementId', body: { statementId: 2, weakPointId: 'WP_02', bulletId: 'CHAT_01' } },
        { desc: 'Array bulletId', body: { statementId: 'STMT_02', weakPointId: 'WP_02', bulletId: ['CHAT_01'] } },
        { desc: 'Object bulletId', body: { statementId: 'STMT_02', weakPointId: 'WP_02', bulletId: { id: 'CHAT_01' } } },
        { desc: 'Boolean weakPointId', body: { statementId: 'STMT_02', weakPointId: true, bulletId: 'CHAT_01' } },
        { desc: 'Null bulletId', body: { statementId: 'STMT_02', weakPointId: 'WP_02', bulletId: null } }
      ];

      for (const tc of malformedCases) {
        const res = await request(baseUrl, '/api/investigation/debate/fire', {
          method: 'POST',
          body: tc.body
        });
        assert.equal(res.status, 400, `Failed for case: ${tc.desc}`);
        assert.equal(res.data.success, false);
        assert.match(res.data.error, /Неверные параметры|Требуются/i);
      }
    });

    it('1.4. Payload injection (SQL, XSS, Command, Buffer overflow) does not cause 500 crash or false positive', async () => {
      const baseUrl = testServer.baseUrl;

      const injectionPayloads = [
        {
          name: 'SQL Injection tautology',
          statementId: 'STMT_02\' OR \'1\'=\'1',
          weakPointId: 'WP_02',
          bulletId: 'CHAT_01\' OR \'1\'=\'1'
        },
        {
          name: 'SQL Drop Table injection',
          statementId: 'STMT_02\'; DROP TABLE cases;--',
          weakPointId: 'WP_02\'; DROP TABLE truth;--',
          bulletId: 'DOC_01\'; DROP TABLE audit;--'
        },
        {
          name: 'XSS script injection',
          statementId: 'STMT_02<script>alert("pwned")</script>',
          weakPointId: 'WP_02<img src=x onerror=alert(1)>',
          bulletId: 'CHAT_01<svg onload=alert(1)>'
        },
        {
          name: 'Command injection metacharacters',
          statementId: 'STMT_02; cat /etc/passwd',
          weakPointId: 'WP_02 && dir C:\\',
          bulletId: 'CHAT_01 | calc.exe'
        },
        {
          name: 'Directory traversal sequences',
          statementId: '../../../../etc/passwd',
          weakPointId: '..\\..\\..\\windows\\system32',
          bulletId: '....//....//truth.json'
        },
        {
          name: 'Oversized payload (10,000 chars)',
          statementId: 'STMT_' + 'A'.repeat(5000),
          weakPointId: 'WP_' + 'B'.repeat(5000),
          bulletId: 'BULLET_' + 'C'.repeat(5000)
        }
      ];

      for (const payload of injectionPayloads) {
        const res = await request(baseUrl, '/api/investigation/debate/fire', {
          method: 'POST',
          body: payload
        });

        assert.notEqual(res.status, 500, `Injection payload [${payload.name}] caused 500 server crash!`);
        assert.equal(res.data.success, false, `Injection payload [${payload.name}] triggered false positive!`);
        assert.notEqual(res.data.verdict, 'TRUTH_BREAK', 'Injected payload must never trigger TRUTH_BREAK');
      }
    });

    it('1.5. Non-existent IDs return handled ricochet rejection without server exception', async () => {
      const baseUrl = testServer.baseUrl;
      const res = await request(baseUrl, '/api/investigation/debate/fire', {
        method: 'POST',
        body: {
          statementId: 'STMT_NON_EXISTENT_99999',
          weakPointId: 'WP_GHOST_8888',
          bulletId: 'BULLET_IMAGINARY_777'
        }
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, false);
      assert.equal(res.data.verdict, 'RICOCHET');
      assert.ok(res.data.message);
    });
  });

  // =========================================================================
  // SECTION 2: /api/investigation/verdict-certificate
  // =========================================================================
  describe('2. Endpoint: /api/investigation/verdict-certificate', () => {

    it('2.1. Empty or whitespace playerTag rejected with 400 Bad Request', async () => {
      const baseUrl = testServer.baseUrl;

      const badTags = ['', '   ', '\t\n', null, undefined, 12345, ['tag'], {}];
      for (const tag of badTags) {
        const res = await request(baseUrl, '/api/investigation/verdict-certificate', {
          method: 'POST',
          body: { playerTag: tag, suspectId: 'SUSPECT_03' }
        });

        assert.equal(res.status, 400, `Failed for playerTag: ${JSON.stringify(tag)}`);
        assert.equal(res.data.success, false);
        assert.match(res.data.error, /playerTag/i);
      }
    });

    it('2.2. Empty or whitespace suspectId rejected with 400 Bad Request', async () => {
      const baseUrl = testServer.baseUrl;

      const badSuspects = ['', '   ', '\t', null, undefined, 999, false, {}];
      for (const suspect of badSuspects) {
        const res = await request(baseUrl, '/api/investigation/verdict-certificate', {
          method: 'POST',
          body: { playerTag: 'Nagito_Komaeda', suspectId: suspect }
        });

        assert.equal(res.status, 400, `Failed for suspectId: ${JSON.stringify(suspect)}`);
        assert.equal(res.data.success, false);
        assert.match(res.data.error, /suspectId/i);
      }
    });

    it('2.3. Falsified / non-existent suspectId rejected with 400 Bad Request', async () => {
      const baseUrl = testServer.baseUrl;

      const fakeSuspects = [
        'SUSPECT_99',
        'IMPOSTOR_HACKER',
        'SUSPECT_00',
        'UNKNOWN_STUDENT_XYZ',
        'SUSPECT_01; DROP TABLE suspects;--'
      ];

      for (const fake of fakeSuspects) {
        const res = await request(baseUrl, '/api/investigation/verdict-certificate', {
          method: 'POST',
          body: { playerTag: 'Nagito_Komaeda', suspectId: fake }
        });

        assert.equal(res.status, 400, `Falsified suspectId [${fake}] was not rejected with 400!`);
        assert.equal(res.data.success, false);
        assert.match(res.data.error, /недействительный идентификатор/i);
      }
    });

    it('2.4. Special characters, ANSI codes, XSS, and Unicode in playerTag handled safely', async () => {
      const baseUrl = testServer.baseUrl;

      const adversarialTags = [
        '<script>alert("xss")</script>',
        'Нагито 🍀 Комаэда (絶望)',
        '\u001b[31;1mCRITICAL_BREACH\u001b[0m',
        'Detective"; DROP TABLE users;--',
        'D'.repeat(2000)
      ];

      for (const tag of adversarialTags) {
        const res = await request(baseUrl, '/api/investigation/verdict-certificate', {
          method: 'POST',
          body: { playerTag: tag, suspectId: 'SUSPECT_03' }
        });

        assert.equal(res.status, 200, `Failed for tag: ${tag.substring(0, 30)}`);
        assert.equal(res.data.success, true);
        assert.ok(res.data.verdictCode, 'verdictCode must be generated');
        assert.ok(res.data.hmacSeal, 'hmacSeal must be generated');
        assert.equal(res.data.hmacSeal.length, 64, 'HMAC seal must be 64-char SHA256 hex');
        assert.ok(res.data.discordReport, 'discordReport must be present');
      }
    });

    it('2.5. Legitimate suspect generates valid certificate with HMAC-SHA256 seal', async () => {
      const baseUrl = testServer.baseUrl;
      const res = await request(baseUrl, '/api/investigation/verdict-certificate', {
        method: 'POST',
        body: { playerTag: 'Nagito_Komaeda', suspectId: 'SUSPECT_03' }
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.match(res.data.verdictCode, /^ST-0271-KIRUMI-[A-F0-9]{4}-\d{4}$/);
      assert.match(res.data.hmacSeal, /^[a-f0-9]{64}$/i);
      assert.match(res.data.discordReport, /ВЕРДИКТ/i);
    });
  });

  // =========================================================================
  // SECTION 3: /api/investigation/verify-verdict
  // =========================================================================
  describe('3. Endpoint: /api/investigation/verify-verdict', () => {
    let genuineCode;
    let genuineSeal;

    before(async () => {
      // Generate genuine certificate to use for tamper testing
      const certRes = await request(testServer.baseUrl, '/api/investigation/verdict-certificate', {
        method: 'POST',
        body: { playerTag: 'Legit_Investigator', suspectId: '03' }
      });
      assert.equal(certRes.status, 200);
      genuineCode = certRes.data.verdictCode;
      genuineSeal = certRes.data.hmacSeal;
    });

    it('3.1. Genuine certificate verifies successfully via both GET and POST', async () => {
      const baseUrl = testServer.baseUrl;

      // GET verification
      const getRes = await request(baseUrl, `/api/investigation/verify-verdict?verdictCode=${genuineCode}&hmacSeal=${genuineSeal}`);
      assert.equal(getRes.status, 200);
      assert.equal(getRes.data.valid, true);
      assert.match(getRes.data.message, /ВЕРДИКТ ПОДТВЕРЖДЁН/i);

      // POST verification
      const postRes = await request(baseUrl, '/api/investigation/verify-verdict', {
        method: 'POST',
        body: { verdictCode: genuineCode, hmacSeal: genuineSeal }
      });
      assert.equal(postRes.status, 200);
      assert.equal(postRes.data.valid, true);
    });

    it('3.2. Forged HMAC-SHA256 signatures are rejected (valid: false, never 500)', async () => {
      const baseUrl = testServer.baseUrl;

      const forgedSeals = [
        '0000000000000000000000000000000000000000000000000000000000000000',
        'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        crypto.randomBytes(32).toString('hex'),
        'INVALID_HEX_SEAL_STRING_ATTACK_1234567890'
      ];

      for (const forged of forgedSeals) {
        const res = await request(baseUrl, `/api/investigation/verify-verdict?verdictCode=${genuineCode}&hmacSeal=${forged}`);
        assert.notEqual(res.status, 500, 'Forged seal must not trigger 500 error');
        assert.equal(res.status, 200);
        assert.equal(res.data.valid, false, `Forged seal [${forged}] unexpectedly validated!`);
        assert.match(res.data.message, /не совпадает|сфальсифицирован/i);
      }
    });

    it('3.3. Bit-flip attack on HMAC seal rejects verification (valid: false)', async () => {
      const baseUrl = testServer.baseUrl;

      // Flip first character
      const flippedFirst = (genuineSeal[0] === 'a' ? 'b' : 'a') + genuineSeal.slice(1);
      const res1 = await request(baseUrl, `/api/investigation/verify-verdict?verdictCode=${genuineCode}&hmacSeal=${flippedFirst}`);
      assert.equal(res1.status, 200);
      assert.equal(res1.data.valid, false, 'Flipped first byte of seal must fail verification');

      // Flip last character
      const flippedLast = genuineSeal.slice(0, -1) + (genuineSeal.slice(-1) === 'a' ? 'b' : 'a');
      const res2 = await request(baseUrl, `/api/investigation/verify-verdict?verdictCode=${genuineCode}&hmacSeal=${flippedLast}`);
      assert.equal(res2.status, 200);
      assert.equal(res2.data.valid, false, 'Flipped last byte of seal must fail verification');

      // Flip middle character
      const mid = Math.floor(genuineSeal.length / 2);
      const flippedMid = genuineSeal.slice(0, mid) + (genuineSeal[mid] === 'a' ? 'b' : 'a') + genuineSeal.slice(mid + 1);
      const res3 = await request(baseUrl, `/api/investigation/verify-verdict?verdictCode=${genuineCode}&hmacSeal=${flippedMid}`);
      assert.equal(res3.status, 200);
      assert.equal(res3.data.valid, false, 'Flipped middle byte of seal must fail verification');
    });

    it('3.4. Tampered verdict codes fail verification (valid: false, never 500)', async () => {
      const baseUrl = testServer.baseUrl;

      const tamperedCodes = [
        genuineCode.replace('ST-0271', 'ST-9999'), // Tampered case number
        genuineCode.replace('ST-', 'FAKE-'),       // Tampered prefix
        genuineCode.replace('KIRUMI', 'MAZDA'),    // Tampered suspect name
        genuineCode.slice(0, -4) + '1999',         // Tampered year
        'ST-0271-KIRUMI-FFFF-2026',                // Non-existent certificate code
        'MALFORMED_CODE_WITHOUT_DASHES',           // Malformed format
        'ST-0271-KIRUMI'                           // Shortened format
      ];

      for (const tampered of tamperedCodes) {
        const res = await request(baseUrl, `/api/investigation/verify-verdict?verdictCode=${encodeURIComponent(tampered)}&hmacSeal=${genuineSeal}`);
        assert.notEqual(res.status, 500, `Tampered code [${tampered}] triggered 500 exception!`);
        assert.equal(res.status, 200);
        assert.equal(res.data.valid, false, `Tampered code [${tampered}] unexpectedly passed verification!`);
      }
    });

    it('3.5. Missing parameters to /verify-verdict rejected with 400 Bad Request', async () => {
      const baseUrl = testServer.baseUrl;

      const testCases = [
        '/api/investigation/verify-verdict',
        `/api/investigation/verify-verdict?verdictCode=${genuineCode}`,
        `/api/investigation/verify-verdict?hmacSeal=${genuineSeal}`,
        '/api/investigation/verify-verdict?verdictCode=&hmacSeal='
      ];

      for (const ep of testCases) {
        const res = await request(baseUrl, ep);
        assert.equal(res.status, 400, `Endpoint [${ep}] must return 400 Bad Request`);
        assert.equal(res.data.valid, false);
      }

      // POST with missing fields
      const postRes = await request(baseUrl, '/api/investigation/verify-verdict', {
        method: 'POST',
        body: {}
      });
      assert.equal(postRes.status, 400);
      assert.equal(postRes.data.valid, false);
    });
  });

  // =========================================================================
  // SECTION 4: /api/investigation/sectors
  // =========================================================================
  describe('4. Endpoint: /api/investigation/sectors', () => {

    it('4.1. Parameter fuzzing on ?sector= (SQLi, Command Injection, Traversal) handled gracefully', async () => {
      const baseUrl = testServer.baseUrl;

      const fuzzedQueries = [
        "A' OR '1'='1",
        "A' UNION SELECT 1,2,3--",
        "'; DROP TABLE sectors;--",
        "A; cat /etc/passwd",
        "A | dir",
        "../../../../etc/passwd",
        "..%2F..%2F..%2Fwinnt",
        "A%00%27",
        "A<script>alert(1)</script>",
        "UNKNOWN_SECTOR_XYZ",
        "99999",
        "null",
        "undefined",
        "A".repeat(4000)
      ];

      for (const q of fuzzedQueries) {
        const res = await request(baseUrl, `/api/investigation/sectors?sector=${encodeURIComponent(q)}`);
        assert.notEqual(res.status, 500, `Fuzzed query [${q.substring(0, 30)}] triggered 500 error!`);
        assert.equal(res.status, 200, `Fuzzed query [${q.substring(0, 30)}] returned unexpected status ${res.status}`);
        assert.equal(res.data.success, true);
        assert.ok(res.data.sectors, 'sectors must still be returned');
        assert.ok(res.data.sectors.A && res.data.sectors.B && res.data.sectors.C, 'Sectors A, B, C must exist');
        assert.ok(Array.isArray(res.data.skudLogs), 'skudLogs must be an array');
      }
    });

    it('4.2. Zero Data Leakage: /sectors payload never exposes culprit identity, secret, or truthTable', async () => {
      const baseUrl = testServer.baseUrl;

      const res = await request(baseUrl, '/api/investigation/sectors');
      assert.equal(res.status, 200);

      const rawJson = JSON.stringify(res.data);

      // Verify zero sensitive data leakage in raw payload
      assert.doesNotMatch(rawJson, /"truthTable"/i, 'truthTable must NEVER be leaked in sectors payload');
      assert.doesNotMatch(rawJson, /"recoveryKey"/i, 'recoveryKey must NEVER be leaked in sectors payload');
      assert.doesNotMatch(rawJson, /"isGuilty":\s*true/i, 'isGuilty flag must NOT be present in sectors payload');
      assert.doesNotMatch(rawJson, /"culprit"/i, 'culprit flag must NOT be present in sectors payload');

      // Verify sector structures
      const sectors = res.data.sectors;
      for (const key of ['A', 'B', 'C']) {
        const s = sectors[key];
        assert.ok(s.id, `Sector ${key} missing id`);
        assert.ok(s.status, `Sector ${key} missing status`);
        assert.ok(Array.isArray(s.doors), `Sector ${key} doors missing`);
        assert.ok(Array.isArray(s.sensors), `Sector ${key} sensors missing`);
        assert.ok(Array.isArray(s.cameras), `Sector ${key} cameras missing`);

        // Check each camera glitch flag is strictly boolean
        for (const cam of s.cameras) {
          assert.equal(typeof cam.glitch, 'boolean', `Camera ${cam.id} glitch must be boolean`);
        }
      }

      // Verify СКУД logs do not reveal unmasked holder without recovered session
      for (const log of res.data.skudLogs) {
        if (log.cardId === 'CARD-AR883') {
          assert.doesNotMatch(log.holder, /Кируми Тодзё/, 'Unauthenticated /sectors must not unmask CARD-AR883 holder name');
        }
      }
    });
  });
});
