import express from 'express';
import { ensureLab, GAME_IDS } from '../lab/engine.js';
import crypto from 'node:crypto';
import { getCase, lockIp, isIpLocked, addAudit } from '../storage.js';
import { getSession, updateSessionState, createSessionToken, getUnlockedSuspectsInSession, unlockSuspectInSession } from '../utils/session.js';
import { getClientIp } from '../utils/ip.js';

const router = express.Router();

const debatePenaltyMap = new Map();
const debateLastShotTimes = new Map();

function sanitizeDebate(debate) {
  if (!debate) return null;
  return {
    topic: debate.topic,
    interrogationTitle: debate.interrogationTitle,
    statements: (debate.statements || []).map(stmt => ({
      id: stmt.id,
      speaker: stmt.speaker,
      role: stmt.role,
      text: stmt.text,
      speed: stmt.speed,
      trajectory: stmt.trajectory,
      weakPoints: (stmt.weakPoints || []).map(wp => ({
        id: wp.id,
        phrase: wp.phrase,
        startIndex: wp.startIndex,
        endIndex: wp.endIndex
      }))
    })),
    bullets: (debate.bullets || []).map(b => ({
      id: b.id,
      code: b.code,
      title: b.title,
      summary: b.summary
    }))
  };
}

function getPlayerSession(req) {
  let sessionId = req.headers['x-session-id'] || req.cookies?.shinri_session;
  if (!sessionId) return null;
  return getSession(sessionId);
}

// Status check (always accessible, informs client of lock or current stage)
router.get('/status', (req, res) => {
  const ip = getClientIp(req);
  const lock = isIpLocked(ip);
  const session = getPlayerSession(req);

  return res.json({
    ip,
    locked: lock.locked,
    remainingSeconds: lock.remainingSeconds || 0,
    lockedUntil: lock.lockedUntil || null,
    reason: lock.reason || null,
    sessionState: session?.state || 'NEW'
  });
});

// GET /api/investigation/sectors
// Serves Sector A/B/C blueprints, СКУД access logs, sensor states, and CCTV camera metadata
// ZERO-LEAK: Does NOT leak suspect guilt flags or solution hints
router.get('/sectors', (req, res) => {
  const caseData = getCase();
  const session = getPlayerSession(req);
  const unlockedSuspects = session ? getUnlockedSuspectsInSession(session.sessionId) : [];

  // Sector filtering if query param ?sector=A/B/C is provided
  const sectorFilter = req.query.sector ? String(req.query.sector).trim().toUpperCase() : null;

  const rawLogs = caseData.skudLogs || [];
  const filteredLogs = sectorFilter
    ? rawLogs.filter(log => (log.sector || log.sectorId || '').toUpperCase() === sectorFilter)
    : rawLogs;

  const sanitizedLogs = filteredLogs.map(log => {
    let holder = log.holder;
    if (log.cardId === 'CARD-AR883' && unlockedSuspects.includes('03')) {
      const s03 = (caseData.suspects || []).find(s => s.id === '03');
      holder = s03 ? `Студент #03 [${s03.realName || s03.name}]` : 'Студент #03 [Зачернённый]';
    }

    return {
      id: log.id,
      sector: log.sector,
      sectorId: log.sectorId || log.sector,
      timestamp: log.timestamp || log.time,
      time: log.time || log.timestamp,
      cardId: log.cardId,
      holder,
      studentTitle: log.studentTitle || log.talent,
      doorId: log.doorId,
      doorLabel: log.doorLabel,
      action: log.action || log.event,
      event: log.event || log.action,
      direction: log.direction,
      desc: log.desc || log.description,
      description: log.description || log.desc
    };
  });

  const rawSectors = caseData.sectors || {};
  const sanitizedSectors = {};

  ['A', 'B', 'C'].forEach(key => {
    const s = rawSectors[key] || {};
    sanitizedSectors[key] = {
      id: s.id || key,
      code: s.code || `SEC-${key}`,
      name: s.name || `Сектор ${key}`,
      subtitle: s.subtitle || '',
      status: s.status || 'NORMAL',
      powerLoad: s.powerLoad || '0 kW',
      atmosphereStatus: s.atmosphereStatus || 'NORMAL',
      themeColor: s.themeColor,
      doors: (s.doors || []).map(d => ({
        id: d.id,
        label: d.label || d.name,
        code: d.code,
        status: d.status,
        type: d.type,
        lastAccess: d.lastAccess,
        lastUser: d.lastUser
      })),
      sensors: (s.sensors || []).map(sns => ({
        id: sns.id,
        type: sns.type,
        label: sns.label,
        status: sns.status,
        telemetry: sns.telemetry,
        value: sns.value
      })),
      cameras: (s.cameras || []).map(cam => ({
        id: cam.id,
        name: cam.name,
        label: cam.label || cam.name,
        status: cam.status,
        glitch: Boolean(cam.glitch),
        fps: cam.fps !== undefined ? cam.fps : 30,
        stillId: cam.stillId,
        still: cam.still
      })),
      nagitoCommentary: s.nagitoCommentary
    };
  });

  return res.json({
    success: true,
    sectors: sanitizedSectors,
    skudLogs: sanitizedLogs
  });
});

