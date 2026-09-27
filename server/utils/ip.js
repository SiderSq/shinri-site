import net from 'net';

/**
 * Safely extracts client IP address preventing arbitrary header spoofing
 * when not running behind a configured reverse proxy.
 */
export function getClientIp(req, trustProxy = process.env.TRUST_PROXY === 'true') {
  // 1. If Cloudflare header is present and we trust proxy or in prod
  if (trustProxy && req.headers['cf-connecting-ip']) {
    const cfIp = String(req.headers['cf-connecting-ip']).trim();
    if (net.isIP(cfIp)) return normalizeIp(cfIp);
  }

  // 2. Standard X-Forwarded-For if trustProxy is enabled
  if (trustProxy && req.headers['x-forwarded-for']) {
    const rawXff = String(req.headers['x-forwarded-for']);
    // Take the client IP (first item), but validate it is a syntactically valid IP address
    const ips = rawXff.split(',').map(s => s.trim());
    for (const candidate of ips) {
      if (net.isIP(candidate)) {
        return normalizeIp(candidate);
      }
    }
  }

  // 3. X-Real-IP if trustProxy is enabled
  if (trustProxy && req.headers['x-real-ip']) {
    const realIp = String(req.headers['x-real-ip']).trim();
    if (net.isIP(realIp)) return normalizeIp(realIp);
  }

  // 4. Direct socket address (always secure against header spoofing)
  const sockIp = req.socket?.remoteAddress || req.connection?.remoteAddress || '127.0.0.1';
  return normalizeIp(sockIp);
}

export function normalizeIp(rawIp) {
  if (!rawIp) return '127.0.0.1';
  let ip = String(rawIp).trim();
  // Strip IPv4-mapped IPv6 address (::ffff:192.168.1.1 -> 192.168.1.1)
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  // Loopback normalization
  if (ip === '::1' || ip === '::') {
    ip = '127.0.0.1';
  }
  return ip;
}
