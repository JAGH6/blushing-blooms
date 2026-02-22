import { getSupabase } from '../../lib/db.js';
import { signToken } from '../../lib/auth.js';
import { json, corsPreflight } from '../../lib/res.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return corsPreflight(res);
  if (req.method !== 'POST') return json(res, { error: 'Method not allowed' }, 405);

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    return json(res, { error: 'Invalid JSON' }, 400);
  }

  const email = (body.email || '').trim();
  const code = String(body.code || '').trim();
  const displayName = String(body.display_name || body.displayName || 'Player').trim().slice(0, 50) || 'Player';

  if (!email || !email.includes('@') || !code) {
    return json(res, { error: 'Provide email and code' }, 400);
  }

  const sb = getSupabase();
  if (!sb) return json(res, { error: 'Database not configured' }, 503);

  const { data: rows, error: fetchErr } = await sb
    .from('auth_codes')
    .select('id')
    .eq('email_or_phone', email)
    .eq('code', code)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  if (fetchErr || !rows?.length) {
    return json(res, { error: 'Invalid or expired code' }, 401);
  }

  let player;
  const { data: existing } = await sb.from('players').select('id, display_name').eq('email', email).single();
    if (existing) {
    player = existing;
    await sb.from('players').update({ display_name: displayName }).eq('id', existing.id);
    player.display_name = displayName;
  } else {
    const { data: inserted, error: insErr } = await sb.from('players').insert({
      email,
      display_name: displayName,
    }).select('id, display_name').single();
    if (insErr) return json(res, { error: 'Failed to create player' }, 500);
    player = inserted;
  }

  await sb.from('auth_codes').delete().eq('email_or_phone', email);

  const token = signToken({ playerId: player.id });
  return json(res, { token, player: { id: player.id, display_name: player.display_name } });
}
