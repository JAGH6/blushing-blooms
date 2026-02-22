import { getSupabase } from '../../lib/db.js';
import { json } from '../../lib/res.js';

/**
 * Daily SMS: send today's winner and leaderboard to family phones.
 * Call with Authorization: Bearer <CRON_SECRET> or x-cron-secret header.
 * Env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, CRON_SECRET, FAMILY_PHONES (comma-separated) or use family_phones table.
 */

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ':' + String(s).padStart(2, '0');
}

async function getFamilyPhones(sb) {
  const fromEnv = process.env.FAMILY_PHONES;
  if (fromEnv && typeof fromEnv === 'string') {
    return fromEnv.split(',').map((p) => p.trim()).filter(Boolean);
  }
  const { data: rows } = await sb.from('family_phones').select('phone');
  return (rows || []).map((r) => r.phone).filter(Boolean);
}

async function sendSms(to, body) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !from) throw new Error('Twilio not configured');
  const auth = Buffer.from(accountSid + ':' + authToken).toString('base64');
  const toNum = to.replace(/\D/g, '');
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + auth,
      },
      body: new URLSearchParams({
        To: toNum.startsWith('+') ? toNum : '+' + toNum,
        From: from,
        Body: body,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || res.statusText);
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'POST' && req.method !== 'GET') return json(res, { error: 'Method not allowed' }, 405);

  const secret = process.env.CRON_SECRET;
  const auth = req.headers?.authorization || req.headers?.['x-cron-secret'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  if (secret && token !== secret) return json(res, { error: 'Unauthorized' }, 401);

  const sb = getSupabase();
  if (!sb) return json(res, { error: 'Database not configured' }, 503);

  const date = todayUtc();
  const { data: rows } = await sb
    .from('daily_scores')
    .select('score, completion_time_seconds, level_reached, players(display_name)')
    .eq('date', date)
    .order('score', { ascending: false })
    .order('completion_time_seconds', { ascending: true });

  const phones = await getFamilyPhones(sb);
  if (phones.length === 0) return json(res, { ok: true, message: 'No family phones configured' });

  let body = 'Tetris Daily Winner: ';
  if (!rows || rows.length === 0) {
    body += 'No scores today yet.';
  } else {
    const winner = rows[0];
    const name = winner.players?.display_name || 'Player';
    body += name + ' with ' + winner.score + ' points.';
    body += ' Today\'s leaderboard: ';
    body += rows.slice(0, 10).map((r, i) => (i + 1) + '. ' + (r.players?.display_name || 'Player') + ' ' + r.score + ' (' + formatTime(r.completion_time_seconds) + ')').join('; ');
  }

  if (body.length > 1600) body = body.slice(0, 1597) + '...';

  for (const phone of phones) {
    try {
      await sendSms(phone, body);
    } catch (err) {
      console.error('SMS failed for', phone, err);
      return json(res, { error: 'SMS send failed: ' + err.message }, 500);
    }
  }

  return json(res, { ok: true, sentTo: phones.length });
}
