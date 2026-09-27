import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getTestServer, stopTestServer, isStrict } from '../helpers/test-server.mjs';
import { createApiClient, ApiClient } from '../helpers/api-client.mjs';

describe('Tier 1: Feature Coverage - R2 Non-Stop Debate & Truth Bullets', () => {
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

  it('R2-1: Successful Truth Bullet shot produces TRUTH_BREAK verdict and counter-statement', async (t) => {
    // Authoritative source: PROJECT.md § Interface Contracts 2. Zero-Leak Debate Verification
    const payload = {
      statementId: 'STMT_02',
      weakPointId: 'WP_02',
      bulletId: 'CHAT_01'
    };

    const res = await client.fireDebateBullet(payload);
    if (res.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M2: POST /api/investigation/debate/fire not yet implemented');
      return;
    }

    assert.equal(res.status, 200, 'Expected 200 OK for debate fire');
    assert.equal(res.data.success, true, 'Shot should be successful');
    assert.equal(res.data.verdict, 'TRUTH_BREAK', 'Verdict must be TRUTH_BREAK');
    assert.ok(res.data.counterStatement, 'Must return counterStatement');
    assert.match(res.data.counterStatement, /21:03|алиби|сектор C/i, 'CounterStatement should cite contradictory evidence');
    assert.equal(res.data.nextStage, 'DEBATE_RESOLVED', 'Next stage must be DEBATE_RESOLVED');
  });

  it('R2-2: Mismatched Truth Bullet shot produces RICOCHET verdict and penalty', async (t) => {
    // Authoritative source: PROJECT.md § Interface Contracts 2 (Failure/Ricochet)
    const payload = {
      statementId: 'STMT_02',
      weakPointId: 'WP_02',
      bulletId: 'DOC_01' // Wrong evidence bullet
    };

    const res = await client.fireDebateBullet(payload);
    if (res.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M2: POST /api/investigation/debate/fire not yet implemented');
      return;
    }

    assert.equal(res.status, 200, 'Expected 200 OK with ricochet verdict');
    assert.equal(res.data.success, false, 'Shot should fail');
    assert.equal(res.data.verdict, 'RICOCHET', 'Verdict must be RICOCHET');
    assert.ok(res.data.message, 'Ricochet must return informative hint/message');
    assert.equal(typeof res.data.penaltyRemaining, 'number', 'penaltyRemaining must be numeric');
  });

  it('R2-3: Firing at wrong Weak Point produces RICOCHET rejection', async (t) => {
    // Authoritative source: PROJECT.md § Interface Contracts 2
    const payload = {
      statementId: 'STMT_01',
      weakPointId: 'WP_01',
      bulletId: 'CHAT_01'
    };

    const res = await client.fireDebateBullet(payload);
    if (res.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M2: POST /api/investigation/debate/fire not yet implemented');
      return;
    }

    assert.equal(res.status, 200);
    assert.equal(res.data.success, false);
    assert.equal(res.data.verdict, 'RICOCHET');
  });

  it('R2-4: Successful TRUTH_BREAK unlocks contradiction clue artifact', async (t) => {
    // Authoritative source: PROJECT.md § Interface Contracts 2 (unlockedClue)
    const payload = {
      statementId: 'STMT_02',
      weakPointId: 'WP_02',
      bulletId: 'CHAT_01'
    };

    const res = await client.fireDebateBullet(payload);
    if (res.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M2: POST /api/investigation/debate/fire not yet implemented');
      return;
    }

    assert.equal(res.status, 200);
    assert.equal(res.data.unlockedClue, 'CLUE_MAID_CONTRADICTION', 'Expected CLUE_MAID_CONTRADICTION unlocked');
  });

  it('R2-5: Multiple alternative evidence bullets verify bullet specificity (no false positives)', async (t) => {
    // Authoritative source: PROJECT.md Feature 5 Rotary Cylinder & Evidence Mapping
    const nonMatchingBullets = ['DOC_03', 'DOC_04', 'LOG_01', 'MEDIA_02'];

    for (const bulletId of nonMatchingBullets) {
      const res = await client.fireDebateBullet({
        statementId: 'STMT_02',
        weakPointId: 'WP_02',
        bulletId
      });

      if (res.status === 404 && !isStrict()) {
        t.skip('Pending Milestone M2: POST /api/investigation/debate/fire not yet implemented');
        return;
      }

      assert.equal(res.data.success, false, `Bullet ${bulletId} should not trigger TRUTH_BREAK`);
      assert.equal(res.data.verdict, 'RICOCHET');
    }
  });

  it('R2-6: Consecutive ricochet penalties decrement properly', async (t) => {
    // Authoritative source: PROJECT.md § Feature 8 Rate-limited with anti-brute-force lockout
    const res1 = await client.fireDebateBullet({
      statementId: 'STMT_02',
      weakPointId: 'WP_02',
      bulletId: 'DOC_01'
    });

    if (res1.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M2: POST /api/investigation/debate/fire not yet implemented');
      return;
    }

    const p1 = res1.data.penaltyRemaining;

    const res2 = await client.fireDebateBullet({
      statementId: 'STMT_02',
      weakPointId: 'WP_02',
      bulletId: 'DOC_01'
    });

    const p2 = res2.data.penaltyRemaining;
    assert.ok(p2 < p1, `Subsequent penalty ${p2} must be less than previous ${p1}`);
  });
});
