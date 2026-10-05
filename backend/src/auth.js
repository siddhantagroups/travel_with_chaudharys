import { Router } from 'express';
import crypto from 'crypto';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { securityLog } from './security.js';

/*
  Admin authentication.

  - The session is a signed JWT kept in an httpOnly, SameSite=Strict cookie,
    scoped to /api. Page scripts can't read it, so an XSS bug can't steal it,
    and other sites can't make the browser send it.
  - Every state-changing admin request must also carry the X-Requested-With
    header and (when the browser sends one) a same-site Origin — a CSRF check
    on top of SameSite.
  - The password can be stored hashed (ADMIN_PASSWORD_HASH, scrypt) instead of
    in plain text; `npm run hash-password` makes the hash.
  - Optional second factor: set ADMIN_TOTP_SECRET (`npm run setup-mfa`) and
    password sign-in also asks for the 6-digit code from an authenticator app.
  - Sign-out revokes the session on the server, not just in the browser.

  All env reads are lazy (inside functions) so this module never depends on
  import ordering relative to dotenv.config().
*/

const SESSION_HOURS = 8;
const COOKIE = 'twc_session';
const isProd = () => process.env.NODE_ENV === 'production' || process.env.USE_MOCK_DB === 'false';

// ---------------------------------------------------------------------------
// Signing secret. Never falls back to a known constant: a missing or weak
// JWT_SECRET gets a random per-process secret instead (sessions then end on
// every restart, which is safe), and the log says so.
// ---------------------------------------------------------------------------
let generatedSecret = null;
const getJwtSecret = () => {
  const s = process.env.JWT_SECRET || '';
  if (s.length >= 32 && s !== 'replace-with-a-long-random-string') return s;
  if (!generatedSecret) {
    generatedSecret = crypto.randomBytes(48).toString('base64url');
    if (isProd()) {
      console.error('SECURITY: JWT_SECRET is missing or shorter than 32 characters. Using a random secret for this run — admin sessions will end on every restart. Set a long JWT_SECRET in backend/.env.');
    }
  }
  return generatedSecret;
};

const getAdminEmails = () =>
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

const getGoogleClientId = () => (process.env.GOOGLE_CLIENT_ID || '').trim();

let _googleClient = null;
let _googleClientForId = null;
const getGoogleClient = () => {
  const id = getGoogleClientId();
  if (!id) return null;
  if (!_googleClient || _googleClientForId !== id) {
    _googleClient = new OAuth2Client(id);
    _googleClientForId = id;
  }
  return _googleClient;
};

// ---------------------------------------------------------------------------
// Password. ADMIN_PASSWORD_HASH (scrypt) wins when set; the plain
// ADMIN_PASSWORD is the fallback for servers not yet migrated.
//   Hash format: scrypt$N$r$p$<salt base64>$<key base64>
// ---------------------------------------------------------------------------
const scrypt = promisify(crypto.scrypt);

