import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getTestServer, stopTestServer } from '../helpers/test-server.mjs';
import { createApiClient, ApiClient } from '../helpers/api-client.mjs';

describe('Tier 1: Feature Coverage - Zero-Leak Security & DevTools Protection', () => {
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

  it('ZL-1: Protected /data endpoint blocks unauthenticated/unrecovered sessions with 403', async () => {
    // Authoritative source: PROJECT.md § Acceptance Criteria Zero-Leak & server/routes/investigation.js:103
    client.clearSession();
    const res = await client.getData();
    assert.equal(res.status, 403, 'Unauthenticated request must be denied with 403');
    assert.match(res.data.error, /ТРЕБУЕТСЯ ВОССТАНОВЛЕНИЕ|ПОВРЕЖДЕНЫ/i);
  });

  it('ZL-2: /data payload completely strips confidential killer answer for unsolved sessions', async () => {
    // Authoritative source: PROJECT.md § Acceptance Criteria & server/routes/investigation.js:114-115
    await client.login('28042004333');
    await client.recover('SR-04-271');

    const res = await client.getData();
    assert.equal(res.status, 200);
    assert.ok(res.data.success);

    const payload = res.data.data;
    assert.equal(payload.isSolved, false, 'Session must not be solved initially');
    assert.equal(payload.killer, undefined, 'Killer identity must NOT be present in payload');

    const rawJson = JSON.stringify(res.data);
    assert.doesNotMatch(rawJson, /"killer":\s*"КИРУМИ"/i, 'Killer name must never appear in raw JSON payload');
  });

  it('ZL-3: Suspect puzzle answers are stripped from /data payload to prevent client-side inspection', async () => {
    // Authoritative source: PROJECT.md § Feature 8 Zero-Leak & server/routes/investigation.js:159-163
    const res = await client.getData();
    assert.equal(res.status, 200);

    const suspects = res.data.data.suspects;
    assert.ok(Array.isArray(suspects) && suspects.length > 0);

    for (const suspect of suspects) {
      if (suspect.puzzle) {
        assert.equal(suspect.puzzle.answers, undefined, `Puzzle answers for suspect ${suspect.id} must NOT be sent to client`);
        assert.ok(suspect.puzzle.question, `Question should still be provided for suspect ${suspect.id}`);
      }
    }

    const rawJson = JSON.stringify(res.data);
    assert.doesNotMatch(rawJson, /"answers":/i, 'Raw JSON must not contain answers key');
  });

  it('ZL-4: Unsolved suspect profiles maintain masked names and roles', async () => {
    // Authoritative source: PROJECT.md § Architecture & case.json maskedName / maskedRole
    const res = await client.getData();
    assert.equal(res.status, 200);

    const suspect03 = res.data.data.suspects.find(s => s.id === '03');
    assert.ok(suspect03, 'Suspect 03 must exist');
    assert.equal(suspect03.isUnlocked, false, 'Suspect 03 must initially be locked');
    assert.match(suspect03.name, /■|К█/i, 'Name must be redacted');
    assert.match(suspect03.role, /■/i, 'Role must be redacted');
    assert.equal(suspect03.realName, undefined, 'realName must not be exposed');
    assert.equal(suspect03.realRole, undefined, 'realRole must not be exposed');
  });

  it('ZL-5: Incorrect killer reconstruction failure message does not reveal target identity', async () => {
    // Authoritative source: server/routes/investigation.js:300 & PROJECT.md
    const res = await client.verifyKiller('НАГИМА_ДЕКОЙ');
    assert.equal(res.status, 423, 'Incorrect guess triggers 423 lockout');
    assert.equal(res.data.success, false);
    assert.doesNotMatch(res.data.error, /КИРУМИ|ТОДЗЁ|ТОДЗЕ/i, 'Lockout error must NOT reveal the correct killer');

    // Reset lock immediately to isolate tests
    ApiClient.resetLocks();
  });
});
