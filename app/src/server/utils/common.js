import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

// ============================================================
// Security: JWT Secret (REQUIRED — no fallback)
// ============================================================
if (!process.env.JWT_SECRET) {
  console.error('[Security] ❌ FATAL ERROR: JWT_SECRET di .env belum diatur.');
  console.error('[Security] Sistem tidak bisa berjalan tanpa JWT_SECRET persisten.');
  process.exit(1);
}
export const JWT_SECRET = process.env.JWT_SECRET;

// ============================================================
// Security: Password Hashing Helpers (SHA-256 + salt)
// ============================================================
if (!process.env.PASSWORD_SALT) {
  console.error('[Security] ❌ FATAL ERROR: PASSWORD_SALT di .env belum diatur.');
  process.exit(1);
}
const PASSWORD_SALT = process.env.PASSWORD_SALT;

export function hashPassword(plainText) {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(plainText, salt);
}

export function verifyPassword(plainText, hashedValue) {
  // Bcrypt hashes usually start with $2a$, $2b$, or $2y$ and are 60 chars
  if (hashedValue.startsWith('$2a$') || hashedValue.startsWith('$2b$') || hashedValue.startsWith('$2y$')) {
    return bcrypt.compareSync(plainText, hashedValue);
  }

  // Backward compatibility: SHA-256 (64 hex)
  if (hashedValue.length === 64 && /^[a-f0-9]+$/.test(hashedValue)) {
    const legacyHash = crypto.createHash('sha256').update(PASSWORD_SALT + plainText).digest('hex');
    return legacyHash === hashedValue;
  }
  
  // Backward compatibility: Plaintext fallback
  return plainText === hashedValue;
}

// ============================================================
// Security: CORS Origin Whitelist
// ============================================================
export function getAllowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return '*';
  if (/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.[\d.]+|10\.[\d.]+)(:\d+)?$/.test(origin)) {
    return origin;
  }
  return 'null';
}

// ============================================================
// Security: Rate Limiter (login brute-force protection)
// ============================================================
const loginAttempts = new Map();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 5 * 60 * 1000;

export function isRateLimited(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry) return false;
  if (now - entry.lastAttempt > RATE_LIMIT_WINDOW) {
    loginAttempts.delete(ip);
    return false;
  }
  return entry.count >= RATE_LIMIT_MAX;
}

export function recordLoginAttempt(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now - entry.lastAttempt > RATE_LIMIT_WINDOW) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
  } else {
    entry.count++;
    entry.lastAttempt = now;
  }
}

export function resetLoginAttempts(ip) {
  loginAttempts.delete(ip);
}

// ============================================================
// Server Middleware Helpers
// ============================================================
export function createJsonSender(req, res) {
    return (statusCode, data) => {
        res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin(req));
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = statusCode;
        res.end(JSON.stringify(data));
    };
}

export function handleCorsIfPreflight(req, res, pathPrefix, methods = 'GET, POST, OPTIONS') {
    if (req.url?.startsWith(pathPrefix) && req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin(req));
        res.setHeader('Access-Control-Allow-Methods', methods);
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.statusCode = 200;
        res.end();
        return true;
    }
    return false;
}
