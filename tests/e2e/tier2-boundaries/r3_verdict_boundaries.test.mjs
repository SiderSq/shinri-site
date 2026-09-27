import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getTestServer, stopTestServer, isStrict } from '../helpers/test-server.mjs';
import { createApiClient } from '../helpers/api-client.mjs';

describe('Tier 2: Boundary & Corner Cases - R3 Round Sync & Verdict Cryptography', () => {
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

  it('B3-1: Empty playerTag in verdict certificate request rejected with 400', async (t) => {
    // Authoritative source: PROJECT.md § Interface Contracts 4
    const res = await client.getVerdictCertificate({
      playerTag: '   ',
      suspectId: 'SUSPECT_03'
    });

    if (res.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M3: POST /api/investigation/verdict-certificate not yet implemented');
      return;
    }

    assert.equal(res.status, 400, 'Blank playerTag must return 400');
  });

  it('B3-2: Empty suspectId in verdict certificate request rejected with 400', async (t) => {
    // Authoritative source: PROJECT.md § Interface Contracts 4
    const res = await client.getVerdictCertificate({
      playerTag: 'Nagito_Komaeda',
      suspectId: ''
    });

    if (res.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M3: POST /api/investigation/verdict-certificate not yet implemented');
      return;
    }

    assert.equal(res.status, 400, 'Blank suspectId must return 400');
  });

  it('B3-3: Tampered HMAC seal is rejected by verification endpoint (valid: false)', async (t) => {
    // Authoritative source: PROJECT.md § Interface Contracts 5 & Tamper-evident seal
    const certRes = await client.getVerdictCertificate({
      playerTag: 'Nagito_Komaeda',
      suspectId: 'SUSPECT_03'
    });

    if (certRes.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M3: POST /api/investigation/verdict-certificate not yet implemented');
      return;
    }

    const { verdictCode } = certRes.data;
    const fakeSeal = 'deadbeef'.repeat(8); // 64-char forged seal

    const verifyRes = await client.verifyVerdict({
      verdictCode,
      hmacSeal: fakeSeal
    });

    if (verifyRes.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M3: GET /api/investigation/verify-verdict not yet implemented');
      return;
    }

    assert.notEqual(verifyRes.status, 500, 'Forged seal must not crash server');
    assert.equal(verifyRes.data.valid, false, 'Tampered HMAC seal must be rejected as invalid');
  });

  it('B3-4: Tampered verdictCode fails cryptographic signature verification', async (t) => {
    // Authoritative source: PROJECT.md § Interface Contracts 5
    const certRes = await client.getVerdictCertificate({
      playerTag: 'Nagito_Komaeda',
      suspectId: 'SUSPECT_03'
    });

    if (certRes.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M3: POST /api/investigation/verdict-certificate not yet implemented');
      return;
    }

    const { verdictCode, hmacSeal } = certRes.data;
    const tamperedCode = verdictCode.replace('0271', '9999'); // Altered case ID

    const verifyRes = await client.verifyVerdict({
      verdictCode: tamperedCode,
      hmacSeal
    });

    if (verifyRes.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M3: GET /api/investigation/verify-verdict not yet implemented');
      return;
    }

    assert.equal(verifyRes.data.valid, false, 'Tampered verdict code must fail signature verification');
  });

  it('B3-5: Missing parameters to /verify-verdict rejected with 400 Bad Request', async (t) => {
    // Authoritative source: PROJECT.md § Interface Contracts 5
    const verifyRes = await client.verifyVerdict({});

    if (verifyRes.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M3: GET /api/investigation/verify-verdict not yet implemented');
      return;
    }

    assert.equal(verifyRes.status, 400, 'Missing verification parameters must return 400');
  });

  it('B3-6: Countdown timer boundary returns non-negative remainingSeconds and active phase', async (t) => {
    // Authoritative source: PROJECT.md § Interface Contracts 3
    const res = await client.getRoundTime();
    if (res.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M3: GET /api/investigation/round-time not yet implemented');
      return;
    }

    assert.equal(res.status, 200);
    assert.ok(res.data.remainingSeconds >= 0, 'remainingSeconds must never be negative in active response');
    assert.ok(['INVESTIGATION', 'TRIAL_PREP', 'CLASS_TRIAL'].includes(res.data.phase), 'Phase must be valid enum');
  });
});
