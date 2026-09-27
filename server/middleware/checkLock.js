import { getClientIp } from '../utils/ip.js';
import { isIpLocked } from '../storage.js';

export function checkLockMiddleware(req, res, next) {
  const ip = getClientIp(req);
  req.clientIp = ip;

  const lockStatus = isIpLocked(ip);
  if (lockStatus.locked) {
    return res.status(423).json({
      locked: true,
      remainingSeconds: lockStatus.remainingSeconds,
      lockedUntil: lockStatus.lockedUntil,
      reason: lockStatus.reason,
      attempts: lockStatus.attempts,
      ip,
      error: 'ACCESS DENIED. Система временно ограничила дальнейшие попытки.'
    });
  }

  next();
}