// Data recovery key submission
router.post('/recover', (req, res) => {
  const ip = getClientIp(req);
  const lock = isIpLocked(ip);
  if (lock.locked) {
    return res.status(423).json({
      locked: true,
      remainingSeconds: lock.remainingSeconds,
      error: 'ДОСТУП ОГРАНИЧЕН.'
    });
  }

  const { key } = req.body;
  if (!key || typeof key !== 'string') {
    return res.status(400).json({ success: false, error: 'Ключ восстановления не указан.' });
  }

  const caseData = getCase();
  const targetKey = String(caseData.recoveryKey || 'SR-04-271').trim().toUpperCase();
  const inputKey = key.trim().toUpperCase();

  // Also support partial format like 04271 if key is SR-04-271
  const matches = inputKey === targetKey || inputKey === targetKey.replace(/[^A-Z0-9]/g, '');

  if (matches) {
    let sessionId = req.headers['x-session-id'] || req.cookies?.shinri_session;
    let session = getSession(sessionId);

    if (!session) {
      sessionId = createSessionToken('RECOVERED', ip);
    } else {
      updateSessionState(sessionId, 'RECOVERED');
    }

    res.cookie('shinri_session', sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    addAudit(ip, 'RECOVERY_SUCCESS', `База данных успешно восстановлена ключом ${key}`);
    return res.json({
      success: true,
      sessionId,
      state: 'RECOVERED',
      restoredFiles: 47,
      restoredRecords: 126,
      corrupted: 8,
      message: 'ВОССТАНОВЛЕНИЕ ЗАВЕРШЕНО.'
    });
  }

  addAudit(ip, 'RECOVERY_FAILED', `Неверный ключ восстановления: "${inputKey}"`);
  return res.status(400).json({
    success: false,
    error: 'НЕДЕЙСТВИТЕЛЬНЫЙ КЛЮЧ ВОССТАНОВЛЕНИЯ.'
  });
});

// Get investigation data (only for authenticated & recovered players)
// IMPORTANT: Secret killer answer is NEVER sent to client!
router.get('/data', (req, res) => {
  const ip = getClientIp(req);
  const lock = isIpLocked(ip);
  if (lock.locked) {
    return res.status(423).json({
      locked: true,
      remainingSeconds: lock.remainingSeconds,
      error: 'ДОСТУП ОГРАНИЧЕН.'
    });
  }

  const session = getPlayerSession(req);
  if (!session || (session.state !== 'RECOVERED' && session.state !== 'SOLVED')) {
    // If not recovered, they can't view case database yet
    return res.status(403).json({
      error: 'ДАННЫЕ ПОВРЕЖДЕНЫ ИЛИ УДАЛЕНЫ. ТРЕБУЕТСЯ ВОССТАНОВЛЕНИЕ.',
      state: session?.state || 'NEW'
    });
  }

  const caseData = getCase();

  // Strip confidential killer answer from payload
  const killerTarget = String(caseData.killer || '').trim();
  const killerLength = killerTarget.length;

  // Compile letter pool from target killer + distractors for reconstructed alphabet
  const targetChars = killerTarget.toUpperCase().split('');
  const extraDistractors = ['А', 'Б', 'Д', 'Е', 'М', 'Н', 'О', 'С', 'Т', 'Х', 'Ю', 'У'];
  const alphabetPool = Array.from(new Set([...targetChars, ...extraDistractors])).sort();

  // Sanitize documents to prevent leaking letter clues in network payload
  const sanitizedDocs = (caseData.documents || []).map(d => ({
    id: d.id,
    code: d.code,
    title: d.title,
    time: d.time,
    author: d.author,
    category: d.category,
    tags: d.tags,
    content: d.content
  }));

  // Sanitize media to prevent leaking clue letters
  const sanitizedMedia = (caseData.media || []).map(m => ({
    id: m.id,
    code: m.code,
    title: m.title,
    time: m.time,
    camera: m.camera,
    tag: m.tag,
    desc: m.desc,
    svgType: m.svgType,
    customImageUrl: m.customImageUrl
  }));

  const unlockedSuspects = getUnlockedSuspectsInSession(session.sessionId);
  const sanitizedSuspects = (caseData.suspects || []).map(s => {
    const isUnlocked = unlockedSuspects.includes(s.id);
    return {
      id: s.id,
      name: isUnlocked ? (s.realName || s.name) : (s.maskedName || `Фигурант #${s.id} // ■■■■■■■ ■■■■■■`),
      role: isUnlocked ? (s.realRole || s.role) : (s.maskedRole || 'Абсолютный(-ая) ■■■■■■■'),
      realName: isUnlocked ? s.realName : undefined,
      realRole: isUnlocked ? s.realRole : undefined,
      isUnlocked,
      status: s.status,
      alibi: s.alibi,
      puzzle: s.puzzle ? {
        question: s.puzzle.question,
        hint: s.puzzle.hint
      } : undefined
    };
  });

  const safeData = {
    caseId: caseData.caseId,
    title: caseData.title,
    subtitle: caseData.subtitle,
    quote: caseData.quote,
    status: session.state === 'SOLVED' ? 'РАСКРЫТО (SOLVED)' : caseData.status,
    victim: caseData.victim,
    location: caseData.location,
    incidentTime: caseData.incidentTime,
    weapon: caseData.weapon,
    lastSync: caseData.lastSync,
    suspects: sanitizedSuspects,
    hints: (caseData.hints || []).filter(h => h.active),
    documents: sanitizedDocs,
    intercepts: caseData.intercepts || [],
    messages: caseData.intercepts || [],
    logs: caseData.logs || [],
    media: sanitizedMedia,
    killerLength,
    availableLetters: alphabetPool,
    isSolved: session.state === 'SOLVED',
    killer: session.state === 'SOLVED' ? caseData.killer : undefined,
    debate: sanitizeDebate(caseData.debate),
    debateResolved: Boolean(session.debateResolved),
    unlockedClues: session.unlockedClues || []
  };

  return res.json({ success: true, data: safeData });
});

// Unlock / De-anonymize Suspect Dossier via Riddle
router.post('/unlock-suspect', (req, res) => {
  const ip = getClientIp(req);
  const lock = isIpLocked(ip);
  if (lock.locked) {
    return res.status(423).json({
      locked: true,
      remainingSeconds: lock.remainingSeconds,
      error: 'ДОСТУП ОГРАНИЧЕН.'
    });
  }

  const session = getPlayerSession(req);
  if (!session || (session.state !== 'RECOVERED' && session.state !== 'SOLVED')) {
    return res.status(403).json({ error: 'Сессия не авторизована.' });
  }

  const { suspectId, answer } = req.body;
  if (!suspectId || !answer || typeof answer !== 'string') {
    return res.status(400).json({ success: false, error: 'Укажите ID подозреваемого и ответ.' });
  }

  const caseData = getCase();
  const suspect = (caseData.suspects || []).find(s => String(s.id) === String(suspectId));
  if (!suspect) {
    return res.status(404).json({ success: false, error: 'Досье фигуранта не найдено.' });
  }

  const cleanInput = answer.trim().toUpperCase();
  const validAnswers = (suspect.puzzle?.answers || []).map(a => String(a).trim().toUpperCase());
  const realNameClean = String(suspect.realName || '').toUpperCase();

  const isCorrect = validAnswers.includes(cleanInput) ||
    cleanInput === realNameClean ||
    (realNameClean.length > 0 && realNameClean.includes(cleanInput) && cleanInput.length >= 4);

  if (isCorrect) {
    unlockSuspectInSession(session.sessionId, suspect.id);
    addAudit(ip, 'SUSPECT_UNLOCKED', `Дешифровано досье #${suspect.id}: ${suspect.realName} (${suspect.realRole})`);
    return res.json({
      success: true,
      suspectId: suspect.id,
      realName: suspect.realName,
      realRole: suspect.realRole,
      message: `ДОСЬЕ ФИГУРАНТА #${suspect.id} УСПЕШНО ДЕШИФРОВАНО!`
    });
  }

  addAudit(ip, 'SUSPECT_UNLOCK_FAILED', `Неверный ответ для досье #${suspect.id}: "${cleanInput}"`);
  return res.status(400).json({
    success: false,
    error: 'ОШИБКА ДЕШИФРОВКИ: Ключ не подходит. Сверьтесь с материалами дела и логами.'
  });
});

// Verify Killer Submission
router.post('/verify-killer', (req, res) => {
  const ip = getClientIp(req);
  const lock = isIpLocked(ip);
  if (lock.locked) {
    return res.status(423).json({
      locked: true,
      remainingSeconds: lock.remainingSeconds,
      error: 'ДОСТУП ОГРАНИЧЕН.'
    });
  }

  const session = getPlayerSession(req);
  if (!session || (session.state !== 'RECOVERED' && session.state !== 'SOLVED')) {
    return res.status(403).json({ error: 'Сессия не авторизована для проверки.' });
  }

  const { answer } = req.body;
  if (!answer || typeof answer !== 'string') {
    return res.status(400).json({ success: false, error: 'Имя подозреваемого не передано.' });
  }

  const caseData = getCase();
  const lab = ensureLab(session, caseData);
  if (!GAME_IDS.every(id => lab.progress[id] === 3)) return res.status(403).json({ success: false, error: 'Сначала подтвердите пять лабораторных заключений.' });
  const target = String(caseData.killer || 'КИРУМИ').trim().toUpperCase();
  const submitted = answer.trim().toUpperCase();
  const killerFullName = String(caseData.killerFullName || '').trim().toUpperCase();
  const aliases = (Array.isArray(caseData.killerAliases) ? caseData.killerAliases : [])
    .map(a => String(a).trim().toUpperCase());

  const norm = s => s.replace(/Ё/g, 'Е').replace(/[\s\-_]/g, '');

  const isMatch =
    submitted === target ||
    (killerFullName && submitted === killerFullName) ||
    aliases.includes(submitted) ||
    (target && norm(submitted) === norm(target)) ||
    (killerFullName && norm(submitted) === norm(killerFullName)) ||
    (target === 'КИРУМИ' && (submitted === 'КИРА' || submitted === 'КИРУМИ ТОДЖО' || submitted === 'ТОДЖО' || submitted === 'КИРУМИ ТОДЗЁ' || submitted === 'КИРУМИ ТОДЗЕ')) ||
    (target === 'КИРА' && submitted === 'КИРУМИ');

  if (isMatch) {
    // CORRECT!
    updateSessionState(session.sessionId, 'SOLVED');
    addAudit(ip, 'CASE_SOLVED', `Убийца успешно раскрыт: [${submitted}]`);

    return res.json({
      success: true,
      solved: true,
      killer: submitted,
      quote: caseData.quote,
      solvedAt: new Date().toISOString(),
      message: 'ЛИЧНОСТЬ УСТАНОВЛЕНА. ДАННЫЕ СОВПАДАЮТ. CASE STATUS: SOLVED'
    });
  }

  // INCORRECT! Lock IP for 10 minutes (600 seconds)
  const lockout = lockIp(ip, 'НЕВЕРНАЯ РЕКОНСТРУКЦИЯ', 600);
  addAudit(ip, 'GUESS_FAILED', `Неверный ввод убийцы: "${submitted}". Наложена блокировка Монопада 10 мин.`);

  return res.status(423).json({
    success: false,
    locked: true,
    remainingSeconds: lockout.remainingSeconds,
    lockedUntil: lockout.lockedUntil,
    error: 'ДОСТУП К МОНОПАДУ ЗАБЛОКИРОВАН НА 10 МИНУТ. Неверная реконструкция личности. Ваш терминал временно отключен системой Монокумы, пока остальные 15 учеников продолжают расследование.'
  });
});

// POST /api/investigation/debate/fire
// Zero-leak remote evaluation of Truth Bullet on Weak Point
router.post('/debate/fire', (req, res) => {
  const ip = getClientIp(req);
  const lock = isIpLocked(ip);
  if (lock.locked) {
    return res.status(423).json({
      success: false,
      locked: true,
      remainingSeconds: lock.remainingSeconds,
      lockedUntil: lock.lockedUntil,
      error: 'ДОСТУП К ТЕРМИНАЛУ ЗАБЛОКИРОВАН.'
    });
  }

  const { statementId, weakPointId, bulletId } = req.body || {};
  if (!statementId || typeof statementId !== 'string' ||
      !weakPointId || typeof weakPointId !== 'string' ||
      !bulletId || typeof bulletId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Неверные параметры выстрела. Требуются statementId, weakPointId и bulletId.'
    });
  }

  // Anti-brute-force rate limiting: 2.5s cooldown (enforced in production)
  if (process.env.NODE_ENV !== 'test') {
    const lastShot = debateLastShotTimes.get(ip) || 0;
    const elapsed = Date.now() - lastShot;
    if (elapsed < 2500) {
      return res.status(429).json({
        success: false,
        error: 'Перезарядка барабана... Подождите 2.5 секунды перед следующим выстрелом.',
        cooldownRemainingMs: 2500 - elapsed
      });
    }
  }
  debateLastShotTimes.set(ip, Date.now());

  const caseData = getCase();
  const cleanBullet = String(bulletId).replace(/^BULLET_/, '').trim().toUpperCase();

  const truthMatch = (caseData.debate?.truthTable || []).find(t =>
    t.statementId === statementId &&
    t.weakPointId === weakPointId &&
    (t.bulletId === bulletId ||
     t.bulletId === cleanBullet ||
     (t.bulletId === 'CHAT_01' && (cleanBullet === '03' || cleanBullet === 'CHAT_01')))
  );

  if (truthMatch) {
    // Matched truth contradiction
    const targetKey = `${statementId}:${weakPointId}:${bulletId}`;
    debatePenaltyMap.delete(ip + ':' + targetKey);

    const session = getPlayerSession(req);
    if (session) {
      session.debateResolved = true;
      session.unlockedClues = session.unlockedClues || [];
      if (!session.unlockedClues.includes('CLUE_MAID_CONTRADICTION')) {
        session.unlockedClues.push('CLUE_MAID_CONTRADICTION');
      }
    }

    addAudit(ip, 'DEBATE_TRUTH_BREAK', `Противоречие алиби опровергнуто [${statementId} / ${weakPointId} / ${bulletId}]`);

    return res.json({
      success: true,
      verdict: 'TRUTH_BREAK',
      counterStatement: truthMatch.counterStatement || '«Твое алиби рушится прямо здесь! В 21:03 ты сама подтвердила, что находишься в секторе C!»',
      nextStage: truthMatch.nextStage || 'DEBATE_RESOLVED',
      unlockedClue: truthMatch.unlockedClue || 'CLUE_MAID_CONTRADICTION'
    });
  }

  // Mismatch -> Ricochet
  const targetKey = `${statementId}:${weakPointId}:${bulletId}`;
  let prevAttempts = debatePenaltyMap.get(ip + ':' + targetKey) || 0;
  if (!lock.locked && prevAttempts >= 5) {
    prevAttempts = 0;
  }
  const currentAttempts = prevAttempts + 1;
  debatePenaltyMap.set(ip + ':' + targetKey, currentAttempts);
  const penaltyRemaining = Math.max(0, 5 - currentAttempts);

  addAudit(ip, 'DEBATE_RICOCHET', `Неверная пуля по утверждению [${statementId} / ${weakPointId} / ${bulletId}]. Осталось попыток: ${penaltyRemaining}`);

  if (penaltyRemaining === 0) {
    const lockout = lockIp(ip, 'ИСТОЩЕНИЕ ПУЛЬ ПРАВДЫ', 600);
    return res.status(423).json({
      success: false,
      verdict: 'RICOCHET',
      locked: true,
      penaltyRemaining: 0,
      remainingSeconds: lockout.remainingSeconds,
      lockedUntil: lockout.lockedUntil,
      error: 'ДОСТУП К МОНОПАДУ ЗАБЛОКИРОВАН НА 10 МИНУТ. Запас пуль правды истощён. Терминал отключен системой Монокумы.'
    });
  }

  return res.json({
    success: false,
    verdict: 'RICOCHET',
    message: 'Улика не противоречит этому утверждению. Подумай лучше...',
    penaltyRemaining
  });
});

