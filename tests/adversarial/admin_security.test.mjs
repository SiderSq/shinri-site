import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import adminRouter from '../../server/routes/admin.js';

describe('Admin Panel Security & Convenience Tests', () => {
  let app;
  let server;
  let baseUrl;
  let adminToken = '';

  before(async () => {
    app = express();
    app.use(express.json({ limit: '10mb' }));
    app.use('/api/admin', adminRouter);

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('ADM-01: Admin login rejects wrong password', async () => {
    const res = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrong_password_123' })
    });

    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  test('ADM-02: Admin login succeeds with new password sidershope333', async () => {
    const res = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'sidershope333' })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.token, 'Token must be issued');
    adminToken = data.token;
  });

  test('ADM-03: Protected admin route requires valid token', async () => {
    const resWithoutToken = await fetch(`${baseUrl}/api/admin/case`);
    assert.equal(resWithoutToken.status, 401);

    const resWithToken = await fetch(`${baseUrl}/api/admin/case`, {
      headers: { 'x-admin-token': adminToken }
    });
    assert.equal(resWithToken.status, 200);
    const data = await resWithToken.json();
    assert.equal(data.success, true);
  });

  test('ADM-04: Full case preset import endpoint (/case/import-full) saves valid scenario', async () => {
    const testPreset = {
      title: 'ТЕСТОВЫЙ СЦЕНАРИЙ ДЛЯ GMOD',
      subtitle: 'Быстрый раунд на сервере Shinri Trial',
      status: 'РАССЛЕДОВАНИЕ (INVESTIGATION)'
    };

    const res = await fetch(`${baseUrl}/api/admin/case/import-full`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken
      },
      body: JSON.stringify(testPreset)
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.title, 'ТЕСТОВЫЙ СЦЕНАРИЙ ДЛЯ GMOD');
  });

  test('ADM-05: Upload screenshot endpoint saves base64 image from Ctrl+V', async () => {
    // 1x1 transparent PNG in base64
    const sampleBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    const res = await fetch(`${baseUrl}/api/admin/upload-screenshot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken
      },
      body: JSON.stringify({
        title: 'Улика: Окровавленный нож (Ctrl+V)',
        time: '21:35',
        tag: 'Орудие преступления',
        camera: 'Камера Нагито (GMod)',
        desc: 'Снимок места преступления',
        imageBase64: sampleBase64,
        filename: 'clipboard_evidence.png'
      })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.media.customImageUrl.startsWith('/uploads/'));
  });
});
