import express from 'express';
import { getCase, addAudit } from '../storage.js';
import { createSessionToken, getSession, updateSessionState } from '../utils/session.js';
import { getClientIp } from '../utils/ip.js';

const router = express.Router();

router.post('/login', (req, res) => {
  const ip = getClientIp(req);
  const { code } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ success: false, error: 'Код доступа обязателен.' });
  }

  const caseData = getCase();
  const targetCode = String(caseData.accessCode || '28042004333').trim();
  const inputCode = code.trim();

  if (inputCode === targetCode) {
    let sessionId = req.headers['x-session-id'] || req.cookies?.shinri_session;
    let session = getSession(sessionId);

    if (!session) {
      sessionId = createSessionToken('AUTHENTICATED', ip);
    } else {
      updateSessionState(sessionId, 'AUTHENTICATED');
    }

    res.cookie('shinri_session', sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    addAudit(ip, 'AUTH_SUCCESS', 'Успешная авторизация по коду доступа.');
    return res.json({
      success: true,
      sessionId,
      state: 'AUTHENTICATED',
      message: 'КЛЮЧ ПРИНЯТ.'
    });
  }

  addAudit(ip, 'AUTH_FAILED', `Неудачная попытка входа: "${inputCode.substring(0, 15)}"`);
  return res.status(401).json({
    success: false,
    error: 'ОШИБКА ДОСТУПА. КЛЮЧ НЕ РАСПОЗНАН СИСТЕМОЙ.'
  });
});

router.post('/logout', (req, res) => {
  res.clearCookie('shinri_session');
  res.json({ success: true, state: 'NEW' });
});

export default router;