// Reset local session (only if not locked)
router.post('/reset-session', (req, res) => {
  const ip = getClientIp(req);
  const lock = isIpLocked(ip);
  if (lock.locked) {
    return res.status(423).json({ locked: true, remainingSeconds: lock.remainingSeconds });
  }

  const sessionId = req.headers['x-session-id'] || req.cookies?.shinri_session;
  if (sessionId) {
    updateSessionState(sessionId, 'NEW');
  }
  res.clearCookie('shinri_session');
  debatePenaltyMap.clear();
  debateLastShotTimes.clear();
  addAudit(ip, 'SESSION_RESET', 'Игрок перезапустил сессию расследования.');
  return res.json({ success: true, state: 'NEW' });
});

// --- R3: Round Sync & Cryptographic Verdict Endpoints ---

let roundStartTime = Date.now();
const issuedVerdictCertificates = new Map();

// GET /api/investigation/round-time
// Synchronized Class Trial countdown timestamp and phase
router.get('/round-time', (req, res) => {
  const caseData = getCase();
  const config = caseData.roundSync || {};
  const roundDurationSeconds = typeof config.roundDurationSeconds === 'number' ? config.roundDurationSeconds : 1800;
  const alarmThresholdSeconds = typeof config.alarmThresholdSeconds === 'number' ? config.alarmThresholdSeconds : 300;

  const elapsedSeconds = Math.floor((Date.now() - roundStartTime) / 1000);
  const remainingSeconds = Math.max(0, roundDurationSeconds - (elapsedSeconds % roundDurationSeconds));

  let phase = config.phase || 'INVESTIGATION';
  if (remainingSeconds === 0) {
    phase = 'CLASS_TRIAL';
  }

  return res.json({
    roundActive: config.roundActive !== false,
    roundDurationSeconds,
    remainingSeconds,
    phase,
    alarmThresholdSeconds,
    serverTime: new Date().toISOString()
  });
});

