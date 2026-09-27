import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { getTestServer, stopTestServer, isStrict } from '../helpers/test-server.mjs';
import { createApiClient } from '../helpers/api-client.mjs';

describe('Tier 1: Feature Coverage - R1 Tactical Map, СКУД Telemetry & CCTV', () => {
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

  it('R1-1: Sector A (Server Room) schema, status, and telemetry verification', async (t) => {
    // Authoritative source: PROJECT.md § Interface Contracts 1. Tactical Map API
    const res = await client.getSectors();
    if (res.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M1: GET /api/investigation/sectors not yet implemented');
      return;
    }

    assert.equal(res.status, 200, 'Expected 200 OK from /api/investigation/sectors');
    assert.ok(res.data?.sectors?.A, 'Sector A must be defined');

    const sectorA = res.data.sectors.A;
    assert.equal(sectorA.id, 'A', 'Sector ID must be "A"');
    assert.match(sectorA.name, /Сектор A|Серверная/i, 'Sector A name must identify Server Room');
    assert.equal(sectorA.status, 'ONLINE', 'Sector A status must be ONLINE');
    assert.ok(Array.isArray(sectorA.doors), 'Sector A doors must be an array');
    assert.ok(sectorA.doors.some(d => d.id === 'DOOR_ROOM_A'), 'Sector A must include DOOR_ROOM_A');
    assert.ok(Array.isArray(sectorA.sensors), 'Sector A sensors must be an array');
    assert.ok(sectorA.sensors.some(s => s.type === 'motion'), 'Sector A must have motion sensor');
    assert.ok(Array.isArray(sectorA.cameras), 'Sector A cameras must be an array');
    assert.ok(sectorA.cameras.some(c => c.id === 'CAM_01'), 'Sector A must have camera CAM_01');
  });

  it('R1-2: Sector B (Workshop) schema, status, and sensor telemetry verification', async (t) => {
    // Authoritative source: PROJECT.md § Interface Contracts 1. Tactical Map API
    const res = await client.getSectors();
    if (res.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M1: GET /api/investigation/sectors not yet implemented');
      return;
    }

    assert.equal(res.status, 200, 'Expected 200 OK from /api/investigation/sectors');
    assert.ok(res.data?.sectors?.B, 'Sector B must be defined');

    const sectorB = res.data.sectors.B;
    assert.equal(sectorB.id, 'B', 'Sector ID must be "B"');
    assert.match(sectorB.name, /Сектор B|Мастерская/i, 'Sector B name must identify Workshop');
    assert.equal(sectorB.status, 'ALERT', 'Sector B status must be ALERT');
    assert.ok(Array.isArray(sectorB.doors), 'Sector B doors must be an array');
    assert.ok(sectorB.doors.some(d => d.id === 'DOOR_WORKSHOP'), 'Sector B must include DOOR_WORKSHOP');
    assert.ok(Array.isArray(sectorB.sensors), 'Sector B sensors must be an array');
    assert.ok(sectorB.sensors.some(s => s.type === 'thermal'), 'Sector B must have thermal sensor');
    assert.ok(sectorB.cameras.some(c => c.id === 'CAM_02'), 'Sector B must have camera CAM_02');
  });

  it('R1-3: Sector C (Archive Crime Scene) schema, sealed door, and CAM-04 glitch state', async (t) => {
    // Authoritative source: PROJECT.md § Interface Contracts 1. Tactical Map API
    const res = await client.getSectors();
    if (res.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M1: GET /api/investigation/sectors not yet implemented');
      return;
    }

    assert.equal(res.status, 200, 'Expected 200 OK from /api/investigation/sectors');
    assert.ok(res.data?.sectors?.C, 'Sector C must be defined');

    const sectorC = res.data.sectors.C;
    assert.equal(sectorC.id, 'C', 'Sector ID must be "C"');
    assert.match(sectorC.name, /Сектор C|Архив/i, 'Sector C name must identify Archive');
    assert.equal(sectorC.status, 'CRIME_SCENE', 'Sector C status must be CRIME_SCENE');
    assert.ok(Array.isArray(sectorC.doors), 'Sector C doors must be an array');
    assert.ok(sectorC.doors.some(d => d.id === 'DOOR_ROOM_C' && d.status === 'SEALED'), 'DOOR_ROOM_C must be SEALED');
    
    // Verify CAM-04 glitch state
    assert.ok(Array.isArray(sectorC.cameras), 'Sector C cameras must be an array');
    const cam04 = sectorC.cameras.find(c => c.id === 'CAM_04');
    assert.ok(cam04, 'Sector C must include camera CAM_04');
    assert.equal(cam04.status, 'SIGNAL_LOST', 'CAM_04 status must be SIGNAL_LOST');
    assert.equal(cam04.glitch, true, 'CAM_04 glitch flag must be true');
  });

  it('R1-4: СКУД Access Logs telemetry structure and record completeness', async (t) => {
    // Authoritative source: PROJECT.md § Interface Contracts 1. Tactical Map API (skudLogs)
    const res = await client.getSectors();
    if (res.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M1: GET /api/investigation/sectors not yet implemented');
      return;
    }

    assert.equal(res.status, 200, 'Expected 200 OK from /api/investigation/sectors');
    assert.ok(Array.isArray(res.data?.skudLogs), 'skudLogs must be an array');
    assert.ok(res.data.skudLogs.length > 0, 'skudLogs must contain access records');

    const logEntry = res.data.skudLogs[0];
    assert.ok(logEntry.id, 'Log entry must have id');
    assert.ok(logEntry.sector, 'Log entry must have sector');
    assert.ok(logEntry.timestamp, 'Log entry must have timestamp');
    assert.ok(logEntry.cardId, 'Log entry must have cardId');
    assert.ok(logEntry.holder, 'Log entry must have holder');
    assert.ok(logEntry.action, 'Log entry must have action');
  });

  it('R1-5: Environmental & thermal presence sensor telemetry string formats', async (t) => {
    // Authoritative source: PROJECT.md § Interface Contracts 1. Tactical Map API (sensors.telemetry)
    const res = await client.getSectors();
    if (res.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M1: GET /api/investigation/sectors not yet implemented');
      return;
    }

    assert.equal(res.status, 200, 'Expected 200 OK from /api/investigation/sectors');
    const sectors = res.data?.sectors || {};
    for (const [key, sector] of Object.entries(sectors)) {
      for (const sensor of sector.sensors || []) {
        assert.ok(sensor.type, `Sensor in sector ${key} must have type`);
        assert.ok(sensor.status, `Sensor in sector ${key} must have status`);
        assert.ok(sensor.telemetry, `Sensor in sector ${key} must provide telemetry readings`);
        assert.match(sensor.telemetry, /°C|сигнал|датчик|Гц|Hz|частота/i, `Sensor telemetry in sector ${key} must include measurement unit or reading`);
      }
    }
  });

  it('R1-6: Zero-Leak verification on Sector Map payload (No suspect culpability in raw telemetry)', async (t) => {
    // Authoritative source: PROJECT.md § Acceptance Criteria & Feature 8 Zero-Leak
    const res = await client.getSectors();
    if (res.status === 404 && !isStrict()) {
      t.skip('Pending Milestone M1: GET /api/investigation/sectors not yet implemented');
      return;
    }

    const payloadString = JSON.stringify(res.data);
    assert.doesNotMatch(payloadString, /"isKiller":\s*true/i, 'Sector payload must NOT leak isKiller flag');
    assert.doesNotMatch(payloadString, /"culprit":/i, 'Sector payload must NOT declare culprit');
    assert.doesNotMatch(payloadString, /"guilty":\s*true/i, 'Sector payload must NOT declare guilty flag');
  });
});
