import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getTestServer, stopTestServer, isStrict } from '../helpers/test-server.mjs';
import { createApiClient } from '../helpers/api-client.mjs';

describe('Tier 1: Feature Coverage - R3 Round Sync, Monokuma Alarm & Cryptographic Verdict', () => {
  let baseUrl;
  let client;

  before(async () => {
    baseUrl = await getTestServer();
    client = createApiClient(baseUrl);
    await client.login('28042004333');
    await client.recover('SR-04-271');
  });

  after(() => {
    client.clearSession();
    stopTestServer();
  });

  it('R3-1: Class Trial round synchronization endpoint schema and timing values', async (t) => {
    // Authoritative source: PROJECT.md § Interface Contracts 3. Class Trial Round Synchronization
    const res = await client.getRoundTime();
    if (res.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M3: GET /api/investigation/round-time not yet implemented');
      return;
    }

    assert.equal(res.status, 200, 'Expected 200 OK from round-time');
    assert.equal(typeof res.data.roundActive, 'boolean', 'roundActive must be boolean');
    assert.equal(typeof res.data.roundDurationSeconds, 'number', 'roundDurationSeconds must be numeric');
    assert.equal(typeof res.data.remainingSeconds, 'number', 'remainingSeconds must be numeric');
    assert.equal(typeof res.data.phase, 'string', 'phase must be string');
    assert.ok(res.data.serverTime, 'serverTime timestamp must be present');
    assert.ok(!isNaN(Date.parse(res.data.serverTime)), 'serverTime must be valid ISO date string');
  });

  it('R3-2: Monokuma Alarm threshold configuration (300 seconds / 5 minutes)', async (t) => {
    // Authoritative source: PROJECT.md § Interface Contracts 3 (alarmThresholdSeconds: 300)
    const res = await client.getRoundTime();
    if (res.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M3: GET /api/investigation/round-time not yet implemented');
      return;
    }

    assert.equal(res.status, 200);
    assert.equal(res.data.alarmThresholdSeconds, 300, 'Alarm threshold must be 300 seconds');
  });

  it('R3-3: Cryptographic verdict certificate generation returns formatted code', async (t) => {
    // Authoritative source: PROJECT.md § Interface Contracts 4. Cryptographic Verdict Report
    const res = await client.getVerdictCertificate({
      playerTag: 'Nagito_Komaeda',
      suspectId: 'SUSPECT_03'
    });

    if (res.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M3: POST /api/investigation/verdict-certificate not yet implemented');
      return;
    }

    assert.equal(res.status, 200, 'Expected 200 OK for verdict certificate');
    assert.ok(res.data.verdictCode, 'verdictCode must be returned');
    assert.match(res.data.verdictCode, /^ST-0271-[A-Z0-9]+-[A-Z0-9]+-\d{4}$/, 'verdictCode must follow format ST-0271-XXXX-XXXX-YYYY');
  });

  it('R3-4: Cryptographic verdict certificate contains valid HMAC-SHA256 seal', async (t) => {
    // Authoritative source: PROJECT.md § Interface Contracts 4 (hmacSeal)
    const res = await client.getVerdictCertificate({
      playerTag: 'Nagito_Komaeda',
      suspectId: 'SUSPECT_03'
    });

    if (res.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M3: POST /api/investigation/verdict-certificate not yet implemented');
      return;
    }

    assert.equal(res.status, 200);
    assert.ok(res.data.hmacSeal, 'hmacSeal must be present');
    assert.match(res.data.hmacSeal, /^[a-f0-9]{64}$/i, 'hmacSeal must be a 64-character SHA256 hex digest');
  });

  it('R3-5: Verdict certificate includes ANSI/Markdown formatted Discord report', async (t) => {
    // Authoritative source: PROJECT.md § Interface Contracts 4 (discordReport)
    const res = await client.getVerdictCertificate({
      playerTag: 'Nagito_Komaeda',
      suspectId: 'SUSPECT_03'
    });

    if (res.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M3: POST /api/investigation/verdict-certificate not yet implemented');
      return;
    }

    assert.equal(res.status, 200);
    assert.ok(res.data.discordReport, 'discordReport must be present');
    assert.match(res.data.discordReport, /SHINRI TRIAL|ВЕРДИКТ/i, 'discordReport must have Shinri Trial verdict header');
    assert.ok(
      res.data.discordReport.includes('```ansi') || res.data.discordReport.includes('\u001b['),
      'discordReport must contain ANSI formatted code block'
    );
  });

  it('R3-6: Server verification endpoint validates genuine verdict certificate', async (t) => {
    // Authoritative source: PROJECT.md § Interface Contracts 5. Verify Verdict
    const certRes = await client.getVerdictCertificate({
      playerTag: 'Nagito_Komaeda',
      suspectId: 'SUSPECT_03'
    });

    if (certRes.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M3: POST /api/investigation/verdict-certificate not yet implemented');
      return;
    }

    const { verdictCode, hmacSeal } = certRes.data;

    const verifyRes = await client.verifyVerdict({
      verdictCode,
      hmacSeal
    });

    if (verifyRes.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M3: GET /api/investigation/verify-verdict not yet implemented');
      return;
    }

    assert.equal(verifyRes.status, 200, 'Expected 200 OK from verify-verdict');
    assert.equal(verifyRes.data.valid, true, 'Verification of genuine seal must be valid');
    assert.equal(verifyRes.data.caseId, '0271', 'Case ID must match 0271');
  });
});