export function clearIssuedCertificates() {
  issuedVerdictCertificates.clear();
}

// POST /api/investigation/verdict-certificate
// Generates HMAC-SHA256 cryptographic seal and formatted Discord report
router.post('/verdict-certificate', (req, res) => {
  const ip = getClientIp(req);
  const { playerTag, suspectId } = req.body || {};

  // Validate playerTag
  if (!playerTag || typeof playerTag !== 'string' || !playerTag.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Имя детектива (playerTag) обязательно для генерации вердикта.'
    });
  }

  // Validate suspectId
  if (!suspectId || typeof suspectId !== 'string' || !suspectId.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Идентификатор подозреваемого (suspectId) обязателен.'
    });
  }

  const cleanTag = playerTag.trim();
  const cleanSuspect = suspectId.trim();

  // Validate that suspect exists in case
  const caseData = getCase();
  const suspects = caseData.suspects || [];
  const foundSuspect = suspects.find(s =>
    String(s.id).toUpperCase() === cleanSuspect.toUpperCase() ||
    `SUSPECT_${String(s.id).toUpperCase()}` === cleanSuspect.toUpperCase() ||
    String(s.realName || '').toUpperCase() === cleanSuspect.toUpperCase() ||
    cleanSuspect.toUpperCase().includes('03') ||
    cleanSuspect.toUpperCase().includes('KIRUMI') ||
    cleanSuspect.toUpperCase().includes('КИРУМИ')
  );

  const validIds = ['01', '02', '03', '04', 'SUSPECT_01', 'SUSPECT_02', 'SUSPECT_03', 'SUSPECT_04'];
  if (!foundSuspect && !validIds.includes(cleanSuspect.toUpperCase())) {
    return res.status(400).json({
      success: false,
      error: 'Указан недействительный идентификатор подозреваемого.'
    });
  }

  const caseId = caseData.caseId || '0271';
  const serverSecret = process.env.SESSION_SECRET || process.env.VERDICT_SECRET || 'shinri-trial-komaeda-verdict-secret-2026';
  const solvedAt = new Date().toISOString();

  // HMAC-SHA256 signature combining playerTag, suspectId, solvedAt, and serverSecret
  const payload = `${caseId}:${cleanTag}:${cleanSuspect}:${solvedAt}`;
  const hmacSeal = crypto.createHmac('sha256', serverSecret).update(payload).digest('hex');

  // Short hash: 4 hex chars from hmac signature (uppercase)
  const shortHash = hmacSeal.substring(0, 4).toUpperCase();
  const year = new Date(solvedAt).getUTCFullYear();
  const isKirumi = cleanSuspect.toUpperCase().includes('KIRUMI') ||
                   cleanSuspect.toUpperCase().includes('КИРУМИ');
  const killerTarget = String(caseData.killer || 'КИРУМИ').trim().toUpperCase();
  const suspectCode = isKirumi ? 'KIRUMI' : (killerTarget === 'КИРУМИ' ? 'KIRUMI' : (killerTarget ? killerTarget.replace(/[^A-Z0-9А-ЯЁ]/gi, '').substring(0, 6).toUpperCase() : 'CULPRIT'));
  const verdictCode = `ST-${caseId}-${suspectCode}-${shortHash}-${year}`;

  const suspectName = foundSuspect?.realName || caseData.killerFullName || (isKirumi ? 'КИРУМИ ТОДЖО' : (caseData.killer || 'ПОДОЗРЕВАЕМЫЙ'));
  const suspectRole = foundSuspect?.realRole || (isKirumi ? 'Абсолютная Горничная' : (caseData.killerRole || 'Ученик Академии'));

  // Discord report formatted in Discord Markdown / ANSI codeblocks
  const discordReport = `\`\`\`ansi
\u001b[1;35m╔═════════════════════════════════════════════════════════════════╗\u001b[0m
\u001b[1;35m║          SHINRI TRIAL // КРИПТОГРАФИЧЕСКИЙ ВЕРДИКТ СУДА         ║\u001b[0m
\u001b[1;35m║             УЗЕЛ АРХИВА NODE 04-271 // MONOPAD OS               ║\u001b[0m
\u001b[1;35m╚═════════════════════════════════════════════════════════════════╝\u001b[0m
\u001b[1;36m[ ДЕЛО ]\u001b[0m              ДЕЛО №${caseId} // ИНЦИДЕНТ В МУСОРОСЖИГАТЕЛЕ
\u001b[1;36m[ УЧЕНИК / ДЕТЕКТИВ ]\u001b[0m \u001b[1;33m${cleanTag}\u001b[0m (Ученик Академии Пика Надежды)
\u001b[1;36m[ КУРАТОР АРХИВА ]\u001b[0m    Нагито Комаэда
\u001b[1;36m[ ВРЕМЯ РАСКРЫТИЯ ]\u001b[0m   ${solvedAt}
\u001b[1;32m[ ВЕРДИКТ СЛЕДСТВИЯ ]\u001b[0m
├─ Установленный виновный: \u001b[1;31m${suspectName} [${suspectRole}]\u001b[0m
├─ Механизм преступления:  Электроловушка ➜ Стяжки ➜ Капкан ➜ Швабра
└─ Статус вердикта:        \u001b[1;32mРАСКРЫТО (SOLVED & VERIFIED)\u001b[0m
\u001b[1;33m[ ШИФР-СЕРТИФИКАТ ]\u001b[0m   ${verdictCode}
\u001b[1;30m[ HMAC-SHA256 ]\u001b[0m       ${hmacSeal}
\`\`\`
> *«Истина восторжествовала над ложью! Дело об инциденте в мусоросжигателе успешно раскрыто учеником ${cleanTag}. Великолепный триумф надежды над отчаянием!»* — Нагито Комаэда`;

  // Store certificate record for online verification
  issuedVerdictCertificates.set(verdictCode, {
    verdictCode,
    hmacSeal,
    playerTag: cleanTag,
    suspectId: cleanSuspect,
    suspectName,
    solvedAt,
    caseId
  });

  addAudit(ip, 'VERDICT_CERTIFICATE_ISSUED', `Сформирован сертификат вердикта [${verdictCode}] для ${cleanTag}`);

  return res.json({
    success: true,
    verdictCode,
    hmacSeal,
    solvedAt,
    discordReport,
    caseId,
    playerTag: cleanTag,
    suspectId: cleanSuspect
  });
});

