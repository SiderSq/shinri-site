import { clearAllLocks } from '../../../server/storage.js';

export class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.cookies = {};
    this.sessionId = null;
    this.customHeaders = {};
  }

  setSessionId(id) {
    this.sessionId = id;
  }

  setHeader(name, value) {
    this.customHeaders[name] = value;
  }

  clearSession() {
    this.cookies = {};
    this.sessionId = null;
  }

  static resetLocks() {
    try {
      clearAllLocks();
    } catch {
      // ignore
    }
  }

  _parseCookies(response) {
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      const parts = setCookie.split(';');
      for (const part of parts) {
        const [rawKey, rawVal] = part.split('=');
        if (rawKey && rawVal) {
          const key = rawKey.trim();
          if (key === 'shinri_session') {
            this.cookies[key] = rawVal.trim();
            this.sessionId = rawVal.trim();
          }
        }
      }
    }
  }

  _buildCookieHeader() {
    return Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      Accept: 'application/json',
      ...this.customHeaders,
      ...(options.headers || {})
    };

    if (options.body && typeof options.body === 'object') {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    const cookieHeader = this._buildCookieHeader();
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }
    if (this.sessionId && !headers['x-session-id']) {
      headers['x-session-id'] = this.sessionId;
    }

    const res = await fetch(url, {
      ...options,
      headers
    });

    this._parseCookies(res);

    let json = null;
    const text = await res.text();
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    return {
      status: res.status,
      ok: res.ok,
      headers: res.headers,
      data: json
    };
  }

  async get(path, headers = {}) {
    return this.request(path, { method: 'GET', headers });
  }

  async post(path, body = {}, headers = {}) {
    return this.request(path, { method: 'POST', body, headers });
  }

  // --- Specialized Endpoints ---

  async login(code = '28042004333') {
    const res = await this.post('/api/auth/login', { code });
    if (res.data?.sessionId) {
      this.sessionId = res.data.sessionId;
    }
    return res;
  }

  async recover(key = 'SR-04-271') {
    const res = await this.post('/api/investigation/recover', { key });
    if (res.data?.sessionId) {
      this.sessionId = res.data.sessionId;
    }
    return res;
  }

  async getStatus() {
    return this.get('/api/investigation/status');
  }

  async getData() {
    return this.get('/api/investigation/data');
  }

  async unlockSuspect(suspectId, answer) {
    return this.post('/api/investigation/unlock-suspect', { suspectId, answer });
  }

  async verifyKiller(answer) {
    return this.post('/api/investigation/verify-killer', { answer });
  }

  async resetSession() {
    const res = await this.post('/api/investigation/reset-session', {});
    this.clearSession();
    return res;
  }

  // R1: Map & СКУД Telemetry
  async getSectors() {
    return this.get('/api/investigation/sectors');
  }

  // R2: Non-Stop Debate Firing
  async fireDebateBullet({ statementId, weakPointId, bulletId }) {
    return this.post('/api/investigation/debate/fire', {
      statementId,
      weakPointId,
      bulletId
    });
  }

  // R3: Round Time Synchronization
  async getRoundTime() {
    return this.get('/api/investigation/round-time');
  }

  // R3: Cryptographic Verdict Certificate
  async getVerdictCertificate({ playerTag = 'Nagito_Komaeda', suspectId = 'SUSPECT_03' } = {}) {
    return this.post('/api/investigation/verdict-certificate', {
      playerTag,
      suspectId
    });
  }

  // R3: Verify Verdict
  async verifyVerdict(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/api/investigation/verify-verdict?${query}`);
  }
}

export function createApiClient(baseUrl) {
  return new ApiClient(baseUrl);
}
