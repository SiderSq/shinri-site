import crypto from 'crypto';

// In-memory session store (with token generation)
const sessions = new Map();

const SECRET_KEY = process.env.SESSION_SECRET || 'shinri-trial-danganronpa-hope-secret-2026';

export function createSessionToken(initialState = 'NEW', ip = '127.0.0.1', playerName = '') {
  const sessionId = crypto.randomBytes(24).toString('hex');
  const sessionData = {
    sessionId,
    state: initialState,
    ip,
    playerName: playerName || '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    unlockedSuspects: []
  };
  sessions.set(sessionId, sessionData);
  return sessionId;
}

export function updateSessionPlayerName(sessionId, playerName) {
  if (!sessionId) return null;
  const session = getSession(sessionId);
  if (session) {
    session.playerName = playerName;
    session.updatedAt = Date.now();
  }
  return session;
}

export function getAllSessions() {
  const list = [];
  for (const [id, s] of sessions.entries()) {
    list.push({
      sessionId: id,
      playerName: s.playerName || 'Без имени',
      ip: s.ip || 'UNKNOWN',
      state: s.state || 'NEW',
      createdAt: s.createdAt || null,
      updatedAt: s.updatedAt || null,
      unlockedSuspectsCount: (s.unlockedSuspects || []).length,
      debateResolved: Boolean(s.debateResolved)
    });
  }
  return list;
}

export function getSession(sessionId) {
  if (!sessionId) return null;
  return sessions.get(sessionId) || null;
}

export function updateSessionState(sessionId, newState) {
  if (!sessionId) return null;
  let session = sessions.get(sessionId);
  if (!session) {
    session = {
      sessionId,
      state: newState,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    sessions.set(sessionId, session);
  } else {
    session.state = newState;
    session.updatedAt = Date.now();
  }
  return session;
}

export function unlockSuspectInSession(sessionId, suspectId) {
  const session = getSession(sessionId);
  if (!session) return [];
  if (!session.unlockedSuspects) session.unlockedSuspects = [];
  if (!session.unlockedSuspects.includes(suspectId)) {
    session.unlockedSuspects.push(suspectId);
    session.updatedAt = Date.now();
  }
  return session.unlockedSuspects;
}

export function getUnlockedSuspectsInSession(sessionId) {
  const session = getSession(sessionId);
  return session?.unlockedSuspects || [];
}

export function clearSession(sessionId) {
  if (sessionId) sessions.delete(sessionId);
}

export function clearAllSessions() {
  sessions.clear();
}