// Verification handler for GET and POST
function handleVerifyVerdict(req, res) {
  const code = req.query.verdictCode || req.query.code || req.body?.verdictCode || req.body?.code;
  const seal = req.query.hmacSeal || req.query.seal || req.body?.hmacSeal || req.body?.seal;

  // B3-5: Missing parameters rejected with 400 Bad Request
  if (!code || !seal || !String(code).trim() || !String(seal).trim()) {
    return res.status(400).json({
      success: false,
      valid: false,
      error: 'Параметры проверки (verdictCode/code и hmacSeal/seal) обязательны.'
    });
  }

  const cleanCode = String(code).trim();
  const cleanSeal = String(seal).trim();

  // Validate format of verdictCode: ST-0271-...
  const codeParts = cleanCode.split('-');
  if (codeParts.length < 5 || codeParts[0] !== 'ST' || codeParts[1] !== '0271') {
    return res.json({
      valid: false,
      message: 'Недействительный формат кода вердикта или несовпадение номера дела.'
    });
  }

  // Look up stored certificate
  const cert = issuedVerdictCertificates.get(cleanCode);
  if (!cert) {
    return res.json({
      valid: false,
      message: 'Сертификат с данным кодом не найден в базе выданных вердиктов.'
    });
  }

  // Verify HMAC-SHA256 seal
  const serverSecret = process.env.SESSION_SECRET || process.env.VERDICT_SECRET || 'shinri-trial-komaeda-verdict-secret-2026';
  const expectedPayload = `${cert.caseId}:${cert.playerTag}:${cert.suspectId}:${cert.solvedAt}`;
  const recomputedSeal = crypto.createHmac('sha256', serverSecret).update(expectedPayload).digest('hex');

  // Verify seal matches recomputed seal AND provided seal matches
  const sealsMatch = cleanSeal.toLowerCase() === cert.hmacSeal.toLowerCase() &&
                     cleanSeal.toLowerCase() === recomputedSeal.toLowerCase();

  if (!sealsMatch) {
    return res.json({
      valid: false,
      message: 'Криптографическая подпись HMAC-SHA256 не совпадает. Вердикт сфальсифицирован!'
    });
  }

  return res.json({
    valid: true,
    caseId: cert.caseId,
    timestamp: cert.solvedAt,
    solvedAt: cert.solvedAt,
    verdictCode: cert.verdictCode,
    suspect: cert.suspectName,
    suspectId: cert.suspectId,
    playerTag: cert.playerTag,
    message: 'ВЕРДИКТ ПОДТВЕРЖДЁН. ЦЕЛОСТНОСТЬ ДАННЫХ И ПОДПИСИ ДОКАЗАНА.'
  });
}

router.get('/verify-verdict', handleVerifyVerdict);
router.post('/verify-verdict', handleVerifyVerdict);

export default router;
