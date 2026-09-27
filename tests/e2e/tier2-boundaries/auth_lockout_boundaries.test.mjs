import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getTestServer, stopTestServer } from '../helpers/test-server.mjs';
import { createApiClient, ApiClient } from '../helpers/api-client.mjs';

describe('Tier 2: Boundary & Corner Cases - Authentication & IP Lockout Enforcement', () => {
  let baseUrl;
  let client;

  before(async () => {
    ApiClient.resetLocks();
    baseUrl = await getTestServer();
    client = createApiClient(baseUrl);
  });

  after(() => {
    ApiClient.resetLocks();
    client.clearSession();
    stopTestServer();
  });

  it('B4-1: Empty or whitespace access code rejected with 400 Bad Request', async () => {
    // Authoritative source: server/routes/auth.js:12-14
    const res = await client.login('');
    assert.equal(res.status, 400, 'Blank access code must return 400');
    assert.equal(res.data.success, false);
    assert.match(res.data.error, /обязателен/i);
  });

  it('B4-2: Non-matching access code rejected with 401 Unauthorized', async () => {
    // Authoritative source: server/routes/auth.js:46-49
    const res = await client.login('INVALID_CODE_99999');
    assert.equal(res.status, 401, 'Invalid access code must return 401');
    assert.equal(res.data.success, false);
    assert.match(res.data.error, /ОШИБКА ДОСТУПА/i);
  });

  it('B4-3: Empty recovery key rejected with 400 Bad Request', async () => {
    // Authoritative source: server/routes/investigation.js:43-45
    const res = await client.recover('');
    assert.equal(res.status, 400, 'Empty recovery key must return 400');
    assert.equal(res.data.success, false);
    assert.match(res.data.error, /не указан/i);
  });

  it('B4-4: Incorrect killer reconstruction submission enforces 600s lockout (HTTP 423)', async () => {
    // Authoritative source: server/routes/investigation.js:291-301
    await client.login('28042004333');
    await client.recover('SR-04-271');

    const res = await client.verifyKiller('ХАДЗИМЕ_НЕВЕРНЫЙ');
    assert.equal(res.status, 423, 'Incorrect guess must trigger HTTP 423 Locked');
    assert.equal(res.data.locked, true, 'Response must indicate locked: true');
    assert.ok(res.data.remainingSeconds > 0 && res.data.remainingSeconds <= 600, 'Lockout must be ~600 seconds');
    assert.match(res.data.error, /ЗАБЛОКИРОВАН/i);
  });

  it('B4-5: Subsequent requests during active lockout are blocked with remaining countdown', async () => {
    // Authoritative source: server/routes/investigation.js:94-100
    const res = await client.getData();
    assert.equal(res.status, 423, 'Active lockout must block investigation access with 423');
    assert.equal(res.data.locked, true);
    assert.ok(res.data.remainingSeconds > 0);

    // Reset lock to restore normal environment
    ApiClient.resetLocks();
  });
});
