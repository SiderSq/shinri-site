import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.SHINRI_DATA_DIR || path.join(__dirname, 'data');

const CASE_FILE = path.join(DATA_DIR, 'case.json');
const LOCKS_FILE = path.join(DATA_DIR, 'locks.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function safeRead(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) {
      safeWrite(filePath, fallback);
      return fallback;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return fallback;
  }
}

function safeWrite(filePath, data) {
  try {
    const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).substring(7)}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    // fallback direct write if rename fails on some Windows locks
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (writeErr) {
      console.error(`Direct write failed for ${filePath}:`, writeErr);
    }
  }
}

export function getCase() {
  return safeRead(CASE_FILE, {});
}

export function saveCase(caseData) {
  safeWrite(CASE_FILE, caseData);
}

export function getLocks() {
  const locks = safeRead(LOCKS_FILE, {});
  const now = Date.now();
  let changed = false;

  // Prune expired locks
  for (const ip in locks) {
    if (locks[ip].lockedUntil && locks[ip].lockedUntil < now) {
      delete locks[ip];
      changed = true;
    }
  }

  if (changed) {
    safeWrite(LOCKS_FILE, locks);
  }

  return locks;
}

export function isIpLocked(ip) {
  if (!ip) return { locked: false, remainingSeconds: 0 };
  const locks = getLocks();
  const lock = locks[ip];
  if (!lock) return { locked: false, remainingSeconds: 0 };

  const now = Date.now();
  if (lock.lockedUntil > now) {
    const remainingSeconds = Math.ceil((lock.lockedUntil - now) / 1000);
    return {
      locked: true,
      remainingSeconds,
      lockedUntil: lock.lockedUntil,
      reason: lock.reason || 'НЕВЕРНАЯ РЕКОНСТРУКЦИЯ',
      attempts: lock.attempts || 1
    };
  }

  // Expired
  delete locks[ip];
  safeWrite(LOCKS_FILE, locks);
  return { locked: false, remainingSeconds: 0 };
}

export function lockIp(ip, reason = 'НЕВЕРНАЯ РЕКОНСТРУКЦИЯ', durationSeconds = 600) {
  if (!ip) return;
  const locks = getLocks();
  const now = Date.now();
  const currentAttempts = (locks[ip]?.attempts || 0) + 1;
  const lockedUntil = now + durationSeconds * 1000;

  locks[ip] = {
    lockedUntil,
    reason,
    attempts: currentAttempts,
    lockedAt: new Date(now).toISOString()
  };

  safeWrite(LOCKS_FILE, locks);
  addAudit(ip, 'IP_LOCKED', `Блокировка на ${durationSeconds} сек. Причина: ${reason} (Попытка #${currentAttempts})`);
  return { lockedUntil, remainingSeconds: durationSeconds };
}

export function unlockIp(ip) {
  if (!ip) return false;
  const locks = getLocks();
  if (locks[ip]) {
    delete locks[ip];
    safeWrite(LOCKS_FILE, locks);
    addAudit(ip, 'IP_UNLOCKED', 'Администратор снял блокировку с IP адреса.');
    return true;
  }
  return false;
}

export function clearAllLocks() {
  safeWrite(LOCKS_FILE, {});
  addAudit('ADMIN', 'ALL_LOCKS_CLEARED', 'Администратор очистил все активные блокировки IP.');
}

export function getAudit() {
  return safeRead(AUDIT_FILE, []);
}

export function addAudit(ip, action, details, playerName = null) {
  const audit = getAudit();
  audit.unshift({
    id: `AUDIT_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    time: new Date().toISOString(),
    ip: ip || 'UNKNOWN',
    playerName: playerName || null,
    action,
    details
  });

  // Keep last 300 logs
  if (audit.length > 300) {
    audit.length = 300;
  }

  safeWrite(AUDIT_FILE, audit);
}
