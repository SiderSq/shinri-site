import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getCase,
  saveCase,
  getLocks,
  unlockIp,
  clearAllLocks,
  getAudit,
  addAudit
} from '../storage.js';
import { getClientIp } from '../utils/ip.js';
import { clearAllSessions } from '../utils/session.js';
import { clearIssuedCertificates } from './investigation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'shinri-admin-hope-2026';
const activeAdminTokens = new Set();

// Admin Authentication Middleware
export function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || !activeAdminTokens.has(token)) {
    return res.status(401).json({ error: 'ТРЕБУЮТСЯ ПРАВА АДМИНИСТРАТОРА.' });
  }
  next();
}

// Admin Login
router.post('/login', (req, res) => {
  const ip = getClientIp(req);
  const { password } = req.body;

  if (password === ADMIN_PASSWORD) {
    const token = crypto.randomBytes(32).toString('hex');
    activeAdminTokens.add(token);
    addAudit(ip, 'ADMIN_LOGIN', 'Успешный вход в панель управления куратора.');
    return res.json({ success: true, token, message: 'ДОСТУП В ПАНЕЛЬ КУРАТОРА РАЗРЕШЁН.' });
  }

  addAudit(ip, 'ADMIN_LOGIN_FAIL', 'Неверный пароль администратора.');
  return res.status(401).json({ success: false, error: 'НЕВЕРНЫЙ ПАРОЛЬ АДМИНИСТРАТОРА.' });
});

// Admin Logout
router.post('/logout', requireAdmin, (req, res) => {
  const token = req.headers['x-admin-token'];
  if (token) activeAdminTokens.delete(token);
  res.json({ success: true });
});

// Verify token
router.get('/check-auth', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (token && activeAdminTokens.has(token)) {
    return res.json({ authenticated: true });
  }
  return res.json({ authenticated: false });
});

// GET complete case info (includes secrets)
router.get('/case', requireAdmin, (req, res) => {
  const caseData = getCase();
  res.json({ success: true, data: caseData });
});

// UPDATE case metadata
router.put('/case', requireAdmin, (req, res) => {
  const ip = getClientIp(req);
  const updates = req.body;
  const caseData = getCase();

  const allowedFields = [
    'title',
    'subtitle',
    'accessCode',
    'recoveryKey',
    'killer',
    'victim',
    'location',
    'incidentTime',
    'status',
    'quote',
    'weapon'
  ];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      caseData[field] = updates[field];
    }
  }

  saveCase(caseData);
  addAudit(ip, 'UPDATE_CASE_CONFIG', `Обновлена конфигурация дела. Убийца: ${caseData.killer}, Пароль: ${caseData.accessCode}`);
  res.json({ success: true, data: caseData, message: 'НАСТРОЙКИ ДЕЛА СОХРАНЕНЫ.' });
});

// CRUD: Documents
router.post('/documents', requireAdmin, (req, res) => {
  const caseData = getCase();
  const doc = {
    id: `DOC_${Date.now()}`,
    code: req.body.code || 'DOC_NEW',
    title: req.body.title || 'Новый документ',
    time: req.body.time || '00:00',
    author: req.body.author || 'Неизвестный',
    category: req.body.category || 'Служебные',
    tags: Array.isArray(req.body.tags) ? req.body.tags : [],
    content: req.body.content || '',
    linkedLetter: req.body.linkedLetter || '',
    letterOrder: Number(req.body.letterOrder) || 1,
    letterHint: req.body.letterHint || ''
  };

  caseData.documents = caseData.documents || [];
  caseData.documents.push(doc);
  saveCase(caseData);
  addAudit(getClientIp(req), 'DOC_CREATED', `Создан документ ${doc.code}`);
  res.json({ success: true, document: doc });
});

