import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getTestServer, stopTestServer, isStrict } from '../helpers/test-server.mjs';
import { createApiClient, ApiClient } from '../helpers/api-client.mjs';

describe('Tier 2: Boundary & Corner Cases - R2 Non-Stop Debate Firing', () => {
  let baseUrl;
  let client;

  before(async () => {
    ApiClient.resetLocks();
    baseUrl = await getTestServer();
    client = createApiClient(baseUrl);
    await client.login('28042004333');
    await client.recover('SR-04-271');
  });

  after(() => {
    ApiClient.resetLocks();
    client.clearSession();
    stopTestServer();
  });

  it('B2-1: Empty JSON payload to /debate/fire rejected with 400 Bad Request', async (t) => {
    // Authoritative source: PROJECT.md § Interface Contracts 2 (Required fields)
    const res = await client.post('/api/investigation/debate/fire', {});
    if (res.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M2: POST /api/investigation/debate/fire not yet implemented');
      return;
    }

    assert.equal(res.status, 400, 'Empty payload must return 400 Bad Request');
    assert.equal(res.data.success, false);
  });

  it('B2-2: Missing bulletId in firing payload rejected with 400 Bad Request', async (t) => {
    // Authoritative source: PROJECT.md § Interface Contracts 2
    const res = await client.post('/api/investigation/debate/fire', {
      statementId: 'STMT_02',
      weakPointId: 'WP_02'
    });
    if (res.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M2: POST /api/investigation/debate/fire not yet implemented');
      return;
    }

    assert.equal(res.status, 400, 'Missing bulletId must return 400');
    assert.equal(res.data.success, false);
  });

  it('B2-3: Missing weakPointId in firing payload rejected with 400 Bad Request', async (t) => {
    // Authoritative source: PROJECT.md § Interface Contracts 2
    const res = await client.post('/api/investigation/debate/fire', {
      statementId: 'STMT_02',
      bulletId: 'CHAT_01'
    });
    if (res.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M2: POST /api/investigation/debate/fire not yet implemented');
      return;
    }

    assert.equal(res.status, 400, 'Missing weakPointId must return 400');
    assert.equal(res.data.success, false);
  });

  it('B2-4: Non-existent statementId or bulletId returns handled error/ricochet (no 500 crash)', async (t) => {
    // Authoritative source: PROJECT.md Robustness requirements
    const res = await client.fireDebateBullet({
      statementId: 'NON_EXISTENT_STMT_999',
      weakPointId: 'WP_999',
      bulletId: 'NON_EXISTENT_BULLET_999'
    });
    if (res.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M2: POST /api/investigation/debate/fire not yet implemented');
      return;
    }

    assert.notEqual(res.status, 500, 'Unknown IDs must not cause unhandled 500 exception');
    assert.ok(res.status === 400 || (res.status === 200 && res.data.success === false));
  });

  it('B2-5: Anti-brute-force penalty decrement down to zero triggers terminal lockout', async (t) => {
    // Authoritative source: PROJECT.md Feature 8 & Line 16 Rate-limited with anti-brute-force lockout
    let lockedOut = false;

    for (let i = 0; i < 7; i++) {
      const res = await client.fireDebateBullet({
        statementId: 'STMT_02',
        weakPointId: 'WP_02',
        bulletId: 'DOC_01' // Wrong bullet repeatedly
      });

      if (res.status === 404 && !isStrict()) {
        t.skip('Pending Milestone M2: POST /api/investigation/debate/fire not yet implemented');
        return;
      }

      if (res.status === 423 || res.data?.penaltyRemaining === 0) {
        lockedOut = true;
        break;
      }
    }

    assert.ok(lockedOut, 'Repeated failed shots must exhaust penalty and trigger lockout or 0 penalty');
    ApiClient.resetLocks();
  });

  it('B2-6: Injection / meta-characters in bulletId sanitized without code evaluation error', async (t) => {
    // Adversarial verification: Encoding & Escaping integrity
    const adversarialPayload = {
      statementId: 'STMT_02\'; DROP TABLE clues;--',
      weakPointId: 'WP_02<script>alert("xss")</script>',
      bulletId: 'CHAT_01\' OR \'1\'=\'1'
    };

    const res = await client.fireDebateBullet(adversarialPayload);
    if (res.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M2: POST /api/investigation/debate/fire not yet implemented');
      return;
    }

    assert.notEqual(res.status, 500, 'SQL/Script injection strings must not cause server crash');
    assert.equal(res.data.success, false, 'Injected payload must not accidentally trigger TRUTH_BREAK');
  });
});
