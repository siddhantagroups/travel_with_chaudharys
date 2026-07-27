import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

// All env reads are lazy (inside functions) so this module never depends on
// import ordering relative to dotenv.config().

const TOKEN_TTL = '8h';

const getJwtSecret = () => process.env.JWT_SECRET || 'dev-insecure-secret-change-me';

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

// Constant-time password comparison to avoid leaking length/content via timing.
const passwordMatches = (input) => {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected || typeof input !== 'string') return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Compare something equal-length so we still spend ~constant time, then fail.
    crypto.timingSafeEqual(b, b);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
};

const issueToken = (payload) =>
  jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_TTL });

// Express middleware: require a valid admin session token.
export const requireAdmin = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required.' });
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session invalid or expired. Please sign in again.' });
  }
};

const router = Router();

// Tells the frontend which sign-in methods are available (and the public Google client id).
router.get('/config', (req, res) => {
  const clientId = getGoogleClientId();
  res.json({
    google: !!clientId,
    googleClientId: clientId || null,
    password: !!(process.env.ADMIN_PASSWORD || ''),
  });
});

// Password login.
router.post('/login', (req, res) => {
  const { password } = req.body || {};
  if (!passwordMatches(password)) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }
  const user = { email: 'admin', name: 'Administrator', method: 'password' };
  const token = issueToken({ email: user.email, name: user.name, role: 'admin', method: 'password' });
  res.json({ token, user });
});

// Google Sign-In: verify the ID token, then check the email against the allowlist.
router.post('/google', async (req, res) => {
  const client = getGoogleClient();
  if (!client) {
    return res.status(503).json({ error: 'Google sign-in is not configured on the server.' });
  }
  const { credential } = req.body || {};
  if (!credential) return res.status(400).json({ error: 'Missing Google credential.' });

  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: getGoogleClientId() });
    const payload = ticket.getPayload();
    const email = (payload.email || '').toLowerCase();

    if (!payload.email_verified) {
      return res.status(403).json({ error: 'Your Google email is not verified.' });
    }
    if (!getAdminEmails().includes(email)) {
      return res.status(403).json({ error: 'This Google account is not authorized for admin access.' });
    }

    const user = { email, name: payload.name, picture: payload.picture, method: 'google' };
    const token = issueToken({ email, name: payload.name, role: 'admin', method: 'google' });
    res.json({ token, user });
  } catch (err) {
    console.error('Google token verification failed:', err.message);
    res.status(401).json({ error: 'Google sign-in failed. Please try again.' });
  }
});

// Session restore: returns the current admin if the token is still valid.
router.get('/me', requireAdmin, (req, res) => {
  res.json({
    user: { email: req.admin.email, name: req.admin.name, method: req.admin.method, role: req.admin.role },
  });
});

export default router;
