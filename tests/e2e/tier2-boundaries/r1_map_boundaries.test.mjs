import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getTestServer, stopTestServer, isStrict } from '../helpers/test-server.mjs';
import { createApiClient } from '../helpers/api-client.mjs';

describe('Tier 2: Boundary & Corner Cases - R1 Tactical Map & СКУД', () => {
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

  it('B1-1: Request with unknown sector query parameter is handled without crashing', async (t) => {
    // Authoritative source: PROJECT.md § Interface Contracts 1
    const res = await client.get('/api/investigation/sectors?sector=NON_EXISTENT_Z');
    if (res.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M1: GET /api/investigation/sectors not yet implemented');
      return;
    }

    assert.ok(res.status === 200 || res.status === 400 || res.status === 404, 'Must return handled status, not 500');
    assert.notEqual(res.status, 500, 'Server must never crash with 500 on unexpected query parameter');
  });

  it('B1-2: Request with unusual/corrupted headers does not trigger 500 unhandled exception', async (t) => {
    // Authoritative source: PROJECT.md Robustness requirements
    const res = await client.request('/api/investigation/sectors', {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/plain, */*',
        'X-Corrupted-Telemetry': '%%%$$$###@@@!~`',
        'X-Sector-Filter': 'A; DROP TABLE sectors; --'
      }
    });

    if (res.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M1: GET /api/investigation/sectors not yet implemented');
      return;
    }

    assert.notEqual(res.status, 500, 'Malformed headers must not crash server');
  });

  it('B1-3: Sector endpoints return consistent structure with all three sectors (A, B, C)', async (t) => {
    // Authoritative source: PROJECT.md § Interface Contracts 1
    const res = await client.getSectors();
    if (res.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M1: GET /api/investigation/sectors not yet implemented');
      return;
    }

    assert.equal(res.status, 200);
    const sectors = res.data.sectors;
    assert.ok(sectors, 'Sectors dictionary must be returned');
    assert.ok(sectors.A && sectors.B && sectors.C, 'All sectors A, B, and C must be present');
    assert.equal(Object.keys(sectors).length, 3, 'Exactly 3 sectors must be configured for the archival complex');
  });

  it('B1-4: Camera glitch state boolean flag strictly holds boolean primitive', async (t) => {
    // Authoritative source: PROJECT.md § Interface Contracts 1 (CAM_04 glitch: true)
    const res = await client.getSectors();
    if (res.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M1: GET /api/investigation/sectors not yet implemented');
      return;
    }

    assert.equal(res.status, 200);
    const cam04 = res.data.sectors.C.cameras.find(c => c.id === 'CAM_04');
    assert.ok(cam04, 'CAM_04 must exist');
    assert.strictEqual(cam04.glitch, true, 'glitch flag must strictly be boolean true, not string or number');
  });

  it('B1-5: Concurrent bursts to sector endpoint maintain data integrity and responsiveness', async (t) => {
    // Authoritative source: PROJECT.md Acceptance Criteria (smooth UI/UX, no latency)
    const requests = Array.from({ length: 10 }, () => client.getSectors());
    const responses = await Promise.all(requests);

    for (const res of responses) {
      if (res.status === 404 && !isStrict()) {
        t.skip('Pending Milestone M1: GET /api/investigation/sectors not yet implemented');
        return;
      }
      assert.equal(res.status, 200, 'All concurrent requests must return 200 OK');
      assert.ok(res.data.sectors.A && res.data.sectors.B && res.data.sectors.C);
    }
  });
});
