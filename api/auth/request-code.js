import { getSupabase } from '../../lib/db.js';
import { sendCode } from '../../lib/send-code.js';
import { json, corsPreflight } from '../../lib/res.js';

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return corsPreflight(res);
  if (req.method !== 'POST') return json(res, { error: 'Method not allowed' }, 405);

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    return json(res, { error: 'Invalid JSON' }, 400);
  }

  const email = body.email?.trim();
  if (!email || !email.includes('@')) {
    return json(res, { error: 'Provide a valid email address' }, 400);
  }

  const sb = getSupabase();
  if (!sb) return json(res, { error: 'Database not configured' }, 503);

  const code = randomCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: insertErr } = await sb.from('auth_codes').insert({
    email_or_phone: email,
    code,
    expires_at: expiresAt,
  });
  if (insertErr) return json(res, { error: 'Failed to store code' }, 500);

  try {
    await sendCode(email, code);
  } catch (err) {
    return json(res, { error: err.message || 'Failed to send code' }, 500);
  }

  return json(res, { ok: true });
}