router.put('/documents/:id', requireAdmin, (req, res) => {
  const caseData = getCase();
  const index = caseData.documents.findIndex(d => d.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Документ не найден.' });

  caseData.documents[index] = { ...caseData.documents[index], ...req.body };
  saveCase(caseData);
  addAudit(getClientIp(req), 'DOC_UPDATED', `Обновлен документ ${req.params.id}`);
  res.json({ success: true, document: caseData.documents[index] });
});

router.delete('/documents/:id', requireAdmin, (req, res) => {
  const caseData = getCase();
  caseData.documents = (caseData.documents || []).filter(d => d.id !== req.params.id);
  saveCase(caseData);
  addAudit(getClientIp(req), 'DOC_DELETED', `Удален документ ${req.params.id}`);
  res.json({ success: true });
});

// CRUD: Messages
router.post('/messages', requireAdmin, (req, res) => {
  const caseData = getCase();
  const chat = {
    id: `CHAT_${Date.now()}`,
    channel: req.body.channel || 'UNKNOWN',
    title: req.body.title || 'Новый чат',
    subtitle: req.body.subtitle || 'Сессия связи',
    messages: Array.isArray(req.body.messages) ? req.body.messages : []
  };

  caseData.messages = caseData.messages || [];
  caseData.messages.push(chat);
  saveCase(caseData);
  addAudit(getClientIp(req), 'CHAT_CREATED', `Создан чат ${chat.title}`);
  res.json({ success: true, chat });
});

router.put('/messages/:id', requireAdmin, (req, res) => {
  const caseData = getCase();
  const index = caseData.messages.findIndex(m => m.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Диалог не найден.' });

  caseData.messages[index] = { ...caseData.messages[index], ...req.body };
  saveCase(caseData);
  addAudit(getClientIp(req), 'CHAT_UPDATED', `Обновлен чат ${req.params.id}`);
  res.json({ success: true, chat: caseData.messages[index] });
});

router.delete('/messages/:id', requireAdmin, (req, res) => {
  const caseData = getCase();
  caseData.messages = (caseData.messages || []).filter(m => m.id !== req.params.id);
  saveCase(caseData);
  addAudit(getClientIp(req), 'CHAT_DELETED', `Удален чат ${req.params.id}`);
  res.json({ success: true });
});

// CRUD: Logs
router.post('/logs', requireAdmin, (req, res) => {
  const caseData = getCase();
  const log = {
    id: `LOG_${Date.now()}`,
    time: req.body.time || '00:00:00',
    event: req.body.event || 'EVENT',
    source: req.body.source || 'SYSTEM',
    category: req.body.category || 'system',
    desc: req.body.desc || ''
  };

  caseData.logs = caseData.logs || [];
  caseData.logs.push(log);
  saveCase(caseData);
  addAudit(getClientIp(req), 'LOG_CREATED', `Создана запись журнала: ${log.event}`);
  res.json({ success: true, log });
});

router.put('/logs/:id', requireAdmin, (req, res) => {
  const caseData = getCase();
  const index = caseData.logs.findIndex(l => l.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Лог не найден.' });

  caseData.logs[index] = { ...caseData.logs[index], ...req.body };
  saveCase(caseData);
  res.json({ success: true, log: caseData.logs[index] });
});

router.delete('/logs/:id', requireAdmin, (req, res) => {
  const caseData = getCase();
  caseData.logs = (caseData.logs || []).filter(l => l.id !== req.params.id);
  saveCase(caseData);
  res.json({ success: true });
});

// CRUD: Media
router.post('/media', requireAdmin, (req, res) => {
  const caseData = getCase();
  const media = {
    id: `MEDIA_${Date.now()}`,
    code: req.body.code || 'PHOTO_NEW',
    title: req.body.title || 'Новое изображение',
    time: req.body.time || '00:00:00',
    camera: req.body.camera || 'CAM_01',
    tag: req.body.tag || 'Сектор',
    desc: req.body.desc || '',
    clueLetter: req.body.clueLetter || '',
    svgType: req.body.svgType || 'security_cam',
    customImageUrl: req.body.customImageUrl || ''
  };

  caseData.media = caseData.media || [];
  caseData.media.push(media);
  saveCase(caseData);
  addAudit(getClientIp(req), 'MEDIA_CREATED', `Создан медиафайл ${media.code}`);
  res.json({ success: true, media });
});

router.put('/media/:id', requireAdmin, (req, res) => {
  const caseData = getCase();
  const index = caseData.media.findIndex(m => m.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Медиафайл не найден.' });

  caseData.media[index] = { ...caseData.media[index], ...req.body };
  saveCase(caseData);
  res.json({ success: true, media: caseData.media[index] });
});

router.delete('/media/:id', requireAdmin, (req, res) => {
  const caseData = getCase();
  caseData.media = (caseData.media || []).filter(m => m.id !== req.params.id);
  saveCase(caseData);
  res.json({ success: true });
});

router.put('/media', requireAdmin, (req, res) => {
  const caseData = getCase();
  if (Array.isArray(req.body.media)) {
    caseData.media = req.body.media;
    saveCase(caseData);
    addAudit(getClientIp(req), 'MEDIA_UPDATED', 'Обновлен список медиафайлов/скриншотов');
  }
  res.json({ success: true, media: caseData.media });
});

// CRUD: Evidence
router.post('/evidence', requireAdmin, (req, res) => {
  const caseData = getCase();
  const ev = {
    id: `EVID_${Date.now()}`,
    number: String(req.body.number || ((caseData.evidence?.length || 0) + 1)).padStart(2, '0'),
    title: req.body.title || 'Новая улика',
    type: req.body.type || 'Вещдок',
    time: req.body.time || '00:00',
    source: req.body.source || 'Архив',
    description: req.body.description || '',
    linkedLetter: req.body.linkedLetter || '',
    position: Number(req.body.position) || 1,
    truthBulletName: req.body.truthBulletName || 'ПУЛЯ ПРАВДЫ'
  };

  caseData.evidence = caseData.evidence || [];
  caseData.evidence.push(ev);
  saveCase(caseData);
  addAudit(getClientIp(req), 'EVIDENCE_CREATED', `Создана улика ${ev.title}`);
  res.json({ success: true, evidence: ev });
});

router.put('/evidence/:id', requireAdmin, (req, res) => {
  const caseData = getCase();
  const index = caseData.evidence.findIndex(e => e.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Улика не найдена.' });

  caseData.evidence[index] = { ...caseData.evidence[index], ...req.body };
  saveCase(caseData);
  res.json({ success: true, evidence: caseData.evidence[index] });
});

router.delete('/evidence/:id', requireAdmin, (req, res) => {
  const caseData = getCase();
  caseData.evidence = (caseData.evidence || []).filter(e => e.id !== req.params.id);
  saveCase(caseData);
  res.json({ success: true });
});

// Hints management
router.put('/hints', requireAdmin, (req, res) => {
  const caseData = getCase();
  if (Array.isArray(req.body.hints)) {
    caseData.hints = req.body.hints;
    saveCase(caseData);
    addAudit(getClientIp(req), 'HINTS_UPDATED', 'Обновлена конфигурация подсказок.');
  }
  res.json({ success: true, hints: caseData.hints });
});

// Suspects management
router.put('/suspects', requireAdmin, (req, res) => {
  const caseData = getCase();
  if (Array.isArray(req.body.suspects)) {
    caseData.suspects = req.body.suspects;
    saveCase(caseData);
  }
  res.json({ success: true, suspects: caseData.suspects });
});

// IP Locks Management
router.get('/locks', requireAdmin, (req, res) => {
  const locks = getLocks();
  const now = Date.now();
  const list = Object.entries(locks).map(([ip, info]) => ({
    ip,
    reason: info.reason,
    attempts: info.attempts,
    lockedAt: info.lockedAt,
    lockedUntil: info.lockedUntil,
    remainingSeconds: Math.max(0, Math.ceil((info.lockedUntil - now) / 1000))
  }));
  res.json({ success: true, locks: list });
});

router.post('/locks/unlock', requireAdmin, (req, res) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP адрес не указан.' });
  const result = unlockIp(ip);
  res.json({ success: result, message: `IP ${ip} успешно разблокирован.` });
});

router.post('/locks/clear-all', requireAdmin, (req, res) => {
  clearAllLocks();
  res.json({ success: true, message: 'Все блокировки IP адресов очищены.' });
});

// Reset Game Session (Ready for New Class / New Game)
router.post('/reset-session', requireAdmin, (req, res) => {
  const ip = getClientIp(req);
  try {
    // 1. Clear all player sessions in memory
    clearAllSessions();

    // 2. Clear all active IP locks
    clearAllLocks();

    // 3. Clear issued verdict certificates in memory
    clearIssuedCertificates();

    // 4. Reset case status to active investigation
    const caseData = getCase();
    caseData.status = 'РАССЛЕДОВАНИЕ (INVESTIGATION)';
    saveCase(caseData);

    // 5. Audit
    addAudit(ip, 'RESET_SESSION', 'Полный сброс сессии расследования и блокировок куратором.');

    return res.json({
      success: true,
      message: 'СЕССИЯ РАССЛЕДОВАНИЯ СБРОШЕНА. ТЕРМИНАЛ ГОТОВ К НОВОЙ ИГРЕ.'
    });
  } catch (err) {
    console.error('Reset session error:', err);
    return res.status(500).json({ success: false, error: 'Ошибка сброса сессии.' });
  }
});

// Upload Screenshot from Garry's Mod (Evidence Board)
router.post('/upload-screenshot', requireAdmin, (req, res) => {
  const ip = getClientIp(req);
  const { title, time, desc, tag, camera, imageBase64, filename: origFilename } = req.body || {};

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ success: false, error: 'Файл изображения (imageBase64) обязателен.' });
  }

  try {
    // Extract base64 payload & format extension
    let base64Data = imageBase64;
    let extension = 'png';

    const matches = imageBase64.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (matches) {
      extension = matches[1].replace('jpeg', 'jpg');
      base64Data = matches[2];
    } else if (origFilename && origFilename.includes('.')) {
      extension = origFilename.split('.').pop().toLowerCase();
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `gmod_evidence_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${extension}`;
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(uploadsDir, filename), buffer);

    const caseData = getCase();
    caseData.media = caseData.media || [];

    const newMedia = {
      id: `MEDIA_${Date.now()}`,
      code: `GMOD_CAM_${Date.now().toString().slice(-4)}`,
      title: (title || 'Скриншот с места преступления').trim(),
      time: (time || '21:40').trim(),
      camera: (camera || 'GMOD_RECORD').trim(),
      tag: (tag || 'Улика с места преступления').trim(),
      desc: (desc || '').trim(),
      customImageUrl: `/uploads/${filename}`,
      svgType: 'custom_image'
    };

    caseData.media.unshift(newMedia);
    saveCase(caseData);
    addAudit(ip, 'SCREENSHOT_UPLOADED', `Загружен скриншот [${newMedia.title}] -> /uploads/${filename}`);

    return res.json({
      success: true,
      message: 'Скриншот успешно загружен и добавлен в материалы дела.',
      media: newMedia
    });
  } catch (err) {
    console.error('Screenshot upload error:', err);
    return res.status(500).json({ success: false, error: 'Не удалось сохранить изображение.' });
  }
});

// Audit Log
router.get('/audit', requireAdmin, (req, res) => {
  const audit = getAudit();
  res.json({ success: true, audit });
});

export default router;
