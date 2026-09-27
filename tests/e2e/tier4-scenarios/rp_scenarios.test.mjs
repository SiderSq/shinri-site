import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getTestServer, stopTestServer, isStrict } from '../helpers/test-server.mjs';
import { createApiClient, ApiClient } from '../helpers/api-client.mjs';

describe('Tier 4: Real-World RP Application Scenarios (End-to-End)', () => {
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

  it('RP Scenario 1: The Absolute Hope Deduction (Complete Happy Path Investigation)', async (t) => {
    // 1. Terminal Boot: Login with Academy Access Code
    const loginRes = await client.login('28042004333');
    assert.equal(loginRes.status, 200, 'Login failed');
    assert.equal(loginRes.data.state, 'AUTHENTICATED');

    // 2. Archive Recovery: Restore system database with snapshot key
    const recoverRes = await client.recover('SR-04-271');
    assert.equal(recoverRes.status, 200, 'Recovery failed');
    assert.equal(recoverRes.data.state, 'RECOVERED');

    // 3. Tactical Map: Inspect Archive Sector C crime scene & CCTV CAM-04 glitch
    const sectorRes = await client.getSectors();
    if (sectorRes.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M1: GET /api/investigation/sectors not yet implemented');
      return;
    }
    assert.equal(sectorRes.status, 200);
    assert.equal(sectorRes.data.sectors.C.status, 'CRIME_SCENE');
    const cam04 = sectorRes.data.sectors.C.cameras.find(c => c.id === 'CAM_04');
    assert.ok(cam04 && cam04.glitch === true, 'CAM-04 must show glitch state');

    // 4. Dossier Decryption: Decode Suspect #03 (Kirumi Tojo) via Monopad ticket AR-883
    const unlockRes = await client.unlockSuspect('03', 'AR-883');
    assert.equal(unlockRes.status, 200);
    assert.equal(unlockRes.data.realName, 'Кируми Тодзё');

    // 5. Non-Stop Debate: Confront false alibi with intercepted CHAT_01
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
    assert.equal(debateRes.data.verdict, 'TRUTH_BREAK');
    assert.equal(debateRes.data.nextStage, 'DEBATE_RESOLVED');

    // 6. Round Clock: Check Class Trial remaining countdown
    const roundRes = await client.getRoundTime();
    if (roundRes.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M3: GET /api/investigation/round-time not yet implemented');
      return;
    }
    assert.equal(roundRes.status, 200);
    assert.ok(roundRes.data.roundActive === true);

    // 7. Culprit Reconstruction: Submit definitive culprit identification
    const solveRes = await client.verifyKiller('КИРУМИ');
    assert.equal(solveRes.status, 200);
    assert.equal(solveRes.data.solved, true);

    // 8. Cryptographic Verdict: Generate tamper-evident HMAC certificate & Discord report
    const certRes = await client.getVerdictCertificate({
      playerTag: 'Nagito_Komaeda',
      suspectId: 'SUSPECT_03'
    });
    if (certRes.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M3: POST /api/investigation/verdict-certificate not yet implemented');
      return;
    }
    assert.equal(certRes.status, 200);
    assert.match(certRes.data.verdictCode, /^ST-0271-/);
    assert.equal(certRes.data.hmacSeal.length, 64);
    assert.ok(certRes.data.discordReport.includes('SHINRI TRIAL'));
  });

  it('RP Scenario 2: The Despair Trap (Intruder Brute-Force Lockout & Recovery)', async () => {
    // 1. Intruder boots terminal and recovers database
    await client.login('28042004333');
    await client.recover('SR-04-271');

    // 2. Intruder attempts repeated incorrect killer reconstructions
    const failRes = await client.verifyKiller('ИНТРУДЕР_ОШИБКА');
    assert.equal(failRes.status, 423, 'Must trigger Monokuma terminal lockout (423)');
    assert.equal(failRes.data.locked, true);

    // 3. Subsequent attempts to read case data are locked out
    const blockedRes = await client.getData();
    assert.equal(blockedRes.status, 423);

    // 4. Status reflects lock state
    const statusRes = await client.getStatus();
    assert.equal(statusRes.status, 200);
    assert.equal(statusRes.data.locked, true);
    assert.ok(statusRes.data.remainingSeconds > 0);

    // 5. Admin clears lock, restoring investigator access
    ApiClient.resetLocks();
    const restoredStatus = await client.getStatus();
    assert.equal(restoredStatus.data.locked, false);
  });

  it('RP Scenario 3: Class Trial Countdown Rush & Klaxon Threshold Verification', async (t) => {
    await client.login('28042004333');
    await client.recover('SR-04-271');

    const roundRes = await client.getRoundTime();
    if (roundRes.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M3: GET /api/investigation/round-time not yet implemented');
      return;
    }

    assert.equal(roundRes.status, 200);
    assert.equal(roundRes.data.alarmThresholdSeconds, 300, 'Alarm threshold is 300s (5 minutes)');
    assert.ok(roundRes.data.roundDurationSeconds > 0);
    assert.ok(roundRes.data.serverTime);
  });

  it('RP Scenario 4: Game Master & Discord Bot Seal Verification Audit', async (t) => {
    await client.login('28042004333');
    await client.recover('SR-04-271');

    // 1. Investigator generates authentic verdict
    const certRes = await client.getVerdictCertificate({
      playerTag: 'Nagito_Komaeda',
      suspectId: 'SUSPECT_03'
    });

    if (certRes.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M3: POST /api/investigation/verdict-certificate not yet implemented');
      return;
    }

    const { verdictCode, hmacSeal } = certRes.data;

    // 2. Discord bot verifies authentic verdict code and seal
    const verifyValid = await client.verifyVerdict({ verdictCode, hmacSeal });
    if (verifyValid.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M3: GET /api/investigation/verify-verdict not yet implemented');
      return;
    }
    assert.equal(verifyValid.data.valid, true, 'Genuine seal must pass verification');
    assert.equal(verifyValid.data.caseId, '0271');

    // 3. Deceptive player attempts forging a seal
    const forgedSeal = hmacSeal.substring(0, 60) + 'beef';
    const verifyForged = await client.verifyVerdict({ verdictCode, hmacSeal: forgedSeal });
    assert.equal(verifyForged.data.valid, false, 'Forged seal must be detected and rejected');
  });
});
