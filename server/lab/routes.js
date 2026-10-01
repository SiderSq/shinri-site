import express from 'express';
import { getCase, isIpLocked, addAudit } from '../storage.js';
import { getSession } from '../utils/session.js';
import { getClientIp } from '../utils/ip.js';
import { GAME_IDS, ensureLab, publicLab, makeChallenge, evaluateChallenge, rewardLetter } from './engine.js';
const router = express.Router();
router.use((req, res, next) => {
  const lock = isIpLocked(getClientIp(req));
  if (lock.locked) return res.status(423).json({ error: 'Терминал временно заблокирован.', remainingSeconds: lock.remainingSeconds });
  const session = getSession(req.headers['x-session-id'] || req.cookies?.shinri_session);
  if (!session || !['RECOVERED', 'SOLVED'].includes(session.state)) return res.status(403).json({ error: 'Сначала войдите и восстановите архив.' });
  if (getCase().archiveRound) return res.status(410).json({ error: 'Этот приборный путь не используется в архивном сценарии.' });
  req.labSession = session; next();
});
router.get('/workstation', (req, res) => res.json({ success: true, ...publicLab(req.labSession, getCase()) }));
router.post('/submit-analysis', (req, res) => {
  const { gameId, stage, version, proof } = req.body || {};
  if (!GAME_IDS.includes(gameId) || !Number.isInteger(stage)) return res.status(400).json({ success: false, message: 'Неизвестный анализ.' });
  const caseData = getCase(); const lab = ensureLab(req.labSession, caseData);
  if (lab.nonce !== version || stage !== lab.progress[gameId] || stage > 2) return res.status(409).json({ success: false, message: 'Этап изменился. Обновите состояние лаборатории.' });
  const now = Date.now(); lab.attempts = lab.attempts.filter(t => now - t < 60000);
  if (now - lab.lastSubmit < 800 || lab.attempts.length >= 12) {
    const retryAfter = Math.max(1, Math.ceil((lab.attempts.length >= 12 ? lab.attempts[0] + 60000 - now : 800 - (now - lab.lastSubmit)) / 1000));
    res.set('Retry-After', String(retryAfter)); return res.status(429).json({ success: false, message: `Подождите ${retryAfter} с перед следующей проверкой.`, retryAfter });
  }
  lab.lastSubmit = now;
  const result = evaluateChallenge(makeChallenge(gameId, stage, lab.nonce), proof);
  if (!result.success) { lab.attempts.push(now); return res.status(422).json(result); }
  lab.progress[gameId]++;
  if (lab.progress[gameId] === 3) {
    lab.letters[gameId] = rewardLetter(gameId, caseData.killer);
    addAudit(getClientIp(req), 'LAB_ANALYSIS_CONFIRMED', `Подтверждён анализ ${gameId}.`, req.labSession.playerName);
  }
  return res.json({ ...result, ...publicLab(req.labSession, caseData), completedGame: lab.progress[gameId] === 3 ? gameId : null });
});
// The historical ID-only reward contract is explicitly retired.
router.post('/solve-minigame', (_req, res) => res.status(410).json({ success: false, error: 'Награда выдаётся только после проверки трёх этапов анализа.' }));
export default router;