export const hashPassword = async (password) => {
  const N = 16384, r = 8, p = 1;
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 64, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${key.toString('base64')}`;
};

const verifyHash = async (password, stored) => {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, N, r, p, saltB64, keyB64] = parts;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(N), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024,
  });
  return crypto.timingSafeEqual(key, expected);
};

const passwordConfigured = () => !!((process.env.ADMIN_PASSWORD_HASH || '').trim() || process.env.ADMIN_PASSWORD);

const passwordMatches = async (input) => {
  if (typeof input !== 'string' || !input || input.length > 200) return false;
  const hash = (process.env.ADMIN_PASSWORD_HASH || '').trim();
  if (hash) {
    try { return await verifyHash(input, hash); } catch { return false; }
  }
  // Plain-text fallback, compared in constant time.
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) return false;
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
};

// Strong-password rule, used by the hash script and the startup check.
export const passwordProblems = (pw) => {
  const problems = [];
  if (pw.length < 12) problems.push('at least 12 characters');
  if (!/[a-z]/.test(pw)) problems.push('a lowercase letter');
  if (!/[A-Z]/.test(pw)) problems.push('an uppercase letter');
  if (!/[0-9]/.test(pw)) problems.push('a number');
  if (!/[^A-Za-z0-9]/.test(pw)) problems.push('a symbol');
  if (/changeme|password|admin|chaudhar/i.test(pw)) problems.push('no common words (password, admin, changeme, the business name)');
  return problems;
};

// ---------------------------------------------------------------------------
// TOTP (RFC 6238) — 6 digits, 30-second steps, SHA-1, as every authenticator
// app expects. Accepts one step either side for clock drift; a code can only
// be used once.
// ---------------------------------------------------------------------------
const base32Decode = (input) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    value = (value << 5) | alphabet.indexOf(ch);
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return Buffer.from(out);
};

const totpAt = (key, counter) => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', key).update(buf).digest();
  const o = h[h.length - 1] & 0xf;
  const code = ((h.readUInt32BE(o) & 0x7fffffff) % 1000000).toString().padStart(6, '0');
  return code;
};

const getTotpSecret = () => (process.env.ADMIN_TOTP_SECRET || '').trim();
let lastTotpCounter = -1;
const totpMatches = (code) => {
  const secret = getTotpSecret();
  if (!secret) return true;
  if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) return false;
  const key = base32Decode(secret);
  const now = Math.floor(Date.now() / 30000);
  for (const c of [now - 1, now, now + 1]) {
    if (c <= lastTotpCounter) continue; // already used
    const a = Buffer.from(totpAt(key, c));
    if (crypto.timingSafeEqual(a, Buffer.from(code.trim()))) {
      lastTotpCounter = c;
      return true;
    }
  }
  return false;
};

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------
const revoked = new Map(); // jti -> expiry (ms); signed-out sessions until they expire

const readCookie = (req, name) => {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) {
      try { return decodeURIComponent(part.slice(i + 1).trim()); } catch { return null; }
    }
  }
  return null;
};

const cookieOptions = (req) => ({
  httpOnly: true,
  sameSite: 'strict',
  // Secure whenever the visitor reached us over HTTPS (Nginx must pass
  // X-Forwarded-Proto). COOKIE_SECURE=true forces it.
  secure: process.env.COOKIE_SECURE === 'true' || req.secure,
  path: '/api',
});

// A fresh session id on every sign-in (session rotation).
const startSession = (req, res, claims) => {
  const token = jwt.sign({ ...claims, role: 'admin' }, getJwtSecret(), {
    algorithm: 'HS256',
    expiresIn: `${SESSION_HOURS}h`,
    jwtid: crypto.randomUUID(),
    issuer: 'twc-admin',
  });
  res.cookie(COOKIE, token, { ...cookieOptions(req), maxAge: SESSION_HOURS * 3600 * 1000 });
};

const readSession = (req) => {
  const token = readCookie(req, COOKIE);
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'], issuer: 'twc-admin' });
    if (decoded.role !== 'admin' || revoked.has(decoded.jti)) return null;
    return decoded;
  } catch {
    return null;
  }
};

// Optional read for public endpoints that show more to a signed-in admin.
export const readAdmin = (req) => readSession(req);

// CSRF: state-changing requests must come from our own pages.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const allowedOrigins = () => (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
const hostOf = (url) => { try { return new URL(url).host; } catch { return ''; } };
const csrfOk = (req) => {
  if (SAFE_METHODS.has(req.method)) return true;
  // Other sites can't add this header without a CORS preflight we never approve.
  if (req.get('x-requested-with') !== 'XMLHttpRequest') return false;
  const origin = req.get('origin');
  if (!origin) return true; // same-origin requests may omit it
  if (allowedOrigins().includes(origin)) return true;
  const reqHost = req.get('x-forwarded-host') || req.get('host') || '';
  // Behind a proxy that didn't pass the visitor's Host, we only see our own
  // loopback address and can't compare; the header check above and the
  // SameSite cookie still stand. (deploy/nginx-security.conf passes Host.)
  const proxiedWithoutHost = req.get('x-forwarded-for') && /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(reqHost);
  if (proxiedWithoutHost) return true;
  return hostOf(origin) === reqHost;
};

// Express middleware: require a valid admin session.
export const requireAdmin = (req, res, next) => {
  const session = readSession(req);
  if (!session) {
    securityLog('auth_denied', req, { reason: readCookie(req, COOKIE) ? 'invalid_or_expired' : 'no_session' });
    return res.status(401).json({ error: 'Session invalid or expired. Please sign in again.' });
  }
  if (!csrfOk(req)) {
    securityLog('csrf_blocked', req, { origin: req.get('origin') || null });
    return res.status(403).json({ error: 'Request blocked.' });
  }
  req.admin = session;
  next();
};

// Logged once at start-up: what still needs hardening (never the values).
export const reportAuthConfig = () => {
  if (!isProd()) return;
  const warn = (m) => console.warn(`SECURITY: ${m}`);
  if (!(process.env.ADMIN_PASSWORD_HASH || '').trim() && process.env.ADMIN_PASSWORD) {
    warn('the admin password is stored in plain text. Run `npm run hash-password`, put the result in ADMIN_PASSWORD_HASH and delete ADMIN_PASSWORD.');
    const problems = passwordProblems(process.env.ADMIN_PASSWORD);
    if (problems.length) warn(`the admin password is weak — it needs ${problems.join(', ')}.`);
  }
  if (!getTotpSecret()) warn('two-factor sign-in is off. Run `npm run setup-mfa` to turn it on.');
  getJwtSecret();
};

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
const router = Router();
const failDelay = () => new Promise((r) => setTimeout(r, 400 + Math.random() * 300));

// Which sign-in methods exist (and the public Google client id).
router.get('/config', (req, res) => {
  const clientId = getGoogleClientId();
  res.json({
    google: !!clientId,
    googleClientId: clientId || null,
    password: passwordConfigured(),
    mfa: !!getTotpSecret(),
  });
});

// Password sign-in (plus the 6-digit code when two-factor is on).
router.post('/login', async (req, res) => {
  const { password, code } = req.body || {};
  const ok = (await passwordMatches(password)) && totpMatches(typeof code === 'string' ? code : '');
  if (!ok) {
    securityLog('login_failed', req, { method: 'password' });
    await failDelay();
    return res.status(401).json({
      error: getTotpSecret() ? 'Incorrect password or code.' : 'Incorrect password.',
    });
  }
  const user = { email: 'admin', name: 'Administrator', method: 'password' };
  startSession(req, res, { email: user.email, name: user.name, method: 'password' });
  securityLog('login_success', req, { method: 'password' });
  res.json({ user });
});

// Google Sign-In: verify the ID token, then check the email against the allowlist.
router.post('/google', async (req, res) => {
  const client = getGoogleClient();
  if (!client) return res.status(503).json({ error: 'Google sign-in is not configured on the server.' });
  const { credential } = req.body || {};
  if (typeof credential !== 'string' || !credential) return res.status(400).json({ error: 'Missing Google credential.' });

  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: getGoogleClientId() });
    const payload = ticket.getPayload();
    const email = (payload.email || '').toLowerCase();

    if (!payload.email_verified || !getAdminEmails().includes(email)) {
      securityLog('login_failed', req, { method: 'google', reason: payload.email_verified ? 'not_allowed' : 'unverified' });
      return res.status(403).json({ error: 'This Google account is not authorized for admin access.' });
    }

    const user = { email, name: payload.name, picture: payload.picture, method: 'google' };
    startSession(req, res, { email, name: payload.name, method: 'google' });
    securityLog('login_success', req, { method: 'google' });
    res.json({ user });
  } catch (err) {
    securityLog('login_failed', req, { method: 'google', reason: 'bad_token' });
    res.status(401).json({ error: 'Google sign-in failed. Please try again.' });
  }
});

// Session restore: the signed-in admin, or null. Always 200 so the public
// site can ask without it counting as a failed sign-in.
router.get('/me', (req, res) => {
  const s = readSession(req);
  res.json({ user: s ? { email: s.email, name: s.name, method: s.method, role: s.role } : null });
});

// Sign out: end the session on the server and clear the cookie.
router.post('/logout', (req, res) => {
  const s = readSession(req);
  if (s && csrfOk(req)) {
    revoked.set(s.jti, s.exp * 1000);
    const now = Date.now();
    for (const [jti, exp] of revoked) if (exp < now) revoked.delete(jti);
  }
  res.clearCookie(COOKIE, cookieOptions(req));
  res.json({ ok: true });
});

export default router;
