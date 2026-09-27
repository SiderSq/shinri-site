import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getTestServer, stopTestServer, isStrict } from '../helpers/test-server.mjs';
import { createApiClient, ApiClient } from '../helpers/api-client.mjs';

describe('Tier 3: Cross-Feature Combinations & State Transitions', () => {
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

  it('XF-1: Pipeline: Recovery -> Data Retrieval -> Sector Map Telemetry Integration', async (t) => {
    // 1. Authenticate with access code
    const authRes = await client.login('28042004333');
    assert.equal(authRes.status, 200);

    // 2. Recover corrupted archive database
    const recRes = await client.recover('SR-04-271');
    assert.equal(recRes.status, 200);
    assert.equal(recRes.data.state, 'RECOVERED');

    // 3. Inspect case metadata
    const dataRes = await client.getData();
    assert.equal(dataRes.status, 200);
    assert.equal(dataRes.data.data.caseId, '0271');

    // 4. Retrieve sector blueprint and verify correlation with crime scene
    const sectorRes = await client.getSectors();
    if (sectorRes.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M1: GET /api/investigation/sectors not yet implemented');
      return;
    }

    assert.equal(sectorRes.status, 200);
    assert.equal(sectorRes.data.sectors.C.status, 'CRIME_SCENE');
    assert.ok(sectorRes.data.sectors.C.doors.some(d => d.status === 'SEALED'));
  });

  it('XF-2: Pipeline: Suspect Dossier Decoding -> Evidence Extraction -> Debate Truth Break', async (t) => {
    await client.login('28042004333');
    await client.recover('SR-04-271');

    // 1. Solve Suspect #03 (Kirumi) puzzle riddle
    const unlockRes = await client.unlockSuspect('03', 'AR-883');
    assert.equal(unlockRes.status, 200);
    assert.equal(unlockRes.data.realName, 'Кируми Тодзё');

    // 2. Fetch updated data and verify de-anonymized profile
    const dataRes = await client.getData();
    const suspect03 = dataRes.data.data.suspects.find(s => s.id === '03');
    assert.equal(suspect03.isUnlocked, true);
    assert.equal(suspect03.name, 'Кируми Тодзё');

    // 3. Fire contradiction Truth Bullet CHAT_01 at Weak Point WP_02
    const debateRes = await client.fireDebateBullet({
      statementId: 'STMT_02',
      weakPointId: 'WP_02',
      bulletId: 'CHAT_01'
    });

    if (debateRes.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M2: POST /api/investigation/debate/fire not yet implemented');
      return;
    }

    assert.equal(debateRes.status, 200);
    assert.equal(debateRes.data.success, true);
    assert.equal(debateRes.data.verdict, 'TRUTH_BREAK');
    assert.equal(debateRes.data.nextStage, 'DEBATE_RESOLVED');
  });

  it('XF-3: Pairwise: Debate Ricochet Miss -> Penalty Deduction -> Session Continuity', async (t) => {
    await client.login('28042004333');
    await client.recover('SR-04-271');

    const debateRes = await client.fireDebateBullet({
      statementId: 'STMT_02',
      weakPointId: 'WP_02',
      bulletId: 'DOC_03' // Incorrect bullet
    });

    if (debateRes.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M2: POST /api/investigation/debate/fire not yet implemented');
      return;
    }

    assert.equal(debateRes.status, 200);
    assert.equal(debateRes.data.verdict, 'RICOCHET');

    // Ensure session state remains intact despite ricochet
    const statusRes = await client.getStatus();
    assert.equal(statusRes.status, 200);
    assert.equal(statusRes.data.locked, false);
  });

  it('XF-4: Pipeline: Culprit Verification -> Solved State Transition -> Killer Exposure', async (t) => {
    await client.login('28042004333');
    await client.recover('SR-04-271');

    // Submit correct killer
    const solveRes = await client.verifyKiller('КИРУМИ');
    assert.equal(solveRes.status, 200);
    assert.equal(solveRes.data.solved, true);
    assert.equal(solveRes.data.killer, 'КИРУМИ');

    // Verify /data now exposes solved state and culprit confirmation
    const dataRes = await client.getData();
    assert.equal(dataRes.status, 200);
    assert.equal(dataRes.data.data.isSolved, true);
    assert.equal(dataRes.data.data.killer, 'КИРУМИ');
  });

  it('XF-5: Pipeline: Solved Case -> Verdict Certificate Generation -> Tamper-Proof GM Verification', async (t) => {
    await client.login('28042004333');
    await client.recover('SR-04-271');
    await client.verifyKiller('КИРУМИ');

    // Generate certificate
    const certRes = await client.getVerdictCertificate({
      playerTag: 'Nagito_Komaeda',
      suspectId: 'SUSPECT_03'
    });

    if (certRes.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M3: POST /api/investigation/verdict-certificate not yet implemented');
      return;
    }

    assert.equal(certRes.status, 200);
    const { verdictCode, hmacSeal } = certRes.data;

    // Verify legitimate seal
    const verifyValid = await client.verifyVerdict({ verdictCode, hmacSeal });
    if (verifyValid.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M3: GET /api/investigation/verify-verdict not yet implemented');
      return;
    }
    assert.equal(verifyValid.data.valid, true);

    // Verify tampered seal fails
    const verifyTampered = await client.verifyVerdict({
      verdictCode,
      hmacSeal: '0123456789abcdef'.repeat(4)
    });
    assert.equal(verifyTampered.data.valid, false);
  });

  it('XF-6: Pipeline: Session Reset Isolation & Re-Lock Verification', async (t) => {
    await client.login('28042004333');
    await client.recover('SR-04-271');

    // Reset session
    const resetRes = await client.resetSession();
    assert.equal(resetRes.status, 200);
    assert.equal(resetRes.data.state, 'NEW');

    // Access to protected data must now be locked out (403)
    const dataRes = await client.getData();
    assert.equal(dataRes.status, 403, 'Reset session must revoke data access until recovered again');
  });
});
