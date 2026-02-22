import crypto from 'crypto';

const SECRET = process.env.JWT_SECRET || 'tetris-family-secret-change-in-production';
const TOKEN_TTL_SEC = 60 * 60 * 24 * 30; // 30 days

export function signToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC;
  const data = { ...payload, exp };
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const part1 = b64(header) + '.' + b64(data);
  const sig = crypto.createHmac('sha256', SECRET).update(part1).digest('base64url');
  return part1 + '.' + sig;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    const part1 = parts[0] + '.' + parts[1];
    const expected = crypto.createHmac('sha256', SECRET).update(part1).digest('base64url');
    if (parts[2] !== expected) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getBearerFromRequest(req) {
  const auth = req.headers?.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return req.cookies?.token || null;
}
