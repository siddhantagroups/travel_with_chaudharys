import mongoose from 'mongoose';

/*
  Shared security helpers: the security-event log, safe error responses, and
  the small validators every write endpoint runs its input through.
*/

// ---------------------------------------------------------------------------
// Security event log. One JSON line per event on stderr, so pm2 keeps it in
// the error log where it is easy to grep ("sec":"login_failed"). Never pass a
// password, token, cookie or request body in `details`.
// ---------------------------------------------------------------------------
export const securityLog = (event, req, details = {}) => {
  const line = {
    ts: new Date().toISOString(),
    sec: event,
    ip: req?.ip,
    method: req?.method,
    path: req?.originalUrl ? req.originalUrl.split('?')[0] : undefined,
    ...details,
  };
  console.warn(JSON.stringify(line));
};

// ---------------------------------------------------------------------------
// Errors. Internal details (stack traces, Mongoose cast messages, index names)
// stay in the server log; the client gets a short, safe message.
// ---------------------------------------------------------------------------
const DUPLICATE_MESSAGES = {
  plateNumber: 'A vehicle with that plate number already exists.',
  name: 'A client with that name already exists.',
};

export const sendError = (res, err) => {
  if (err?.name === 'ValidationError') {
    const msg = Object.values(err.errors || {}).map((e) => e.message).join(' ');
    return res.status(400).json({ error: msg || 'Some details are not valid.' });
  }
  if (err?.name === 'CastError') {
    return res.status(404).json({ error: 'Not found.' });
  }
  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue || err.keyPattern || {})[0];
    return res.status(409).json({ error: DUPLICATE_MESSAGES[field] || 'That already exists.' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
};

// ---------------------------------------------------------------------------
// Validators. Each returns { value } or { error }. Input is never trusted to be
// the right type — a JSON body can carry objects, arrays or numbers anywhere.
// ---------------------------------------------------------------------------
export const text = (v, { label, max = 200, required = false } = {}) => {
  if (v === undefined || v === null || v === '') {
    return required ? { error: `${label} is required.` } : { value: '' };
  }
  if (typeof v !== 'string' && typeof v !== 'number') return { error: `${label} is not valid.` };
  const s = String(v).trim();
  if (required && !s) return { error: `${label} is required.` };
  if (s.length > max) return { error: `${label} is too long (max ${max} characters).` };
  return { value: s };
};

export const integer = (v, { label, min, max, required = false } = {}) => {
  if (v === undefined || v === null || v === '') {
    return required ? { error: `${label} is required.` } : { value: undefined };
  }
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) return { error: `${label} must be a whole number from ${min} to ${max}.` };
  return { value: n };
};

export const number = (v, { label, min, max, required = false } = {}) => {
  if (v === undefined || v === null || v === '') {
    return required ? { error: `${label} is required.` } : { value: undefined };
  }
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) return { error: `${label} must be between ${min} and ${max}.` };
  return { value: n };
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const email = (v, { label = 'Email', required = false } = {}) => {
  const t = text(v, { label, max: 120, required });
  if (t.error || !t.value) return t;
  return EMAIL.test(t.value) ? { value: t.value.toLowerCase() } : { error: `${label} is not a valid email address.` };
};

const PHONE = /^[0-9+()\-\s]{6,20}$/;
export const phone = (v, { label = 'Phone', required = false } = {}) => {
  const t = text(v, { label, max: 20, required });
  if (t.error || !t.value) return t;
  return PHONE.test(t.value) ? t : { error: `${label} is not a valid phone number.` };
};

export const oneOf = (v, allowed, { label } = {}) =>
  allowed.includes(v) ? { value: v } : { error: `${label} is not valid.` };

export const isObjectId = (v) => typeof v === 'string' && mongoose.isValidObjectId(v);

// Runs a set of checks; returns { values } or the first { error }.
export const collect = (checks) => {
  const values = {};
  for (const [key, result] of Object.entries(checks)) {
    if (result.error) return { error: result.error };
    values[key] = result.value;
  }
  return { values };
};
