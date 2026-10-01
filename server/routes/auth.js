import express from 'express';
import { getCase, addAudit } from '../storage.js';
import { createSessionToken, getSession, updateSessionState, clearSession } from '../utils/session.js';
import { getClientIp } from '../utils/ip.js';

const router = express.Router();

router.post('/login', (req, res) => {
  const ip = getClientIp(req);
  const { code, playerName } = req.body;

  if (!code || typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ success: false, error: 'Код доступа обязателен.' });
  }

  const cleanName = (typeof playerName === 'string' ? playerName.trim() : '').slice(0, 50);
  if (!cleanName) {
    return res.status(400).json({
      success: false,
      error: 'Укажите ваше имя для текущей судебной сессии.'
    });
  }

  const caseData = getCase();
  const targetCode = String(caseData.accessCode || '28042004333').trim();
  const inputCode = code.trim();

  if (inputCode === targetCode) {
    let sessionId = req.headers['x-session-id'] || req.cookies?.shinri_session;
    let session = getSession(sessionId);

    if (!session) {
      sessionId = createSessionToken('AUTHENTICATED', ip, cleanName);
    } else {
      delete session.labV2; delete session.archiveVersion; session.archiveProgress = []; session.archiveVerdict = null;
      session.playerName = cleanName;
      updateSessionState(sessionId, 'AUTHENTICATED');
    }

    res.cookie('shinri_session', sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    addAudit(ip, 'AUTH_SUCCESS', `Вход в систему: студент "${cleanName}" успешно авторизован.`, cleanName);
    return res.json({
      success: true,
      sessionId,
      playerName: cleanName,
      state: 'AUTHENTICATED',
      message: 'КЛЮЧ ПРИНЯТ.'
    });
  }

  addAudit(ip, 'AUTH_FAILED', `Неудачная попытка входа: код "${inputCode.substring(0, 15)}" (имя: "${cleanName}")`, cleanName);
  return res.status(401).json({
    success: false,
    error: 'ОШИБКА ДОСТУПА. КЛЮЧ НЕ РАСПОЗНАН СИСТЕМОЙ.'
  });
});

router.post('/logout', (req, res) => {
  clearSession(req.cookies?.shinri_session || req.headers['x-session-id']);
  res.clearCookie('shinri_session');
  res.json({ success: true, state: 'NEW' });
});

export default router;
